# ============================================================
# app/schemas/__init__.py - Esquemas Pydantic
# ============================================================
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class EventCategory(str, Enum):
    cultural = "cultural"
    adventure = "adventure"
    relax = "relax"
    nightlife = "nightlife"
    group = "group"
    individual = "individual"

class LocationSchema(BaseModel):
    address: str
    city: str
    province: str
    lat: float
    lng: float

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: datetime
    end_date: Optional[datetime] = None
    location: LocationSchema
    category: EventCategory = EventCategory.cultural
    moods: Optional[list[str]] = None
    cover_image: Optional[str] = None
    images: Optional[list[str]] = None
    image_url: Optional[str] = None
    is_free: Optional[bool] = False
    is_outdoor: Optional[bool] = False

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[LocationSchema] = None
    category: Optional[EventCategory] = None
    moods: Optional[list[str]] = None
    cover_image: Optional[str] = None
    images: Optional[list[str]] = None
    image_url: Optional[str] = None
    is_free: Optional[bool] = False
    is_outdoor: Optional[bool] = False

class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: datetime
    end_date: Optional[datetime] = None
    location: dict
    category: Optional[list] = None
    moods: Optional[list[str]] = None
    cover_image: Optional[str] = None
    images: Optional[list[str]] = None
    image_url: Optional[str] = None
    is_free: Optional[bool] = False
    is_outdoor: Optional[bool] = False
    status: str
    created_by: str
    author_name: Optional[str] = None
    avg_rating: Optional[float] = None
    rating_count: Optional[int] = None

class EventListResponse(BaseModel):
    id: str
    title: str
    date: datetime
    location: dict
    category: Optional[list] = None
    moods: Optional[list[str]] = None
    cover_image: Optional[str] = None
    images: Optional[list[str]] = None
    image_url: Optional[str] = None
    is_free: Optional[bool] = False
    is_outdoor: Optional[bool] = False
    distance: Optional[float] = None
    status: str
    avg_rating: Optional[float] = None
    rating_count: Optional[int] = None

class UserResponse(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    role: str = "user"
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    favorites: list[str] = []
    email_notifications: bool = True


class UserAdminResponse(BaseModel):
    uid: str
    email: str
    display_name: Optional[str] = None
    role: str = "user"
    photo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    email_verified: str = "0"
    auth_provider: str = "email"
    google_id: Optional[str] = None

class NotificationResponse(BaseModel):
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


class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None


class ReviewReply(BaseModel):
    reply: str


class ReviewResponse(BaseModel):
    id: str
    event_id: str
    user_id: str
    author_name: Optional[str] = None
    author_photo: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    reply: Optional[str] = None
    replied_by: Optional[str] = None
    replied_by_name: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    event: Optional[dict] = None


class UserRatingResponse(BaseModel):
    user_id: str
    avg_rating: Optional[float] = None
    rating_count: int = 0


class EventRatingSummary(BaseModel):
    avg_rating: Optional[float] = None
    rating_count: int = 0