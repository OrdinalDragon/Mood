# ============================================================
# app/notifications_service.py - Lógica de Notificaciones
# ============================================================
import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from app.models import Notification, Event, User
from app.email import send_event_reminder_email, send_events_summary_email

logger = logging.getLogger(__name__)

FAVORITE_WINDOW_DAYS = 7
FAVORITE_AGGREGATE_THRESHOLD = 10
EMAIL_REMINDERS_ENABLED = os.getenv("SEND_EMAIL_REMINDERS", "1").lower() in ("1", "true", "yes")

ADMIN_ROLES = ("admin", "moderator")

# Las fechas de los eventos se guardan como hora local (ARG, UTC-3) naive,
# igual que en app/routes/events.py. Usamos el mismo "now" para comparar.
ARG_TZ = timezone(timedelta(hours=-3))


def arg_now():
    return datetime.now(ARG_TZ).replace(tzinfo=None)


async def create_notification(
    user_id: str,
    ntype: str,
    title: str,
    message: str,
    link: str = None,
    event_id: str = None,
    event_date: datetime = None,
    event_count: int = None,
):
    return await Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        link=link,
        event_id=event_id,
        event_date=event_date,
        event_count=event_count,
        read=False,
        created_at=datetime.utcnow(),
    ).create()


def countdown_text(event_date: datetime, now: datetime = None) -> str:
    now = now or arg_now()
    days = (event_date - now).days
    if days <= 0:
        return "Hoy"
    if days == 1:
        return "Mañana"
    return f"Faltan {days} días"


async def send_reminder_email_safe(user: User, event: Event, countdown: str):
    """Envía el mail recordatorio de un evento. Los fallos de SMTP se loguean
    y no interrumpen el scan del resto de usuarios."""
    try:
        await asyncio.to_thread(
            send_event_reminder_email, user.email, user.display_name, event, countdown
        )
        logger.info(f"reminder email sent to {user.email} for event {event.id}")
    except Exception as e:
        logger.error(f"send_event_reminder_email error for user {user.uid}: {e}")


async def send_summary_email_safe(user: User, count: int):
    try:
        await asyncio.to_thread(
            send_events_summary_email, user.email, user.display_name, count
        )
        logger.info(f"summary email sent to {user.email} ({count} events)")
    except Exception as e:
        logger.error(f"send_events_summary_email error for user {user.uid}: {e}")


# ============================================================
# ADMIN - "Hay X eventos nuevos que esperan aprobación"
# ============================================================
async def sync_admin_pending_notifications():
    pending_count = await Event.find(Event.status == "pending").count()
    admins = await User.find({"role": {"$in": list(ADMIN_ROLES)}}).to_list()

    for admin in admins:
        existing = await Notification.find_one(
            Notification.user_id == admin.uid,
            Notification.type == "event_submitted",
        )

        if pending_count <= 0:
            if existing:
                await existing.delete()
            continue

        evento = "evento" if pending_count == 1 else "eventos"
        nuevo = "nuevo" if pending_count == 1 else "nuevos"
        message = f"Hay {pending_count} {evento} {nuevo} que esperan aprobación"

        if not existing:
            await create_notification(
                admin.uid,
                "event_submitted",
                "Eventos por aprobar",
                message,
                link="/admin",
                event_count=pending_count,
            )
            continue

        old_count = existing.event_count
        if old_count != pending_count:
            existing.message = message
            existing.event_count = pending_count
            if pending_count > (old_count or 0):
                existing.read = False
            await existing.save()


# ============================================================
# ARCHIVADO - eventos aprobados con fecha pasada
# ============================================================
async def archive_past_events():
    """Marca como 'archived' los eventos aprobados cuya fecha ya pasó.
    No genera mails ni notificaciones: solo actualiza el estado para que
    salgan de los listados por defecto y pasen a la pestaña de concluidos."""
    now = arg_now()
    events = await Event.find(
        {"status": "approved", "date": {"$lt": now}}
    ).to_list()
    archived = 0
    for e in events:
        e.status = "archived"
        await e.save()
        archived += 1
    if archived:
        logger.info(f"archived {archived} past events")
    return archived


# ============================================================
# FAVORITOS CERCA - individuales (<=10) o agregada (>10)
# ============================================================
async def sync_favorite_near(user: User):
    favorites = user.favorites or []
    if not favorites:
        await Notification.find(
            Notification.user_id == user.uid,
            Notification.type == "favorite_near",
        ).delete_many()
        return

    now = arg_now()
    window_end = now + timedelta(days=FAVORITE_WINDOW_DAYS)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Favorito aprobado dentro de la ventana de 7 días, incluyendo los de
    # HOY: aunque ya hayan arrancado (en curso) siguen avisando "Hoy".
    near_events = await Event.find(
        {
            "_id": {"$in": favorites},
            "status": "approved",
            "date": {"$lte": window_end},
            "$or": [
                {"end_date": {"$gte": now}},
                {"end_date": None, "date": {"$gte": today_start}},
            ],
        }
    ).sort("date").to_list()

    existing = await Notification.find(
        Notification.user_id == user.uid,
        Notification.type == "favorite_near",
    ).to_list()
    existing_agg = next((n for n in existing if n.link == "/favorites"), None)
    existing_events = {n.event_id: n for n in existing if n.event_id}
    existing_ids = [n.id for n in existing]

    if len(near_events) > FAVORITE_AGGREGATE_THRESHOLD:
        # Eliminar individuales
        to_delete = [n for n in existing if n.event_id]
        for n in to_delete:
            await n.delete()

        message = "Tienes muchos eventos esta semana, clickea para ver todos los eventos"
        if existing_agg:
            if existing_agg.event_count != len(near_events):
                existing_agg.message = message
                existing_agg.event_count = len(near_events)
                existing_agg.read = False
                await existing_agg.save()
        else:
            await create_notification(
                user.uid,
                "favorite_near",
                "Muchos eventos esta semana",
                message,
                link="/favorites",
                event_count=len(near_events),
            )
            if EMAIL_REMINDERS_ENABLED and user.email_notifications:
                await send_summary_email_safe(user, len(near_events))
        return

    # Eliminar agregada si existía
    if existing_agg:
        await existing_agg.delete()

    current_event_ids = {e.id for e in near_events}
    for n in existing:
        if n.event_id and n.event_id not in current_event_ids:
            await n.delete()

    for e in near_events:
        if e.id not in existing_events:
            await create_notification(
                user.uid,
                "favorite_near",
                "Evento favorito cerca",
                f"«{e.title}» — {countdown_text(e.date, now)}",
                link=f"/event/{e.id}",
                event_id=e.id,
                event_date=e.date,
            )
            if EMAIL_REMINDERS_ENABLED and user.email_notifications:
                await send_reminder_email_safe(user, e, countdown_text(e.date, now))


# ============================================================
# AUTOR - aprobado / rechazado
# ============================================================
async def notify_event_status(event: Event, action: str):
    if not event.created_by or event.created_by == "anonymous":
        return
    if action == "approved":
        title = "Evento aprobado"
        message = f"Tu evento «{event.title}» fue aprobado y ya está visible."
    else:
        title = "Evento rechazado"
        message = f"Tu evento «{event.title}» no fue aprobado."
    await create_notification(
        event.created_by,
        f"event_{action}",
        title,
        message,
        link=f"/event/{event.id}",
        event_id=event.id,
    )


# ============================================================
# CLEANUP - un evento fue eliminado
# ============================================================
async def cleanup_favorite_near_for_event(event_id: str):
    await Notification.find(
        Notification.type == "favorite_near",
        Notification.event_id == event_id,
    ).delete_many()
