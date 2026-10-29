# ============================================================
# app/main.py - Aplicación FastAPI Principal
# ============================================================
import os
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.audit import log_audit
from app.database import init_db, close_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    from app.scheduler import (
        notification_scan_loop,
        scrape_loop,
        favorite_email_flush_loop,
    )
    scan_task = asyncio.create_task(notification_scan_loop())
    scrape_task = asyncio.create_task(scrape_loop())
    email_flush_task = asyncio.create_task(favorite_email_flush_loop())

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
    email_flush_task.cancel()
    try:
        await email_flush_task
    except asyncio.CancelledError:
        pass
    await close_db()


ENABLE_DOCS = os.getenv("ENABLE_DOCS", "0").strip().lower() in ("1", "true", "yes")


def _cors_origins() -> list[str]:
    """Orígenes permitidos: el frontend propio + los que se declaren en CORS_ORIGINS."""
    origins = set()
    frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
    if frontend_url:
        origins.add(frontend_url)
    raw = os.getenv("CORS_ORIGINS", "")
    origins.update(o.strip().rstrip("/") for o in raw.split(",") if o.strip())
    # Desarrollo local
    origins.update({
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    })
    return sorted(origins)


def _allowed_hosts() -> list[str]:
    hosts = {"localhost", "127.0.0.1", "testserver"}
    frontend = os.getenv("FRONTEND_URL", "").strip()
    if frontend:
        host = urlparse(frontend).hostname
        if host:
            hosts.add(host)
    raw = os.getenv("ALLOWED_HOSTS", "")
    hosts.update(h.strip() for h in raw.split(",") if h.strip())
    return sorted(hosts)


app = FastAPI(
    title="MOOD API",
    description="API para explorá tu ciudad - Gestor de eventos",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

# CORS middleware: orígenes explícitos + credenciales para la cookie de refresh.
# Nunca usar allow_origins=["*"] junto con allow_credentials=True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=_allowed_hosts())


@app.middleware("http")
async def audit_mutations(request: Request, call_next):
    """Audita mutaciones de la API (las de auth ya se auditan explícitamente).

    Nginx elimina el prefijo /api antes de proxyear, así que contemplamos ambas
    formas para que funcione igual en local y en producción.
    """
    response = await call_next(request)
    path = request.url.path
    normalized = path[4:] if path.startswith("/api/") else path
    if (
        request.method in ("POST", "PUT", "PATCH", "DELETE")
        and not normalized.startswith("/auth/")
        and normalized not in ("/analytics/track", "/csp-report", "/gemini/chat")
    ):
        await log_audit(
            "http_mutation",
            request=request,
            actor_uid=getattr(request.state, "actor_uid", None),
            actor_email=getattr(request.state, "actor_email", None),
            target=path,
            success=response.status_code < 400,
            metadata={"method": request.method, "status": response.status_code},
        )
    return response

# Servir archivos subidos
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    # En CI el path por defecto puede no ser escribible.
    pass
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
from app.routes import reviews
app.include_router(reviews.router)
from app.routes import analytics
app.include_router(analytics.router)


@app.get("/")
async def root():
    payload = {"message": "MOOD API is running"}
    if ENABLE_DOCS:
        payload["docs"] = "/docs"
    return payload


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/csp-report", status_code=204)
async def csp_report(request: Request):
    """Recibe reportes CSP (Content-Security-Policy-Report-Only) y los loguea.

    No requiere auth: el navegador los envía sin credenciales. Nginx aplica un
    límite de tasa para evitar floods.
    """
    try:
        body = await request.body()
        if len(body) > 4096:
            return Response(status_code=204)
        payload = json.loads(body.decode("utf-8", errors="replace"))
        logger.warning("CSP report: %s", json.dumps(payload)[:2000])
    except Exception:
        logger.warning("CSP report inválido o vacío")
    return Response(status_code=204)
