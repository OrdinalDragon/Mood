# ============================================================
# app/models.py - Modelos MongoDB (Beanie ODM) + analytics event
# ============================================================
from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel


class Event(Document):
    id: str
    title: str
    description: Optional[str] = None
    date: datetime
    end_date: Optional[datetime] = None
    location: Optional[dict] = None
    category: Optional[list] = None
    categories: Optional[list] = None
    status: str = "pending"
    created_by: str
    author_name: Optional[str] = None
    moods: Optional[list] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    image_url: Optional[str] = None
    cover_image: Optional[str] = None
    images: Optional[list] = None
    is_free: bool = False
    is_outdoor: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    claim_requested_by: Optional[str] = None
    claim_requested_at: Optional[datetime] = None

    class Settings:
        name = "events"


class User(Document):
    uid: str
    email: str
    display_name: Optional[str] = None
    role: str = "user"
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    password_hash: Optional[str] = None
    email_verified: str = "0"
    verification_token: Optional[str] = None
    verification_token_expires_at: Optional[datetime] = None
    auth_provider: str = "email"
    google_id: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None
    favorites: list = Field(default_factory=list)
    email_notifications: bool = True
    banned: bool = False
    banned_at: Optional[datetime] = None
    # Versión de sesión: se incrementa al cambiar/resetear contraseña o banear.
    # Los access/refresh tokens con una versión vieja dejan de valer.
    token_version: int = 0
    last_login_at: Optional[datetime] = None
    # MFA (TOTP)
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None
    mfa_pending_secret: Optional[str] = None
    mfa_recovery_hashes: list[str] = Field(default_factory=list)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("uid", ASCENDING)], unique=True),
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel(
                [("google_id", ASCENDING)],
                unique=True,
                partialFilterExpression={"google_id": {"$type": "string"}},
            ),
        ]


class BannedEmail(Document):
    email: str
    display_name: Optional[str] = None
    banned_at: Optional[datetime] = None
    banned_by: Optional[str] = None

    class Settings:
        name = "banned_emails"
        indexes = [IndexModel([("email", ASCENDING)], unique=True)]


class Ad(Document):
    id: str
    badge: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    image: Optional[str] = None
    active: bool = True
    order: int = 0
    hero: bool = False
    icon: Optional[str] = None
    gradient: Optional[str] = None
    badge_color: Optional[str] = None
    footer: Optional[str] = None

    class Settings:
        name = "ads"


class Review(Document):
    id: str
    event_id: str
    user_id: str
    author_name: Optional[str] = None
    author_photo: Optional[str] = None
    rating: int = 5
    comment: Optional[str] = None
    reply: Optional[str] = None
    replied_by: Optional[str] = None
    replied_by_name: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Settings:
        name = "reviews"


class Notification(Document):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    link: Optional[str] = None
    event_id: Optional[str] = None
    event_date: Optional[datetime] = None
    event_count: Optional[int] = None
    read: bool = False
    created_at: Optional[datetime] = None
    # Control del mail de recordatorio de favoritos: no se envía apenas se
    # agrega el favorito, sino recién cuando vence email_due_at (período de
    # gracia). Si el usuario saca el favorito antes, el mail nunca se manda.
    email_due_at: Optional[datetime] = None
    email_sent_at: Optional[datetime] = None

    class Settings:
        name = "notifications"


class RefreshSession(Document):
    """Sesión refrescable. El secreto se guarda hasheado, nunca en claro."""

    session_id: str
    uid: str
    secret_hash: str
    created_at: datetime
    last_used_at: datetime
    expires_at: datetime
    user_agent: Optional[str] = None
    ip: Optional[str] = None
    revoked: bool = False
    # Versión del usuario al crear la sesión: si cambia, la sesión se invalida.
    token_version: int = 0
    remember: bool = False

    class Settings:
        name = "refresh_sessions"
        indexes = [
            IndexModel([("session_id", ASCENDING)], unique=True),
            IndexModel([("uid", ASCENDING)]),
            # TTL: Mongo borra la sesión al vencer.
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
        ]


class AuditLog(Document):
    """Evento de auditoría de seguridad. Retención: 180 días."""

    timestamp: datetime
    action: str
    actor_uid: Optional[str] = None
    actor_email: Optional[str] = None
    target: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool = True
    metadata: dict = Field(default_factory=dict)

    class Settings:
        name = "audit_logs"
        indexes = [
            IndexModel([("actor_uid", ASCENDING)]),
            IndexModel([("action", ASCENDING)]),
            IndexModel(
                [("timestamp", ASCENDING)],
                expireAfterSeconds=180 * 24 * 60 * 60,
                name="audit_ttl_180d",
            ),
        ]


class AnalyticsEvent(Document):
    """Evento de telemetría anónimo para estadísticas de uso.

    La IP solo se guarda como hash (ip_hash) para contar visitantes únicos.
    client_id es un UUID generado en el navegador tras aceptar cookies.
    """
    id: str
    type: str  # page_view, mood_select, search, event_view, favorite, review, consent
    path: Optional[str] = None
    mood: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    ip_hash: Optional[str] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Settings:
        name = "analytics_events"
        indexes = ["created_at"]  # Índice para consultas por período


# ─── Importar en database.py para que se registre ──────────────────
from .models import Event, User, BannedEmail, Ad, Review, Notification, AnalyticsEvent, RefreshSession, AuditLog