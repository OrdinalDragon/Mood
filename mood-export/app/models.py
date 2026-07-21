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

    class Settings:
        name = "users"
