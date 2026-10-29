from fastapi import APIRouter, Depends, HTTPException, Header, Response
from app.models import User, BannedEmail
from app.schemas import UserResponse
from app.email import send_verification_email, send_reset_password_email
from datetime import datetime, timedelta
import jwt
import hashlib
import hmac
import os
import secrets
import logging
import bcrypt
from pydantic import BaseModel
from typing import Optional

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
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
VERIFICATION_TOKEN_TTL = timedelta(hours=24)
RESET_TOKEN_TTL = timedelta(hours=1)
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # límite de bcrypt


async def is_email_banned(email: str) -> bool:
    banned = await BannedEmail.find_one(BannedEmail.email == email.strip().lower())
    return banned is not None


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str


class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class GoogleAuthRequest(BaseModel):
    credential: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


@router.post("/google")
async def google_auth(data: GoogleAuthRequest):
    from google.oauth2 import id_token
    from google.auth.transport import requests

    try:
        info = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID"),
            clock_skew_in_seconds=30
        )
    except Exception as e:
        logger.error(f"Google token verification failed: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail="Token de Google inválido")

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
            raise HTTPException(status_code=403, detail="Esta cuenta fue baneada. Contactate con soporte.")
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = "google"
            if photo_url:
                user.photo_url = photo_url
            await user.save()
    else:
        if await is_email_banned(email):
            raise HTTPException(status_code=403, detail="Esta cuenta fue baneada. No podés volver a registrarte con este email.")
        import uuid
        user = await User(
            uid=str(uuid.uuid4()),
            email=email,
            display_name=display_name,
            photo_url=photo_url,
            role="user",
            auth_provider="google",
            google_id=google_id,
            email_verified="1",
            created_at=datetime.utcnow()
        ).create()

    access_token = create_access_token({"sub": user.uid, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


def create_access_token(data: dict, remember: bool = False):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES if not remember else ACCESS_TOKEN_EXPIRE_MINUTES * 30)
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


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
    # Compatibilidad con cuentas creadas antes de migrar a bcrypt.
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


async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization[len("Bearer "):].strip()
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await User.find_one(User.uid == user_id)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        if user.banned:
            raise HTTPException(status_code=403, detail="Esta cuenta fue baneada.")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register")
async def register(data: RegisterRequest):
    email_norm = data.email.strip().lower()
    validate_password(data.password)
    if await is_email_banned(email_norm):
        raise HTTPException(status_code=403, detail="Esta cuenta fue baneada. No podés volver a registrarte con este email.")
    existing = await User.find_one(User.email == email_norm)
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    import uuid
    verification_token = str(uuid.uuid4())
    new_user = await User(
        uid=str(uuid.uuid4()),
        email=email_norm,
        display_name=data.display_name,
        role="user",
        password_hash=hash_password(data.password),
        verification_token=verification_token,
        verification_token_expires_at=datetime.utcnow() + VERIFICATION_TOKEN_TTL,
        created_at=datetime.utcnow()
    ).create()

    try:
        send_verification_email(new_user.email, verification_token)
    except Exception:
        pass

    return {"message": "Revisá tu email para verificar la cuenta", "uid": new_user.uid}


@router.post("/login")
async def login(data: LoginRequest):
    email_norm = data.email.strip().lower()
    if await is_email_banned(email_norm):
        raise HTTPException(status_code=403, detail="Esta cuenta fue baneada. Contactate con soporte.")
    user = await User.find_one(User.email == email_norm)
    if not user or not verify_password(data.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    # Migración transparente: si el hash es SHA-256 antiguo, lo reemplazamos por bcrypt.
    if user.password_hash and not _is_bcrypt_hash(user.password_hash):
        try:
            user.password_hash = hash_password(data.password)
            await user.save()
        except ValueError:
            # Contraseña fuera del límite de bcrypt: se mantiene el hash legacy.
            logger.warning("No se pudo migrar un hash legacy: contraseña fuera del límite de bcrypt")
    if user.email_verified == "0":
        raise HTTPException(status_code=403, detail="Verificá tu email primero. Revisá tu bandeja de entrada (incluyendo correo no deseado).")
    access_token = create_access_token({"sub": user.uid, "email": user.email}, remember=data.remember_me)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    email_notifications: Optional[bool] = None


@router.put("/me", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user)
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
    return current_user


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
):
    """Cambia la contraseña del usuario autenticado."""
    if not current_user.password_hash:
        raise HTTPException(status_code=400, detail="Este usuario no tiene contraseña configurada (usá Google)")
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    validate_password(data.new_password)
    current_user.password_hash = hash_password(data.new_password)
    await current_user.save()
    return {"message": "Contraseña actualizada exitosamente"}


@router.post("/send-verification")
async def send_verification(current_user: User = Depends(get_current_user)):
    import uuid
    token = str(uuid.uuid4())
    current_user.verification_token = token
    current_user.verification_token_expires_at = datetime.utcnow() + VERIFICATION_TOKEN_TTL
    await current_user.save()
    try:
        send_verification_email(current_user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al enviar el email")
    return {"message": "Email de verificación enviado"}


@router.post("/resend-verification")
async def resend_verification(email: str):
    email_norm = email.strip().lower()
    user = await User.find_one(User.email == email_norm)
    # Respuesta genérica para no filtrar qué correos están registrados.
    generic = {"message": "Si el correo existe y no está verificado, recibirás un email de verificación"}
    if not user or user.email_verified == "1" or user.banned:
        return generic
    import uuid
    token = str(uuid.uuid4())
    user.verification_token = token
    user.verification_token_expires_at = datetime.utcnow() + VERIFICATION_TOKEN_TTL
    await user.save()
    try:
        send_verification_email(user.email, token)
    except Exception:
        logger.error("No se pudo reenviar el email de verificación")
    return generic


@router.get("/verify-email")
async def verify_email(token: str):
    user = await User.find_one(User.verification_token == token)
    if not user or _token_expired(user.verification_token_expires_at):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.email_verified = "1"
    user.verification_token = None
    user.verification_token_expires_at = None
    await user.save()
    return {"message": "Email verificado exitosamente"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await User.find_one(User.email == data.email.strip().lower())
    if not user:
        return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}
    import uuid
    token = str(uuid.uuid4())
    user.reset_token = token
    user.reset_token_expires_at = datetime.utcnow() + RESET_TOKEN_TTL
    await user.save()
    try:
        send_reset_password_email(user.email, token)
    except Exception:
        pass
    return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    validate_password(data.password)
    user = await User.find_one(User.reset_token == data.token)
    if not user or _token_expired(user.reset_token_expires_at):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.password_hash = hash_password(data.password)
    user.reset_token = None
    user.reset_token_expires_at = None
    await user.save()
    return {"message": "Contraseña actualizada exitosamente"}


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
        }
        for u in users
    ]


class UpdateRoleRequest(BaseModel):
    role: str


@router.patch("/users/{uid}/role")
async def update_user_role(uid: str, data: UpdateRoleRequest, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    if data.role not in ("user", "admin", "moderator"):
        raise HTTPException(status_code=400, detail="Rol inválido. Usá: user, admin, moderator")
    user = await User.find_one(User.uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    user.role = data.role
    await user.save()
    return {"message": f"Rol actualizado a {data.role}", "uid": uid, "role": data.role}


@router.delete("/users/{uid}", status_code=204)
async def delete_user(uid: str, current_user: User = Depends(get_current_user)):
    """Elimina un usuario definitivamente. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    if current_user.uid == uid:
        raise HTTPException(status_code=400, detail="No podés eliminar tu propia cuenta")
    user = await User.find_one(User.uid == uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await user.delete()
    return Response(status_code=204)


@router.post("/users/{uid}/ban")
async def ban_user(uid: str, current_user: User = Depends(get_current_user)):
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
    await user.save()
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


class UnbanRequest(BaseModel):
    email: str


@router.post("/bans/unban")
async def unban_user(data: UnbanRequest, current_user: User = Depends(get_current_user)):
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
        await user.save()
    return {"message": "Email desbaneado", "email": email_norm}


@router.get("/csrf-token")
async def get_csrf_token():
    token = secrets.token_urlsafe(32)
    return {"csrf_token": token}
