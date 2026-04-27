# ============================================================
# app/main.py - Aplicación FastAPI Principal
# ============================================================
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import events

# Crear las tablas si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MOOD API",
    description="API para explorá tu ciudad - Gestor de eventos",
    version="1.0.0"
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
def root():
    return {"message": "MOOD API is running", "docs": "/docs"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}