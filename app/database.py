# ============================================================
# app/database.py - Conexión a Base de Datos
# ============================================================
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# URL de conexión a MariaDB
DB_HOST = os.getenv("DB_HOST", "db")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "mood_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "mood_password")
DB_NAME = os.getenv("DB_NAME", "mood_db")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Engine de SQLAlchemy
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# SessionLocal
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para modelos
Base = declarative_base()

def get_db():
    """Dependency: obtener sesión de base de datos."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()