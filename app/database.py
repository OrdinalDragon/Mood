# ============================================================
# app/database.py - Conexión a MongoDB
# ============================================================
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os

MONGO_URI = os.getenv("MONGO_URI", "").strip()
if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI no configurado. Definí la cadena de conexión en el entorno "
        "(ver .env.example)."
    )
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "mood_db")

from typing import Optional

client: Optional[AsyncIOMotorClient] = None


async def init_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    from app.models import (
        Event,
        User,
        Ad,
        BannedEmail,
        Notification,
        Review,
        AnalyticsEvent,
        RefreshSession,
        AuditLog,
    )
    await init_beanie(
        database=client[MONGO_DB_NAME],
        document_models=[
            Event,
            User,
            Ad,
            BannedEmail,
            Notification,
            Review,
            AnalyticsEvent,
            RefreshSession,
            AuditLog,
        ],
    )


async def close_db():
    global client
    if client:
        client.close()
