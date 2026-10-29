# ============================================================
# app/routes/auth.py - Autenticación, sesiones, MFA y administración
# ============================================================
# Arquitectura de sesión:
#   - access token corto (15 min) en memoria del frontend (Bearer).
#   - refresh token opaco en cookie HttpOnly, rotativo y con detección de reuso.
#   - token_version en User para revocar todo al cambiar/resetear contraseña o banear.
#   - CSRF double-submit para los endpoints que usan la cookie de refresh.
from __future__ import annotations

import base64
import hashlib
import hmac
import io
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlparse

import bcrypt
import jwt
import pyotp
import qrcode
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from app.audit import client_ip, log_audit
from app.email import send_reset_password_email, send_verification_email
from app.models import AuditLog, BannedEmail, RefreshSession, User
from app.schemas import UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

# El secreto JWT es obligatorio: si falta o es el valor de ejemplo, la app no
# debe arrancar (de lo contrario cualquiera podría firmar tokens válidos).
SECRET_KEY = os.getenv("JWT_SECRET", "")
if not SECRET_KEY or SECRET_KEY in ("change-me-in-production", "changeme") or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "JWT_SECRET no configurado o inseguro. Definí una clave aleatoria de al menos "
        "32 caracteres (ej: openssl rand -hex 32)."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
REFRESH_TOKEN_REMEMBER_DAYS = int(os.getenv("REFRESH_TOKEN_REMEMBER_DAYS", "30"))
MFA_TOKEN_MINUTES = 5
VERIFICATION_TOKEN_TTL = timedelta(hours=24)
RESET_TOKEN_TTL = timedelta(hours=1)
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # límite de bcrypt

REFRESH_COOKIE_NAME = "mood_refresh"
CSRF_COOKIE_NAME = "mood_csrf"
REFRESH_COOKIE_PATH = "/api/auth"
CSRF_COOKIE_PATH = "/"
COOKIE_SECURE_ENV = os.getenv("COOKIE_SECURE", "").strip().lower()

# Hash de relleno para que un email inexistente tarde lo mismo que uno real.
# Se calcula una sola vez al arrancar.
DUMMY_HASH = bcrypt.hashpw(b"mood-timing-dummy-password", bcrypt.gensalt(rounds=12)).decode("utf-8")

GENERIC_REGISTER_MESSAGE = {
    "message": "Si el correo es válido, vas a recibir un email para verificar la cuenta"
}


# ─── Utilidades de tokens ─────────────────────────────────────────
def _hash_token(token: str) -> str:
    """SHA-256 para guardar tokens opacos en Mongo (nunca en claro)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _hash_recovery(code: str) -> str:
    return _hash_token(code.strip().replace(" ", "").upper())


def _user_version(user: User) -> int:
    return int(user.token_version or 0)


def _jwt_decode_kwargs() -> dict:
    kwargs: dict = {}
    if os.getenv("JWT_AUDIENCE"):
        kwargs["audience"] = os.getenv("JWT_AUDIENCE")
    if os.getenv("JWT_ISSUER"):
        kwargs["issuer"] = os.getenv("JWT_ISSUER")
    return kwargs


def _jwt_encode(payload: dict) -> str:
    if os.getenv("JWT_AUDIENCE"):
        payload["aud"] = os.getenv("JWT_AUDIENCE")
    if os.getenv("JWT_ISSUER"):
        payload["iss"] = os.getenv("JWT_ISSUER")
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict, remember: bool = False):
    """Access token corto. `remember` se mantiene por compatibilidad de firma;
    solo afecta la duración del refresh, no la del access token."""
    now = datetime.utcnow()
    payload = data.copy()
    payload.update(
        {
            "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
            "iat": now,
            "jti": secrets.token_urlsafe(12),
            "typ": "access",
        }
    )
    return _jwt_encode(payload)


def create_mfa_token(user: User, remember: bool = False) -> str:
    now = datetime.utcnow()
    return _jwt_encode(
        {
            "sub": user.uid,
            "ver": _user_version(user),
            "typ": "mfa",
            "remember": bool(remember),
            "exp": now + timedelta(minutes=MFA_TOKEN_MINUTES),
            "iat": now,
            "jti": secrets.token_urlsafe(12),
        }
    )


def _decode_token(token: str, expected_type: str = "access") -> dict:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], **_jwt_decode_kwargs())
    if payload.get("typ") != expected_type:
        raise jwt.InvalidTokenError("Tipo de token inválido")
    return payload


# ─── Passwords ────────────────────────────────────────────────────
def _legacy_sha256(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _is_bcrypt_hash(hashed: str) -> bool:
    return hashed.startswith(("$2a$", "$2b$", "$2y$"))


def hash_password(password: str) -> str:
    """Hashea con bcrypt (salt aleatorio + costo 12)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verifica bcrypt y, por compatibilidad, hashes SHA-256 antiguos."""
    if not hashed:
        return False
    if _is_bcrypt_hash(hashed):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False
    return hmac.compare_digest(_legacy_sha256(password), hashed)


def validate_password(password: str) -> None:
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña debe tener al menos {PASSWORD_MIN_LENGTH} caracteres",
        )
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña es demasiado larga (máximo {PASSWORD_MAX_BYTES} bytes)",
        )


def _token_expired(expires_at: Optional[datetime]) -> bool:
    return expires_at is None or datetime.utcnow() > expires_at


async def is_email_banned(email: str) -> bool:
    banned = await BannedEmail.find_one(BannedEmail.email == email.strip().lower())
    return banned is not None


# ─── Cookies y CSRF ──────────────────────────────────────────────
def _cookie_secure(request: Request) -> bool:
    if COOKIE_SECURE_ENV in ("1", "true", "yes", "on"):
        return True
    if COOKIE_SECURE_ENV in ("0", "false", "no", "off"):
        return False
    proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip().lower()
    if not proto:
        proto = request.url.scheme
    return proto == "https"


def _allowed_origins() -> set[str]:
    origins = set()
    frontend = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend:
        origins.add(frontend)
    raw = os.getenv("CORS_ORIGINS", "")
    origins.update(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    origins.update(
        {
            "http://localhost",
            "http://127.0.0.1",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    )
    return origins


def _validate_origin(request: Request) -> None:
    """Bloquea peticiones de navegador con Origin/Referer ajeno.
    Los clientes sin Origin (curl, health checks) no se ven afectados."""
    origin = (request.headers.get("origin") or "").strip().rstrip("/")
    if not origin:
        referer = request.headers.get("referer")
        if referer:
            parsed = urlparse(referer)
            if parsed.scheme and parsed.netloc:
                origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin and origin not in _allowed_origins():
        raise HTTPException(status_code=403, detail="Origen no permitido")


def _validate_csrf(request: Request) -> None:
    _validate_origin(request)
    cookie = request.cookies.get(CSRF_COOKIE_NAME)
    header = request.headers.get("x-csrf-token")
    if not cookie or not header or not hmac.compare_digest(cookie, header):
        raise HTTPException(status_code=403, detail="CSRF token inválido o ausente")


def _set_session_cookies(
    response: Response,
    request: Request,
    session: RefreshSession,
    secret: str,
    remember: bool,
) -> None:
    max_age = (REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_DAYS) * 24 * 60 * 60
    secure = _cookie_secure(request)
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        f"{session.session_id}.{secret}",
        max_age=max_age,
        httponly=True,
        secure=secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )
    # El frontend lee esta cookie (no HttpOnly) y la manda en X-CSRF-Token.
    response.set_cookie(
        CSRF_COOKIE_NAME,
        secrets.token_urlsafe(32),
        max_age=max_age,
        httponly=False,
        secure=secure,
        samesite="lax",
        path=CSRF_COOKIE_PATH,
    )


def _clear_session_cookies(response: Response, request: Request) -> None:
    secure = _cookie_secure(request)
    response.delete_cookie(
        REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        secure=secure,
        httponly=True,
        samesite="lax",
    )
    response.delete_cookie(
        CSRF_COOKIE_NAME,
        path=CSRF_COOKIE_PATH,
        secure=secure,
        httponly=False,
        samesite="lax",
    )


# ─── Sesiones refrescables ───────────────────────────────────────
async def _new_refresh_session(
    user: User, request: Request, remember: bool
) -> tuple[RefreshSession, str]:
    now = datetime.utcnow()
    days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_DAYS
    secret = secrets.token_urlsafe(32)
    session = await RefreshSession(
        session_id=uuid.uuid4().hex,
        uid=user.uid,
        secret_hash=_hash_token(secret),
        created_at=now,
        last_used_at=now,
        expires_at=now + timedelta(days=days),
        user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        ip=client_ip(request),
        token_version=_user_version(user),
        remember=remember,
    ).create()
    return session, secret


async def _issue_session(
    response: Response, request: Request, user: User, remember: bool
) -> str:
    session, secret = await _new_refresh_session(user, request, remember)
    _set_session_cookies(response, request, session, secret, remember)
    return create_access_token(
        {"sub": user.uid, "email": user.email, "ver": _user_version(user)}
    )


async def _revoke_session(session: RefreshSession) -> None:
    if not session.revoked:
        session.revoked = True
        session.last_used_at = datetime.utcnow()
        await session.save()


async def _revoke_user_sessions(uid: str) -> None:
    sessions = await RefreshSession.find(
        RefreshSession.uid == uid, RefreshSession.revoked == False  # noqa: E712
    ).to_list()
    for session in sessions:
        session.revoked = True
        session.last_used_at = datetime.utcnow()
        await session.save()


async def _bump_token_version(user: User) -> None:
    user.token_version = _user_version(user) + 1
    await user.save()


async def _revoke_all_for_user(user: User) -> None:
    await _revoke_user_sessions(user.uid)
    await _bump_token_version(user)


async def _session_from_cookie(
    request: Request,
) -> tuple[Optional[RefreshSession], Optional[str]]:
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw or "." not in raw:
        return None, None
    session_id, secret = raw.split(".", 1)
    if not session_id or not secret:
        return None, None
    session = await RefreshSession.find_one(RefreshSession.session_id == session_id)
    if not session:
        return None, None
    # Devolvemos también sesiones revocadas/expiradas para poder detectar
    # reuso de refresh tokens y auditar el intento.
    return session, secret


# ─── Dependencia de autenticación ────────────────────────────────
async def get_current_user(
    request: Request, authorization: Optional[str] = Header(None)
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization[len("Bearer ") :].strip()
        payload = _decode_token(token, "access")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await User.find_one(User.uid == user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        if payload.get("ver") != _user_version(user):
            raise HTTPException(status_code=401, detail="Sesión inválida. Iniciá sesión de nuevo.")
        if user.banned:
            raise HTTPException(status_code=403, detail="Esta cuenta fue baneada.")
        # Para la auditoría de mutaciones (middleware en main.py).
        request.state.actor_uid = user.uid
        request.state.actor_email = user.email
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─── Modelos de entrada ─────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=1, max_length=1024)
    display_name: Optional[str] = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: str = Field(max_length=320)
    password: str = Field(min_length=1, max_length=1024)
    remember_me: bool = False


class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=1, max_length=8192)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(max_length=320)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)
    password: str = Field(min_length=1, max_length=1024)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=1024)
    new_password: str = Field(min_length=1, max_length=1024)


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = Field(default=None, max_length=120)
    photo_url: Optional[str] = Field(default=None, max_length=2048)
    email_notifications: Optional[bool] = None


class UpdateRoleRequest(BaseModel):
    role: str = Field(max_length=20)


class UnbanRequest(BaseModel):
    email: str = Field(max_length=320)


class MfaCodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    password: Optional[str] = Field(default=None, max_length=1024)


class MfaDisableRequest(BaseModel):
    password: str = Field(max_length=1024)
    code: str = Field(min_length=1, max_length=32)


class MfaVerifyRequest(BaseModel):
    mfa_token: str = Field(min_length=1, max_length=8192)
    code: str = Field(min_length=1, max_length=32)


# ─── Registro / login / Google ───────────────────────────────────
@router.post("/register")
async def register(data: RegisterRequest, request: Request):
    email_norm = data.email.strip().lower()
    if "@" not in email_norm or len(email_norm) > 320:
        raise HTTPException(status_code=400, detail="Email inválido")
    validate_password(data.password)

    # Respuesta genérica: no revelamos si el email ya existe o está baneado.
    existing = await User.find_one(User.email == email_norm)
    if existing or await is_email_banned(email_norm):
        await log_audit(
            "register_duplicate_or_banned",
            request=request,
            actor_email=email_norm,
            success=False,
        )
        return GENERIC_REGISTER_MESSAGE

    verification_token = secrets.token_urlsafe(32)
    new_user = await User(
        uid=str(uuid.uuid4()),
        email=email_norm,
        display_name=(data.display_name or "").strip() or email_norm.split("@")[0],
        role="user",
        password_hash=hash_password(data.password),
        verification_token=_hash_token(verification_token),
        verification_token_expires_at=datetime.utcnow() + VERIFICATION_TOKEN_TTL,
        created_at=datetime.utcnow(),
    ).create()

    try:
        await run_in_threadpool(
            send_verification_email, new_user.email, verification_token
        )
    except Exception:
        logger.exception("No se pudo enviar el email de verificación")

    await log_audit(
        "register",
        request=request,
        actor_uid=new_user.uid,
        actor_email=new_user.email,
        target=new_user.uid,
    )
    return GENERIC_REGISTER_MESSAGE


@router.post("/login")
async def login(data: LoginRequest, request: Request, response: Response):
    _validate_origin(request)
    email_norm = data.email.strip().lower()

    if await is_email_banned(email_norm):
        # Mismo costo que un usuario real, sin revelar que el email está baneado.
        verify_password(data.password, DUMMY_HASH)
        await log_audit(
            "login_failed",
            request=request,
            actor_email=email_norm,
            success=False,
            metadata={"reason": "banned"},
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    user = await User.find_one(User.email == email_norm)
    if not user:
        verify_password(data.password, DUMMY_HASH)
        await log_audit(
            "login_failed",
            request=request,
            actor_email=email_norm,
            success=False,
            metadata={"reason": "not_found"},
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Las cuentas creadas solo con Google no tienen contraseña: nunca deben
    # poder iniciar sesión con el hash de relleno.
    if not user.password_hash:
        verify_password(data.password, DUMMY_HASH)
        await log_audit(
            "login_failed",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            success=False,
            metadata={"reason": "no_password"},
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if not verify_password(data.password, user.password_hash):
        await log_audit(
            "login_failed",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            success=False,
            metadata={"reason": "bad_password"},
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    if user.banned:
        await log_audit(
            "login_failed",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            success=False,
            metadata={"reason": "banned"},
        )
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    # Migración transparente: si el hash es SHA-256 antiguo, lo reemplazamos por bcrypt.
    if user.password_hash and not _is_bcrypt_hash(user.password_hash):
        try:
            user.password_hash = hash_password(data.password)
            await user.save()
        except ValueError:
            logger.warning("No se pudo migrar un hash legacy: contraseña fuera del límite de bcrypt")

    if user.email_verified == "0":
        await log_audit(
            "login_blocked_unverified",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            success=False,
        )
        raise HTTPException(
            status_code=403,
            detail="Verificá tu email primero. Revisá tu bandeja de entrada (incluyendo correo no deseado).",
        )

    if user.mfa_enabled:
        await log_audit(
            "login_mfa_required",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            metadata={"mfa": True},
        )
        return {
            "mfa_required": True,
            "mfa_token": create_mfa_token(user, data.remember_me),
        }

    access_token = await _issue_session(response, request, user, data.remember_me)
    user.last_login_at = datetime.utcnow()
    await user.save()
    await log_audit(
        "login_success",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
        metadata={"remember": data.remember_me},
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google")
async def google_auth(data: GoogleAuthRequest, request: Request, response: Response):
    _validate_origin(request)

    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token

    try:
        info = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID"),
            clock_skew_in_seconds=30,
        )
    except Exception as e:
        logger.warning("Google token verification failed")
        raise HTTPException(status_code=401, detail="Token de Google inválido") from e

    google_id = info.get("sub")
    email = info.get("email")
    display_name = info.get("name", "")
    photo_url = info.get("picture", "")

    if not email:
        raise HTTPException(status_code=400, detail="Google no proporcionó un correo electrónico")
    if info.get("email_verified") is False:
        raise HTTPException(status_code=400, detail="El correo de Google no está verificado")
    email = email.strip().lower()

    user = await User.find_one(User.google_id == google_id)
    if not user:
        user = await User.find_one(User.email == email)

    if user:
        if user.banned or await is_email_banned(email):
            await log_audit(
                "google_login_failed",
                request=request,
                actor_uid=user.uid,
                actor_email=email,
                success=False,
                metadata={"reason": "banned"},
            )
            raise HTTPException(status_code=401, detail="No se pudo iniciar sesión")
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = "google"
            # Si la cuenta local nunca se verificó, Google acaba de probar la
            # titularidad del email. Eliminamos la contraseña local para cerrar
            # el vector de pre-hijacking (alguien registró el email ajeno antes).
            if user.email_verified != "1":
                user.password_hash = None
                user.reset_token = None
                user.reset_token_expires_at = None
                user.verification_token = None
                user.verification_token_expires_at = None
            user.email_verified = "1"
            if photo_url:
                user.photo_url = photo_url
            await user.save()
    else:
        if await is_email_banned(email):
            await log_audit(
                "google_login_failed",
                request=request,
                actor_email=email,
                success=False,
                metadata={"reason": "banned_email"},
            )
            raise HTTPException(status_code=401, detail="No se pudo iniciar sesión")
        user = await User(
            uid=str(uuid.uuid4()),
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            role="user",
            auth_provider="google",
            google_id=google_id,
            email_verified="1",
            created_at=datetime.utcnow(),
        ).create()

    if user.mfa_enabled:
        await log_audit(
            "google_login_mfa_required",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
        )
        return {"mfa_required": True, "mfa_token": create_mfa_token(user)}

    access_token = await _issue_session(response, request, user, False)
    user.last_login_at = datetime.utcnow()
    await user.save()
    await log_audit(
        "google_login_success",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─── Refresh / logout ────────────────────────────────────────────
REFRESH_RACE_GRACE_SECONDS = 15


async def _is_recent_rotation(session: RefreshSession, now: datetime) -> bool:
    """Distingue una carrera entre pestañas de un reuso malicioso."""
    return (
        not session.revoked
        and session.last_used_at is not None
        and (now - session.last_used_at).total_seconds() < REFRESH_RACE_GRACE_SECONDS
    )


@router.post("/refresh")
async def refresh_session(request: Request, response: Response):
    _validate_csrf(request)
    session, secret = await _session_from_cookie(request)
    if not session or not secret:
        _clear_session_cookies(response, request)
        raise HTTPException(status_code=401, detail="Sesión expirada")

    now = datetime.utcnow()
    if _token_expired(session.expires_at):
        await _revoke_session(session)
        _clear_session_cookies(response, request)
        raise HTTPException(status_code=401, detail="Sesión expirada")

    presented_hash = _hash_token(secret)
    if session.revoked or not hmac.compare_digest(session.secret_hash, presented_hash):
        fresh = await RefreshSession.find_one(
            RefreshSession.session_id == session.session_id
        )
        if fresh and await _is_recent_rotation(fresh, now):
            # Otra pestaña roto el token hace instantes: no borramos la cookie
            # compartida para no cerrar la sesión de la pestaña ganadora.
            await log_audit(
                "refresh_race",
                request=request,
                actor_uid=session.uid,
                target=session.session_id,
                success=False,
            )
            raise HTTPException(status_code=401, detail="Sesión inválida")
        if fresh:
            await _revoke_session(fresh)
        await log_audit(
            "refresh_replay_detected",
            request=request,
            actor_uid=session.uid,
            target=session.session_id,
            success=False,
        )
        _clear_session_cookies(response, request)
        raise HTTPException(status_code=401, detail="Sesión inválida")

    user = await User.find_one(User.uid == session.uid)
    if not user or user.banned or _user_version(user) != session.token_version:
        await _revoke_session(session)
        _clear_session_cookies(response, request)
        raise HTTPException(status_code=401, detail="Sesión inválida")

    new_secret = secrets.token_urlsafe(32)
    # Rotación atómica: solo una petición puede canjear este secreto.
    result = await RefreshSession.get_pymongo_collection().update_one(
        {
            "session_id": session.session_id,
            "secret_hash": presented_hash,
            "revoked": False,
        },
        {
            "$set": {
                "secret_hash": _hash_token(new_secret),
                "last_used_at": now,
            }
        },
    )
    if result.modified_count != 1:
        fresh = await RefreshSession.find_one(
            RefreshSession.session_id == session.session_id
        )
        if fresh and await _is_recent_rotation(fresh, now):
            await log_audit(
                "refresh_race",
                request=request,
                actor_uid=session.uid,
                target=session.session_id,
                success=False,
            )
            raise HTTPException(status_code=401, detail="Sesión inválida")
        if fresh:
            await _revoke_session(fresh)
        await log_audit(
            "refresh_replay_detected",
            request=request,
            actor_uid=session.uid,
            target=session.session_id,
            success=False,
        )
        _clear_session_cookies(response, request)
        raise HTTPException(status_code=401, detail="Sesión inválida")

    _set_session_cookies(
        response, request, session, new_secret, remember=session.remember
    )
    await log_audit(
        "refresh_success",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
        target=session.session_id,
    )
    return {
        "access_token": create_access_token(
            {"sub": user.uid, "email": user.email, "ver": _user_version(user)}
        ),
        "token_type": "bearer",
    }


@router.post("/logout")
async def logout(request: Request, response: Response):
    _validate_csrf(request)
    session, _secret = await _session_from_cookie(request)
    if session:
        await _revoke_session(session)
        await log_audit(
            "logout",
            request=request,
            actor_uid=session.uid,
            target=session.session_id,
        )
    _clear_session_cookies(response, request)
    return {"message": "Sesión cerrada"}


@router.post("/logout-all")
async def logout_all(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    await _revoke_all_for_user(current_user)
    _clear_session_cookies(response, request)
    await log_audit(
        "logout_all",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {"message": "Se cerraron todas las sesiones"}


# ─── Perfil / contraseña ─────────────────────────────────────────
def _user_response(user: User) -> UserResponse:
    """Serializa solo campos publicos y si la cuenta tiene contrasena local."""
    return UserResponse(
        uid=user.uid,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        photo_url=user.photo_url,
        created_at=user.created_at,
        favorites=user.favorites or [],
        email_notifications=user.email_notifications,
        email_verified=user.email_verified,
        auth_provider=user.auth_provider,
        mfa_enabled=bool(user.mfa_enabled),
        has_password=bool(user.password_hash),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest, current_user: User = Depends(get_current_user)
):
    """Actualiza el perfil del usuario autenticado (nombre y/o foto)."""
    if data.display_name is not None:
        name = data.display_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="El nombre no puede estar vacío")
        current_user.display_name = name
    if data.photo_url is not None:
        current_user.photo_url = data.photo_url.strip() or None
    if data.email_notifications is not None:
        current_user.email_notifications = data.email_notifications
    await current_user.save()
    return _user_response(current_user)


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    """Cambia la contraseña y revoca todas las sesiones existentes."""
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Este usuario no tiene contraseña configurada (usá Google)",
        )
    if not verify_password(data.current_password, current_user.password_hash):
        await log_audit(
            "change_password_failed",
            request=request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=False,
        )
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    validate_password(data.new_password)
    current_user.password_hash = hash_password(data.new_password)
    await _revoke_all_for_user(current_user)
    _clear_session_cookies(response, request)
    await log_audit(
        "change_password",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {"message": "Contraseña actualizada. Iniciá sesión de nuevo."}


@router.post("/send-verification")
async def send_verification(
    request: Request, current_user: User = Depends(get_current_user)
):
    token = secrets.token_urlsafe(32)
    current_user.verification_token = _hash_token(token)
    current_user.verification_token_expires_at = datetime.utcnow() + VERIFICATION_TOKEN_TTL
    await current_user.save()
    try:
        await run_in_threadpool(send_verification_email, current_user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al enviar el email")
    await log_audit(
        "send_verification",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {"message": "Email de verificación enviado"}


@router.post("/resend-verification")
async def resend_verification(
    request: Request, email: str = Query(min_length=3, max_length=320)
):
    email_norm = email.strip().lower()
    user = await User.find_one(User.email == email_norm)
    generic = {
        "message": "Si el correo existe y no está verificado, recibirás un email de verificación"
    }
    if not user or user.email_verified == "1" or user.banned:
        return generic
    token = secrets.token_urlsafe(32)
    user.verification_token = _hash_token(token)
    user.verification_token_expires_at = datetime.utcnow() + VERIFICATION_TOKEN_TTL
    await user.save()
    try:
        await run_in_threadpool(send_verification_email, user.email, token)
    except Exception:
        logger.exception("No se pudo reenviar el email de verificación")
    await log_audit(
        "resend_verification",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return generic


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=1, max_length=256)


async def _verify_email_token(token: str, request: Request):
    user = await User.find_one(User.verification_token == _hash_token(token))
    if not user or _token_expired(user.verification_token_expires_at):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.email_verified = "1"
    user.verification_token = None
    user.verification_token_expires_at = None
    await user.save()
    await log_audit(
        "verify_email",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return {"message": "Email verificado exitosamente"}


@router.post("/verify-email")
async def verify_email_post(data: VerifyEmailRequest, request: Request):
    """Forma recomendada: el token va en el body, no en la URL."""
    return await _verify_email_token(data.token, request)


@router.get("/verify-email")
async def verify_email(
    request: Request, token: str = Query(min_length=1, max_length=256)
):
    """Compatibilidad con emails viejos que usan ?token=."""
    return await _verify_email_token(token, request)


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, request: Request):
    email_norm = data.email.strip().lower()
    user = await User.find_one(User.email == email_norm)
    generic = {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}
    if not user or user.banned:
        return generic
    token = secrets.token_urlsafe(32)
    user.reset_token = _hash_token(token)
    user.reset_token_expires_at = datetime.utcnow() + RESET_TOKEN_TTL
    await user.save()
    try:
        await run_in_threadpool(send_reset_password_email, user.email, token)
    except Exception:
        logger.exception("No se pudo enviar el email de reset")
    await log_audit(
        "forgot_password",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return generic


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, request: Request):
    validate_password(data.password)
    user = await User.find_one(User.reset_token == _hash_token(data.token))
    if not user or _token_expired(user.reset_token_expires_at):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.password_hash = hash_password(data.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    # Al resetear con un token enviado al email, la titularidad queda probada.
    user.email_verified = "1"
    user.verification_token = None
    user.verification_token_expires_at = None
    await _revoke_all_for_user(user)
    await log_audit(
        "reset_password",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return {"message": "Contraseña actualizada exitosamente"}


# ─── MFA (TOTP) ──────────────────────────────────────────────────
def _verify_mfa_code(user: User, code: str) -> bool:
    normalized = code.strip().replace(" ", "")
    if user.mfa_secret and pyotp.TOTP(user.mfa_secret).verify(normalized, valid_window=1):
        return True
    digest = _hash_recovery(code)
    hashes = list(user.mfa_recovery_hashes or [])
    if digest in hashes:
        hashes.remove(digest)
        user.mfa_recovery_hashes = hashes
        return True
    return False


@router.post("/mfa/setup")
async def mfa_setup(request: Request, current_user: User = Depends(get_current_user)):
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Las cuentas creadas con Google administran la verificacion en dos pasos desde Google",
        )
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA ya está activado")
    secret = pyotp.random_base32()
    current_user.mfa_pending_secret = secret
    await current_user.save()
    otpauth_url = pyotp.TOTP(secret).provisioning_uri(
        name=current_user.email, issuer_name="MOOD"
    )
    img = qrcode.make(otpauth_url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_data_uri = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")
    await log_audit(
        "mfa_setup",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {"secret": secret, "otpauth_url": otpauth_url, "qr_data_uri": qr_data_uri}


@router.post("/mfa/enable")
async def mfa_enable(
    data: MfaCodeRequest, request: Request, current_user: User = Depends(get_current_user)
):
    if current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA ya está activado")
    if not current_user.mfa_pending_secret:
        raise HTTPException(status_code=400, detail="Primero iniciá la configuración de MFA")
    # Confirmar la contraseña evita que un access token robado active MFA y
    # deje afuera al dueño de la cuenta. Las cuentas creadas solo con Google
    # no tienen contraseña local: usan el segundo factor de Google.
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Las cuentas creadas con Google administran la verificacion en dos pasos desde Google",
        )
    if not verify_password(data.password or "", current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    if not pyotp.TOTP(current_user.mfa_pending_secret).verify(
        data.code.strip().replace(" ", ""), valid_window=1
    ):
        await log_audit(
            "mfa_enable_failed",
            request=request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=False,
        )
        raise HTTPException(status_code=400, detail="Código inválido")

    recovery_codes = []
    for _ in range(10):
        raw = secrets.token_hex(4)
        recovery_codes.append(f"{raw[:4]}-{raw[4:]}")
    current_user.mfa_secret = current_user.mfa_pending_secret
    current_user.mfa_pending_secret = None
    current_user.mfa_enabled = True
    current_user.mfa_recovery_hashes = [_hash_recovery(c) for c in recovery_codes]
    await current_user.save()
    await log_audit(
        "mfa_enabled",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {
        "message": "MFA activado. Guardá estos códigos de recuperación.",
        "recovery_codes": recovery_codes,
    }


@router.post("/mfa/disable")
async def mfa_disable(
    data: MfaDisableRequest,
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
):
    if not current_user.mfa_enabled:
        raise HTTPException(status_code=400, detail="MFA no está activado")
    # Para desactivar tambien se exige la contrasena local. Las cuentas
    # creadas solo con Google no pueden llegar a este estado desde la app.
    if not current_user.password_hash:
        raise HTTPException(
            status_code=400,
            detail="Las cuentas creadas con Google administran la verificacion en dos pasos desde Google",
        )
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    if not _verify_mfa_code(current_user, data.code):
        await log_audit(
            "mfa_disable_failed",
            request=request,
            actor_uid=current_user.uid,
            actor_email=current_user.email,
            success=False,
        )
        raise HTTPException(status_code=400, detail="Código inválido")
    current_user.mfa_enabled = False
    current_user.mfa_secret = None
    current_user.mfa_pending_secret = None
    current_user.mfa_recovery_hashes = []
    await _revoke_all_for_user(current_user)
    _clear_session_cookies(response, request)
    await log_audit(
        "mfa_disabled",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
    )
    return {"message": "MFA desactivado. Iniciá sesión de nuevo."}


@router.post("/mfa/verify")
async def mfa_verify(data: MfaVerifyRequest, request: Request, response: Response):
    _validate_origin(request)
    try:
        payload = _decode_token(data.mfa_token, "mfa")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token MFA inválido o expirado")
    user = await User.find_one(User.uid == payload.get("sub"))
    if not user or payload.get("ver") != _user_version(user) or user.banned:
        raise HTTPException(status_code=401, detail="Token MFA inválido o expirado")
    if not user.mfa_enabled or not user.mfa_secret:
        raise HTTPException(status_code=400, detail="MFA no está activado")
    if not _verify_mfa_code(user, data.code):
        await log_audit(
            "mfa_verify_failed",
            request=request,
            actor_uid=user.uid,
            actor_email=user.email,
            success=False,
        )
        raise HTTPException(status_code=401, detail="Código inválido")
    await user.save()
    access_token = await _issue_session(
        response, request, user, bool(payload.get("remember"))
    )
    user.last_login_at = datetime.utcnow()
    await user.save()
    await log_audit(
        "mfa_verify_success",
        request=request,
        actor_uid=user.uid,
        actor_email=user.email,
    )
    return {"access_token": access_token, "token_type": "bearer"}


# ─── Administración de usuarios ─────────────────────────────────
@router.get("/users", response_model=list)
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    users = await User.find_all().sort(-User.created_at).to_list()
    return [
        {
            "uid": u.uid,
            "email": u.email,
            "display_name": u.display_name,
            "role": u.role,
            "photo_url": u.photo_url,
            "created_at": u.created_at,
            "email_verified": u.email_verified,
            "auth_provider": u.auth_provider,
            "google_id": u.google_id,
            "banned": u.banned,
            "banned_at": u.banned_at,
            "mfa_enabled": u.mfa_enabled,
        }
        for u in users
    ]


@router.patch("/users/{uid}/role")
async def update_user_role(
    uid: str,
    data: UpdateRoleRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    if data.role not in ("user", "admin", "moderator"):
        raise HTTPException(status_code=400, detail="Rol inválido. Usá: user, admin, moderator")
    if uid == current_user.uid and data.role != "admin":
        raise HTTPException(
            status_code=400,
            detail="No podés quitarte tu propio rol de administrador",
        )
    user = await User.find_one(User.uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.role = data.role
    await user.save()
    await log_audit(
        "update_user_role",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
        target=uid,
        metadata={"role": data.role},
    )
    return {"message": f"Rol actualizado a {data.role}", "uid": uid, "role": data.role}


@router.delete("/users/{uid}", status_code=204)
async def delete_user(
    uid: str, request: Request, current_user: User = Depends(get_current_user)
):
    """Elimina un usuario definitivamente. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    if current_user.uid == uid:
        raise HTTPException(status_code=400, detail="No podés eliminar tu propia cuenta")
    user = await User.find_one(User.uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await _revoke_user_sessions(uid)
    await user.delete()
    await log_audit(
        "delete_user",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
        target=uid,
        metadata={"email": user.email},
    )
    return Response(status_code=204)


@router.post("/users/{uid}/ban")
async def ban_user(
    uid: str, request: Request, current_user: User = Depends(get_current_user)
):
    """Banea un usuario: no podrá iniciar sesión ni volver a registrarse con su email."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    if current_user.uid == uid:
        raise HTTPException(status_code=400, detail="No podés banearte a vos mismo")
    user = await User.find_one(User.uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    email_norm = user.email.strip().lower()
    existing = await BannedEmail.find_one(BannedEmail.email == email_norm)
    if not existing:
        await BannedEmail(
            email=email_norm,
            display_name=user.display_name,
            banned_at=datetime.utcnow(),
            banned_by=current_user.uid,
        ).create()
    user.banned = True
    user.banned_at = datetime.utcnow()
    await _revoke_all_for_user(user)
    await log_audit(
        "ban_user",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
        target=uid,
        metadata={"email": email_norm},
    )
    return {"message": "Usuario baneado", "uid": uid, "email": user.email}


@router.get("/bans", response_model=list)
async def get_bans(current_user: User = Depends(get_current_user)):
    """Lista los emails baneados. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    bans = await BannedEmail.find_all().sort(-BannedEmail.banned_at).to_list()
    return [
        {
            "email": b.email,
            "display_name": b.display_name,
            "banned_at": b.banned_at,
            "banned_by": b.banned_by,
        }
        for b in bans
    ]


@router.post("/bans/unban")
async def unban_user(
    data: UnbanRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Desbanea un email: vuelve a poder registrarse/iniciar sesión."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    email_norm = data.email.strip().lower()
    banned = await BannedEmail.find_one(BannedEmail.email == email_norm)
    if banned:
        await banned.delete()
    user = await User.find_one(User.email == email_norm)
    if user:
        user.banned = False
        user.banned_at = None
        await _revoke_all_for_user(user)
    await log_audit(
        "unban_user",
        request=request,
        actor_uid=current_user.uid,
        actor_email=current_user.email,
        target=email_norm,
    )
    return {"message": "Email desbaneado", "email": email_norm}


@router.get("/audit")
async def get_audit_log(
    limit: int = 100,
    action: Optional[str] = None,
    actor_uid: Optional[str] = None,
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
):
    """Eventos de auditoría recientes. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    limit = max(1, min(limit, 200))
    conditions = []
    if action:
        conditions.append(AuditLog.action == action)
    if actor_uid:
        conditions.append(AuditLog.actor_uid == actor_uid)
    if since:
        conditions.append(AuditLog.timestamp >= since)
    query = AuditLog.find(*conditions).sort(-AuditLog.timestamp).limit(limit)
    logs = await query.to_list()
    return [
        {
            "timestamp": log.timestamp,
            "action": log.action,
            "actor_uid": log.actor_uid,
            "actor_email": log.actor_email,
            "target": log.target,
            "ip": log.ip,
            "user_agent": log.user_agent,
            "success": log.success,
            "metadata": log.metadata,
        }
        for log in logs
    ]


@router.get("/csrf-token")
async def get_csrf_token():
    """Compatibilidad: token aleatorio. El CSRF real se maneja con la cookie
    mood_csrf emitida en login/refresh."""
    return {"csrf_token": secrets.token_urlsafe(32)}
