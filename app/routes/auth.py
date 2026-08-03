from fastapi import APIRouter, Depends, HTTPException, Header, Response
from app.models import User
from app.schemas import UserResponse
from app.email import send_verification_email, send_reset_password_email
from datetime import datetime, timedelta
import jwt
import hashlib
import os
import secrets
import logging
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])

SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


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

    user = await User.find_one(User.google_id == google_id)
    if not user:
        user = await User.find_one(User.email == email)

    if user:
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = "google"
            if photo_url:
                user.photo_url = photo_url
            await user.save()
    else:
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
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await User.find_one(User.uid == user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/register")
async def register(data: RegisterRequest):
    existing = await User.find_one(User.email == data.email)
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    import uuid
    verification_token = str(uuid.uuid4())
    new_user = await User(
        uid=str(uuid.uuid4()),
        email=data.email,
        display_name=data.display_name,
        role="user",
        password_hash=hash_password(data.password),
        verification_token=verification_token,
        created_at=datetime.utcnow()
    ).create()

    try:
        send_verification_email(new_user.email, verification_token)
    except Exception:
        pass

    return {"message": "Revisá tu email para verificar la cuenta", "uid": new_user.uid}


@router.post("/login")
async def login(data: LoginRequest):
    user = await User.find_one(User.email == data.email)
    if not user or not verify_password(data.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
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
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 6 caracteres")
    current_user.password_hash = hash_password(data.new_password)
    await current_user.save()
    return {"message": "Contraseña actualizada exitosamente"}


@router.post("/send-verification")
async def send_verification(current_user: User = Depends(get_current_user)):
    import uuid
    token = str(uuid.uuid4())
    current_user.verification_token = token
    await current_user.save()
    try:
        send_verification_email(current_user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al enviar el email")
    return {"message": "Email de verificación enviado"}


@router.post("/resend-verification")
async def resend_verification(email: str):
    user = await User.find_one(User.email == email)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if user.email_verified == "1":
        raise HTTPException(status_code=400, detail="El email ya está verificado")
    import uuid
    token = str(uuid.uuid4())
    user.verification_token = token
    await user.save()
    try:
        send_verification_email(user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="Error al enviar el email")
    return {"message": "Email de verificación reenviado"}


@router.get("/verify-email")
async def verify_email(token: str):
    user = await User.find_one(User.verification_token == token)
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.email_verified = "1"
    user.verification_token = None
    await user.save()
    return {"message": "Email verificado exitosamente"}


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await User.find_one(User.email == data.email)
    if not user:
        return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}
    import uuid
    token = str(uuid.uuid4())
    user.reset_token = token
    await user.save()
    try:
        send_reset_password_email(user.email, token)
    except Exception:
        pass
    return {"message": "Si el correo existe, recibirás un enlace para restablecer tu contraseña"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    user = await User.find_one(User.reset_token == data.token)
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.password_hash = hash_password(data.password)
    user.reset_token = None
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


@router.get("/csrf-token")
async def get_csrf_token():
    token = secrets.token_urlsafe(32)
    return {"csrf_token": token}
