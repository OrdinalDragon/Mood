# ============================================================
# app/scheduler.py - Tareas en segundo plano
# ============================================================
import asyncio
import logging
from datetime import datetime
from app.models import User
from app.notifications_service import sync_favorite_near, archive_past_events

logger = logging.getLogger(__name__)

SCAN_INTERVAL_SECONDS = 60 * 60  # 1 hora
SCRAPE_INTERVAL_SECONDS = 6 * 60 * 60  # 6 horas
EMAIL_FLUSH_SECONDS = 60  # mails de favoritos vencidos (gracia)


async def scrape_events_once():
    from app.scraper import run_scrape

    try:
        result = await run_scrape()
        logger.info("scrape result: %s", result)
    except Exception as e:
        logger.error(f"scrape error: {e}")


async def scrape_loop():
    while True:
        await scrape_events_once()
        await asyncio.sleep(SCRAPE_INTERVAL_SECONDS)


async def scan_favorite_near_once():
    try:
        await archive_past_events()
    except Exception as e:
        logger.error(f"archive_past_events error: {e}")
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


async def favorite_email_flush_loop():
    """Chequea cada minuto los mails de favoritos cuyo período de gracia ya
    venció y los envía (si el favorito sigue vigente)."""
    from app.notifications_service import send_due_favorite_emails

    while True:
        try:
            await send_due_favorite_emails()
        except Exception as e:
            logger.error(f"favorite email flush error: {e}")
        await asyncio.sleep(EMAIL_FLUSH_SECONDS)
