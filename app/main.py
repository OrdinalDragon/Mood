# ============================================================
# app/routes/analytics.py - Rutas de analíticas (públicas y administrativas)
# ============================================================

from datetime import datetime, timedelta
from typing import Dict, List, Any
import hashlib
import os

from fastapi import APIRouter, Query, HTTPException
from starlette.requests import Request

from app.database import db
from app.models import Event, User, AnalyticsEvent


router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ─── Esquemas Pydantic ──────────────────────────────────────────────

class AnalyticsTrackRequest(BaseModel):
    type: str  # page_view, mood_select, search, event_view, favorite, review, consent
    path: Optional[str] = None
    mood: Optional[str] = None
    user_id: Optional[str] = None
    client_id: Optional[str] = None
    referrer: Optional[str] = None
    user_agent: Optional[str] = None


class SummaryStats(BaseModel):
    period_days: int
    traffic_views: int
    unique_clients: int
    unique_ips: int
    daily_views_by_hour: Dict[int, int]
    weekday_distribution: Dict[str, int]
    top_pages: List[Dict[str, Any]]
    moods_counts: Dict[str, int]
    events_by_status: Dict[str, int]
    events_by_category: Dict[str, int]
    upcoming_events: List[Dict[str, Any]]
    top_favorites: Dict[str, int]
    top_rated: Dict[str, int]
    users_total: int
    users_new_per_month: int
    providers: Dict[str, int]
    engagement_reviews_count: int
    engagement_favorites_count: int
    engagement_claims_count: int


# ─── POST /analytics/track — Fire-and-forget (público) ──────────────

@router.post("/track")
async def track_analytics(
    req_data: AnalyticsTrackRequest,
    request: Request
):
    """Registro anónimo de telemetría. No requiere autenticación."""

    allowed_types = ["page_view", "mood_select", "search", "event_view", "favorite", "review", "consent"]
    if req_data.type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid event type")

    forwarded_for = request.headers.get("X-Forwarded-For", "")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else "unknown"
    salt = "mood_analytics_salt_v1"
    ip_hash = hashlib.sha256((client_ip + salt).encode()).hexdigest()

    analytics_event = AnalyticsEvent(
        id=hashlib.md5(str(req_data).__hash__.to_bytes(10, 'little')).hexdigest(),
        type=req_data.type,
        path=req_data.path,
        mood=req_data.mood,
        user_id=req_data.user_id or None,
        client_id=req_data.client_id or None,
        ip_hash=ip_hash,
        referrer=req_data.referrer or None,
        user_agent=req_data.user_agent or None,
        created_at=datetime.utcnow()
    )

    try:
        await db.add(analytics_event)
    except Exception as e:
        print(f"[Analytics] Error guardando: {e}")

    return {"status": "ok"}


# ─── GET /analytics/summary?days=7|30|90 — Solo admin (200) ──────────

@router.get("/summary")
async def get_analytics_summary(
    days: int = Query(7, ge=1, le=90),
    request: Request
):
    """Obtener resumen estadístico. Acceso controlado por rol admin."""

    auth_header = request.headers.get("authorization", "")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1]

    # Validación de rol: solo admins pueden acceder (comparar token con secret)
    admin_secret = os.getenv("ADMIN_API_KEY")
    if not token or token != admin_secret:
        raise HTTPException(status_code=403, detail="Access denied")

    start_date = datetime.utcnow() - timedelta(days=days)

    # ─── Tráfico (views únicos por client_id e ip_hash) ──────────────
    clients_docs = await db.AnalyticsEvent.find({
        "created_at": {"$gte": start_date}
    })

    unique_clients: Dict[str, int] = {}
    unique_ips: Dict[str, int] = {}
    daily_views: Dict[int, int] = {i: 0 for i in range(24)}
    weekday_map = {
        "lunes": 0, "martes": 1, "miércoles": 2, "jueves": 3,
        "viernes": 4, "sábado": 5, "domingo": 6
    }

    for doc in clients_docs:
        cid = doc.get("client_id") or "unknown"
        iph = doc.get("ip_hash") or "unknown"

        unique_clients[cid] = unique_clients.get(cid, 0) + 1
        unique_ips[iph] = unique_ips.get(iph, 0) + 1

        day_index = int((doc.created_at - start_date).total_seconds() / 86400) % 24
        weekday_name = [
            "lunes", "martes", "miércoles", "jueves",
            "viernes", "sábado", "domingo"
        ][day_index]
        daily_views[day_index] += 1

    # ─── Moods más usados ──────────────────────────────────────────────
    mood_counts: Dict[str, int] = {}
    for doc in clients_docs:
        m = doc.get("mood") or "all"
        mood_counts[m] = mood_counts.get(m, 0) + 1

    # ─── Eventos (status/categoría/provincia/mood) ──────────────────────
    events_count_by_status: Dict[str, int] = {}
    events_count_by_category: Dict[str, int] = {}
    upcoming_events: List[Dict[str, Any]] = []

    all_events = await db.Event.find({})
    for evt in all_events:
        es = evt.get("status") or "unknown"
        ec = evt.get("category") or "all"
        events_count_by_status[es] = events_count_by_status.get(es, 0) + 1
        events_count_by_category[ec] = events_count_by_category.get(ec, 0) + 1

    now = datetime.utcnow()
    for evt in all_events:
        if evt.date and (now - evt.date).total_seconds() < days * 86400 and evt.date > now:
            upcoming_events.append({
                "id": evt.id,
                "title": evt.title,
                "date": evt.date.isoformat(),
                "location": evt.location,
                "category": evt.category or evt.get("categories", []),
                "moods": evt.moods or [],
                "is_free": evt.is_free,
            })

    # Top favoritos y valorados
    top_favorites: Dict[str, int] = {}
    top_rated: Dict[str, int] = {}
    for evt in all_events:
        if evt.get("is_free"):
            top_favorites[evt.title] = top_favorites.get(evt.title, 0) + 1
        if evt.get("moods") and evt.moods.count("alegre") > 0:
            top_rated[evt.title] = top_rated.get(evt.title, 0) + 1

    # ─── Usuarios (totales, nuevos, por provider) ──────────────────────
    users_docs = await db.User.find({})
    total_users = len(users_docs)

    new_per_month: int = sum(
        1 for u in users_docs if user.created_at >= now - timedelta(days=30)
    )

    provider_counts: Dict[str, int] = {}
    for u in users_docs:
        prov = u.get("auth_provider") or "email"
        provider_counts[prov] = provider_counts.get(prov, 0) + 1

    # ─── Engagement ────────────────────────────────────────────────────
    reviews_count = len(await db.Review.find({}))
    favorites_count = sum(
        len(u.favorites or []) for u in users_docs
    )
    claims_count = len(await db.AnalyticsEvent.find({
        "type": "favorite",
        "created_at": {"$gte": start_date}
    }))

    # ─── Construir respuesta ──────────────────────────────────────────
    response = {
        "period_days": days,
        "traffic_views": len(clients_docs),
        "unique_clients": len(unique_clients),
        "unique_ips": len(unique_ips),
        "daily_views_by_hour": daily_views,
        "weekday_distribution": weekday_map,
        "top_pages": [{"page": path, "views": count} for path, count in sorted(
            unique_clients.items(), key=lambda x: -x[1]
        )[:20]],
        "moods_counts": mood_counts,
        "events_by_status": events_count_by_status,
        "events_by_category": events_count_by_category,
        "upcoming_events": upcoming_events,
        "top_favorites": top_favorites,
        "top_rated": top_rated,
        "users_total": total_users,
        "users_new_per_month": new_per_month,
        "providers": provider_counts,
        "engagement_reviews_count": reviews_count,
        "engagement_favorites_count": favorites_count,
        "engagement_claims_count": claims_count,
    }

    return response
```

<tool_call>
<function=write>
<parameter=content>
# ============================================================
# app/main.py - Añadir registro del router de analytics
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import init_db, close_db
from app.routes import events, auth, upload, gemini, favorites, ads, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    from app.scheduler import notification_scan_loop, scrape_loop
    scan_task = asyncio.create_task(notification_scan_loop())
    scrape_task = asyncio.create_task(scrape_loop())

    yield

    scan_task.cancel()
    try:
        await scan_task
    except asyncio.CancelledError:
        pass
    scrape_task.cancel()
    try:
        await scrape_task
    except asyncio.CancelledError:
        pass
    await close_db()


app = FastAPI(
    title="MOOD API",
    description="API para explorar tu ciudad - Gestor de eventos",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servir archivos subidos
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Incluir routers
from app.routes import events
app.include_router(events.router)

from app.routes import auth
app.include_router(auth.router)

from app.routes import upload
app.include_router(upload.router)

from app.routes import gemini
app.include_router(gemini.router)

from app.routes import favorites
app.include_router(favorites.router)

from app.routes import ads
app.include_router(ads.router)

from app.routes import notifications
app.include_router(notifications.router)

# ── NUEVO: Registrar router de analytics ───────────────────────
from app.routes import analytics
app.include_router(analytics.router, prefix="/api/analytics")

@app.get("/")
async def root():
    return {"message": "MOOD API is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}