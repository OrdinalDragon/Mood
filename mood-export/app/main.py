# ============================================================
# app/main.py - Aplicación FastAPI Principal
# ============================================================
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, close_db
from app.routes import events


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

# Incluir routers
app.include_router(events.router)


@app.get("/")
async def root():
    return {"message": "MOOD API is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
