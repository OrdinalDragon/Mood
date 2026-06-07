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
    location: LocationSchema
    category: EventCategory = EventCategory.cultural

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[LocationSchema] = None
    category: Optional[EventCategory] = None

class EventResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    date: datetime
    location: dict
    category: Optional[list] = None
    status: str
    created_by: str
    author_name: Optional[str] = None

class EventListResponse(BaseModel):
    id: str
    title: str
    date: datetime
    location: dict
    category: Optional[list] = None
    status: str