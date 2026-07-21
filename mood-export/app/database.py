# ============================================================
# app/database.py - Conexión a MongoDB
# ============================================================
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mood_user:mood_password@mongo:27017/mood_db?authSource=admin")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "mood_db")

from typing import Optional

client: Optional[AsyncIOMotorClient] = None


async def init_db():
    global client
    client = AsyncIOMotorClient(MONGO_URI)
    from app.models import Event, User
    await init_beanie(database=client[MONGO_DB_NAME], document_models=[Event, User])


async def close_db():
    global client
    if client:
        client.close()
