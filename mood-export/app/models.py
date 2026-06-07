# ============================================================
# app/models/__init__.py - Modelos de Datos
# ============================================================
from sqlalchemy import Column, String, Text, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class EventStatus(enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String(36), primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    location = Column(JSON)
    category = Column(JSON)
    categories = Column(JSON)
    status = Column(Enum(EventStatus), default=EventStatus.pending)
    created_by = Column(String(36), nullable=False)
    author_name = Column(String(255))
    is_recurring = Column(String(1))
    recurrence_rule = Column(String(100))
    image_url = Column(String(500))
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class User(Base):
    __tablename__ = "users"
    
    uid = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255))
    role = Column(String(20), default="user")
    photo_url = Column(String(500))
    created_at = Column(DateTime)