"""Tests unitarios de controles de seguridad (sin Mongo ni red)."""

import hashlib
import io
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import jwt
import pytest
from fastapi import HTTPException
from PIL import Image
from starlette.datastructures import UploadFile
from starlette.requests import Request

from app.routes import auth, upload


def make_request(headers=None, cookies=None, method="GET"):
    raw_headers = [(key.lower().encode(), value.encode()) for key, value in (headers or {}).items()]
    if cookies:
        raw_headers.append((b"cookie", cookies.encode()))
    return Request(
        {
            "type": "http",
            "method": method,
            "path": "/",
            "query_string": b"",
            "headers": raw_headers,
            "server": ("testserver", 80),
            "client": ("127.0.0.1", 12345),
            "scheme": "http",
            "root_path": "",
        }
    )


def fake_user(**overrides):
    data = {
        "uid": "uid-test",
        "email": "user@example.com",
        "token_version": 2,
        "banned": False,
        "role": "user",
        "password_hash": None,
        "mfa_enabled": False,
    }
    data.update(overrides)
    return SimpleNamespace(**data)


def stub_user_lookup(monkeypatch, user):
    """Evita Mongo: reemplaza el modelo Beanie por un stub con uid + find_one."""
    monkeypatch.setattr(
        auth,
        "User",
        SimpleNamespace(uid=user.uid, find_one=AsyncMock(return_value=user)),
    )


# ─── Contraseñas ──────────────────────────────────────────────────
def test_bcrypt_hash_and_verify():
    hashed = auth.hash_password("Correct-Horse-123")
    assert auth._is_bcrypt_hash(hashed)
    assert auth.verify_password("Correct-Horse-123", hashed)
    assert not auth.verify_password("incorrecta", hashed)


def test_legacy_sha256_still_verifies_for_migration():
    legacy = hashlib.sha256(b"Legacy-Password-123").hexdigest()
    assert not auth._is_bcrypt_hash(legacy)
    assert auth.verify_password("Legacy-Password-123", legacy)
    assert not auth.verify_password("otra", legacy)


def test_validate_password_rejects_short_and_long():
    with pytest.raises(HTTPException) as short:
        auth.validate_password("corta")
    assert short.value.status_code == 400

    with pytest.raises(HTTPException) as long:
        auth.validate_password("á" * 40)  # 80 bytes en UTF-8 > 72
    assert long.value.status_code == 400

    auth.validate_password("válida-123")  # no debe lanzar


# ─── Tokens ────────────────────────────────────────────────────────
def test_access_token_claims_and_uniqueness():
    first = auth.create_access_token({"sub": "u1", "email": "u@example.com", "ver": 3})
    second = auth.create_access_token({"sub": "u1", "email": "u@example.com", "ver": 3})
    assert first != second  # jti distinto

    payload = jwt.decode(
        first,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
        audience="mood-tests",
        issuer="mood-tests",
    )
    assert payload["typ"] == "access"
    assert payload["ver"] == 3
    assert payload["sub"] == "u1"
    assert payload["jti"]
    assert payload["exp"] > payload["iat"]


def test_mfa_token_has_mfa_type():
    token = auth.create_mfa_token(fake_user())
    payload = jwt.decode(
        token,
        auth.SECRET_KEY,
        algorithms=[auth.ALGORITHM],
        audience="mood-tests",
        issuer="mood-tests",
    )
    assert payload["typ"] == "mfa"


def test_user_response_exposes_has_password():
    user = SimpleNamespace(
        uid="uid-test",
        email="user@example.com",
        display_name=None,
        role="user",
        photo_url=None,
        created_at=None,
        favorites=[],
        email_notifications=True,
        email_verified="1",
        auth_provider="email",
        mfa_enabled=False,
        password_hash="bcrypt-hash",
    )
    response = auth._user_response(user)
    assert response.has_password is True
    assert response.mfa_enabled is False


@pytest.mark.asyncio
async def test_mfa_setup_rejects_passwordless_account():
    # Las cuentas creadas solo con Google no deben poder fijar un TOTP local:
    # un access token robado podria dejarlas fuera de la cuenta.
    with pytest.raises(HTTPException) as exc:
        await auth.mfa_setup(make_request(), fake_user())
    assert exc.value.status_code == 400


def test_expired_token_is_rejected():
    expired = jwt.encode(
        {
            "sub": "u1",
            "typ": "access",
            "exp": datetime.utcnow() - timedelta(minutes=1),
        },
        auth.SECRET_KEY,
        algorithm=auth.ALGORITHM,
    )
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(
            expired,
            auth.SECRET_KEY,
            algorithms=[auth.ALGORITHM],
            audience="mood-tests",
            issuer="mood-tests",
        )


def test_hash_token_is_deterministic_and_not_plaintext():
    token = "token-secreto"
    assert auth._hash_token(token) == auth._hash_token(token)
    assert auth._hash_token(token) != token
    assert len(auth._hash_token(token)) == 64


# ─── get_current_user ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_get_current_user_accepts_valid_access_token(monkeypatch):
    user = fake_user()
    stub_user_lookup(monkeypatch, user)
    token = auth.create_access_token({"sub": user.uid, "email": user.email, "ver": 2})
    request = make_request(headers={"authorization": f"Bearer {token}"})
    assert await auth.get_current_user(request, authorization=f"Bearer {token}") is user
    assert request.state.actor_uid == user.uid


@pytest.mark.asyncio
async def test_get_current_user_rejects_mfa_token(monkeypatch):
    user = fake_user()
    stub_user_lookup(monkeypatch, user)
    token = auth.create_mfa_token(user)
    request = make_request(headers={"authorization": f"Bearer {token}"})
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(request, authorization=f"Bearer {token}")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_rejects_old_token_version(monkeypatch):
    user = fake_user(token_version=2)
    stub_user_lookup(monkeypatch, user)
    token = auth.create_access_token({"sub": user.uid, "email": user.email, "ver": 1})
    request = make_request(headers={"authorization": f"Bearer {token}"})
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(request, authorization=f"Bearer {token}")
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_rejects_banned(monkeypatch):
    user = fake_user(banned=True)
    stub_user_lookup(monkeypatch, user)
    token = auth.create_access_token({"sub": user.uid, "email": user.email, "ver": 2})
    request = make_request(headers={"authorization": f"Bearer {token}"})
    with pytest.raises(HTTPException) as exc:
        await auth.get_current_user(request, authorization=f"Bearer {token}")
    assert exc.value.status_code == 403


# ─── CSRF / Origin ─────────────────────────────────────────────────
def test_csrf_double_submit_valid():
    request = make_request(
        headers={"x-csrf-token": "abc123", "origin": "http://localhost"},
        cookies="mood_csrf=abc123",
        method="POST",
    )
    auth._validate_csrf(request)  # no lanza


def test_csrf_missing_or_mismatched():
    missing = make_request(headers={"origin": "http://localhost"}, method="POST")
    with pytest.raises(HTTPException) as exc:
        auth._validate_csrf(missing)
    assert exc.value.status_code == 403

    mismatch = make_request(
        headers={"x-csrf-token": "otro", "origin": "http://localhost"},
        cookies="mood_csrf=abc123",
        method="POST",
    )
    with pytest.raises(HTTPException) as exc:
        auth._validate_csrf(mismatch)
    assert exc.value.status_code == 403


def test_origin_rejects_foreign():
    request = make_request(headers={"origin": "https://evil.example"}, method="POST")
    with pytest.raises(HTTPException) as exc:
        auth._validate_origin(request)
    assert exc.value.status_code == 403


# ─── Uploads ───────────────────────────────────────────────────────
def _png_bytes():
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4), (10, 20, 30)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_validate_image_accepts_real_png():
    assert upload._validate_image(_png_bytes()) == "PNG"


def test_validate_image_rejects_non_image():
    with pytest.raises(HTTPException) as exc:
        upload._validate_image(b"no soy una imagen")
    assert exc.value.status_code == 400


def test_compress_image_outputs_webp():
    compressed = upload.compress_image(_png_bytes())
    with Image.open(io.BytesIO(compressed)) as image:
        assert image.format == "WEBP"


@pytest.mark.asyncio
async def test_read_limited_rejects_oversize():
    file = UploadFile(filename="x.png", file=io.BytesIO(b"x" * 64))
    with pytest.raises(HTTPException) as exc:
        await upload._read_limited(file, limit=32)
    assert exc.value.status_code == 413


@pytest.mark.asyncio
async def test_read_limited_rejects_empty():
    file = UploadFile(filename="x.png", file=io.BytesIO(b""))
    with pytest.raises(HTTPException) as exc:
        await upload._read_limited(file, limit=32)
    assert exc.value.status_code == 400
