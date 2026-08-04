# ============================================================
# app/scheduler.py - Tareas en segundo plano
# ============================================================
import asyncio
import logging
from datetime import datetime
from app.models import User
from app.notifications_service import sync_favorite_near

logger = logging.getLogger(__name__)

SCAN_INTERVAL_SECONDS = 60 * 60  # 1 hora


async def scan_favorite_near_once():
    users = await User.find_all().to_list()
    for user in users:
        try:
            await sync_favorite_near(user)
        except Exception as e:
            logger.error(f"sync_favorite_near error for user {user.uid}: {e}")


async def notification_scan_loop():
    while True:
        try:
            await scan_favorite_near_once()
        except Exception as e:
            logger.error(f"notification scan loop error: {e}")
        await asyncio.sleep(SCAN_INTERVAL_SECONDS)
