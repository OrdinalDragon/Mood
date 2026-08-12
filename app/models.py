# ============================================================
# app/models.py - Modelos MongoDB (Beanie ODM) + analytics event
# ============================================================
from datetime import datetime
from typing import Optional

from beanie import Document


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
    auth_provider: str = "email"
    google_id: Optional[str] = None
    reset_token: Optional[str] = None
    favorites: list = []
    email_notifications: bool = True
    banned: bool = False
    banned_at: Optional[datetime] = None

    class Settings:
        name = "users"


class BannedEmail(Document):
    email: str
    display_name: Optional[str] = None
    banned_at: Optional[datetime] = None
    banned_by: Optional[str] = None

    class Settings:
        name = "banned_emails"


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

    class Settings:
        name = "notifications"


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
from .models import Event, User, BannedEmail, Ad, Review, Notification, AnalyticsEvent