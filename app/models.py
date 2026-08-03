# ============================================================
# app/models.py - Modelos MongoDB (Beanie ODM)
# ============================================================
from beanie import Document
from datetime import datetime
from typing import Optional


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

    class Settings:
        name = "users"


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

    class Settings:
        name = "ads"
