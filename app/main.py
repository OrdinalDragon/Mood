# ============================================================
# app/main.py - Aplicación FastAPI Principal
# ============================================================
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title="MOOD API",
    description="API para explorá tu ciudad - Gestor de eventos",
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


@app.get("/")
async def root():
    return {"message": "MOOD API is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
