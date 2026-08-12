# ============================================================
# app/routes/analytics.py - Estadísticas de uso (track + summary admin)
# ============================================================
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any

from fastapi import APIRouter, Depends, HTTPException
from starlette.requests import Request

from app.models import AnalyticsEvent, Event, User, Review
from app.routes.auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

IP_SALT = "mood_analytics_salt_v1"
# Argentina (UTC-3, sin DST desde 2009). Los eventos se guardan en UTC naive.
ARG_TZ = timezone(timedelta(hours=-3))
WHITELISTED_TYPES = [
    "page_view", "mood_select", "search", "event_view", "favorite", "review", "consent"
]

WEEKDAY_NAMES = [
    "lunes", "martes", "miércoles", "jueves",
    "viernes", "sábado", "domingo",
]


# ─── POST /analytics/track — Fire-and-forget (público) ──────────────

@router.post("/track")
async def track_event(request: Request):
    """Registro anónimo de telemetría. No requiere autenticación.

    Sin consentimiento el frontend no envía nada, así que acá llegan
    únicamente eventos de usuarios que aceptaron cookies.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ignored"}

    event_type = data.get("type")
    if event_type not in WHITELISTED_TYPES:
        return {"status": "ignored"}

    x_forwarded_for = request.headers.get("X-Forwarded-For", "")
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else "unknown"
    ip_hash = hashlib.sha256((client_ip + IP_SALT).encode()).hexdigest()

    analytics_event = AnalyticsEvent(
        id=str(uuid.uuid4()),
        type=event_type,
        path=data.get("path"),
        mood=data.get("mood"),
        user_id=data.get("user_id") or None,
        client_id=data.get("client_id") or None,
        ip_hash=ip_hash,
        referrer=data.get("referrer") or None,
        user_agent=data.get("user_agent") or None,
        created_at=datetime.utcnow(),
    )

    try:
        await analytics_event.insert()
    except Exception:
        # Fire-and-forget: nunca romper la UX por un evento de telemetría.
        pass

    return {"status": "ok"}


# ─── GET /analytics/summary — Solo admin ─────────────────────────────

@router.get("/summary")
async def get_analytics_summary(
    days: int = 7,
    current_user: User = Depends(get_current_user),
):
    """Resumen estadístico para el dashboard de admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden ver estadísticas")

    now = datetime.utcnow()
    start = now - timedelta(days=days)
    days = max(1, min(days, 90))

    # ── Tráfico ────────────────────────────────────────────────────────
    events = await AnalyticsEvent.find(
        AnalyticsEvent.created_at >= start
    ).to_list()

    unique_clients = set()
    unique_ips = set()
    daily_views_by_hour: Dict[int, int] = {h: 0 for h in range(24)}
    weekday_distribution: Dict[str, int] = {w: 0 for w in WEEKDAY_NAMES}
    top_pages: Dict[str, int] = {}
    moods_counts: Dict[str, int] = {}

    for e in events:
        if e.client_id:
            unique_clients.add(e.client_id)
        if e.ip_hash:
            unique_ips.add(e.ip_hash)

        # created_at se guarda como UTC naive → se pasa a hora de Argentina para los gráficos
        local_dt = e.created_at.replace(tzinfo=timezone.utc).astimezone(ARG_TZ)
        daily_views_by_hour[local_dt.hour] = daily_views_by_hour.get(local_dt.hour, 0) + 1
        wd = WEEKDAY_NAMES[local_dt.weekday()]
        weekday_distribution[wd] = weekday_distribution.get(wd, 0) + 1

        if e.path:
            top_pages[e.path] = top_pages.get(e.path, 0) + 1
        if e.mood:
            moods_counts[e.mood] = moods_counts.get(e.mood, 0) + 1

    top_pages_list = [
        {"page": path, "views": count}
        for path, count in sorted(top_pages.items(), key=lambda x: -x[1])[:20]
    ]

    # ── Eventos ────────────────────────────────────────────────────────
    all_events = await Event.find({}).to_list()
    events_by_status: Dict[str, int] = {}
    events_by_category: Dict[str, int] = {}
    upcoming_events: List[Dict[str, Any]] = []
    claims_count = 0

    for evt in all_events:
        status = evt.status or "unknown"
        events_by_status[status] = events_by_status.get(status, 0) + 1

        cats = evt.category or evt.categories or []
        if isinstance(cats, str):
            cats = [cats]
        for c in cats:
            if c:
                events_by_category[c] = events_by_category.get(c, 0) + 1

        if evt.claim_requested_by or evt.claim_requested_at:
            claims_count += 1

        if evt.date and now < evt.date <= now + timedelta(days=days):
            upcoming_events.append({
                "id": evt.id,
                "title": evt.title,
                "date": evt.date.isoformat(),
                "location": evt.location or {},
                "category": cats,
                "moods": evt.moods or [],
                "is_free": evt.is_free,
            })

    upcoming_events.sort(key=lambda x: x["date"])
    upcoming_events = upcoming_events[:50]

    # ── Top favoritos y valorados ──────────────────────────────────────
    fav_by_event: Dict[str, int] = {}
    for u in await User.find({}).to_list():
        for fav_id in (u.favorites or []):
            fav_by_event[fav_id] = fav_by_event.get(fav_id, 0) + 1

    title_by_id = {e.id: e.title for e in all_events}
    top_favorites = {
        title_by_id.get(eid, eid): count
        for eid, count in sorted(fav_by_event.items(), key=lambda x: -x[1])[:10]
    }

    rating_count: Dict[str, int] = {}
    for r in await Review.find({}).to_list():
        rating_count[r.event_id] = rating_count.get(r.event_id, 0) + 1

    top_rated = {
        title_by_id.get(eid, eid): count
        for eid, count in sorted(rating_count.items(), key=lambda x: -x[1])[:10]
    }

    # ── Usuarios ───────────────────────────────────────────────────────
    users_docs = await User.find({}).to_list()
    users_total = len(users_docs)
    users_new_per_month = sum(
        1 for u in users_docs if u.created_at and u.created_at >= now - timedelta(days=30)
    )
    providers: Dict[str, int] = {}
    for u in users_docs:
        prov = u.auth_provider or "email"
        providers[prov] = providers.get(prov, 0) + 1

    # ── Engagement ─────────────────────────────────────────────────────
    reviews_count = len(rating_count)
    favorites_count = sum(len(u.favorites or []) for u in users_docs)

    return {
        "period_days": days,
        "traffic_views": len(events),
        "unique_clients": len(unique_clients),
        "unique_ips": len(unique_ips),
        "daily_views_by_hour": {str(k): v for k, v in daily_views_by_hour.items()},
        "weekday_distribution": weekday_distribution,
        "top_pages": top_pages_list,
        "moods_counts": moods_counts,
        "events_by_status": events_by_status,
        "events_by_category": events_by_category,
        "upcoming_events": upcoming_events,
        "top_favorites": top_favorites,
        "top_rated": top_rated,
        "users_total": users_total,
        "users_new_per_month": users_new_per_month,
        "providers": providers,
        "engagement_reviews_count": reviews_count,
        "engagement_favorites_count": favorites_count,
        "engagement_claims_count": claims_count,
    }
