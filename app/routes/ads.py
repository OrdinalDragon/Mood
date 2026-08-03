# ============================================================
# app/routes/ads.py - Endpoints de Anuncios Publicitarios
# ============================================================
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.models import Ad, User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/ads", tags=["Ads"])


class AdCreate(BaseModel):
    title: str
    badge: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    image: Optional[str] = None
    active: bool = True
    order: int = 0


class AdUpdate(BaseModel):
    title: Optional[str] = None
    badge: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    date: Optional[datetime] = None
    location: Optional[str] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    image: Optional[str] = None
    active: Optional[bool] = None
    order: Optional[int] = None


@router.get("/")
async def list_ads():
    """Lista todos los anuncios activos, ordenados por `order`."""
    ads = await Ad.find(Ad.active == True).sort(Ad.order).to_list()
    return [
        {
            "id": a.id,
            "title": a.title,
            "badge": a.badge,
            "subtitle": a.subtitle,
            "description": a.description,
            "date": a.date,
            "location": a.location,
            "cta_text": a.cta_text,
            "cta_link": a.cta_link,
            "image": a.image,
            "active": a.active,
            "order": a.order,
        }
        for a in ads
    ]


@router.get("/admin")
async def list_all_ads(current_user: User = Depends(get_current_user)):
    """Lista todos los anuncios (incluye inactivos). Solo admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    ads = await Ad.find_all().sort(Ad.order).to_list()
    return [
        {
            "id": a.id,
            "title": a.title,
            "badge": a.badge,
            "subtitle": a.subtitle,
            "description": a.description,
            "date": a.date,
            "location": a.location,
            "cta_text": a.cta_text,
            "cta_link": a.cta_link,
            "image": a.image,
            "active": a.active,
            "order": a.order,
        }
        for a in ads
    ]


def _slugify(text: str) -> str:
    return text.lower().replace(" ", "-")[:36]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_ad(data: AdCreate, current_user: User = Depends(get_current_user)):
    """Crea un anuncio. Solo admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    ad_id = data.title.lower().replace(" ", "-")[:36]
    existing = await Ad.find_one(Ad.id == ad_id)
    if existing:
        ad_id = f"{ad_id}-{int(datetime.utcnow().timestamp())}"
    ad = Ad(
        id=ad_id,
        badge=data.badge,
        title=data.title,
        subtitle=data.subtitle,
        description=data.description,
        date=data.date,
        location=data.location,
        cta_text=data.cta_text,
        cta_link=data.cta_link,
        image=data.image,
        active=data.active,
        order=data.order,
    )
    await ad.create()
    return {"message": "Anuncio creado", "id": ad_id}


@router.put("/{ad_id}")
async def update_ad(ad_id: str, data: AdUpdate, current_user: User = Depends(get_current_user)):
    """Actualiza un anuncio. Solo admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    ad = await Ad.find_one(Ad.id == ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "date" and value is None:
            ad.date = None
        elif value is not None:
            setattr(ad, field, value)
    await ad.save()
    return {"message": "Anuncio actualizado", "id": ad_id}


@router.delete("/{ad_id}")
async def delete_ad(ad_id: str, current_user: User = Depends(get_current_user)):
    """Elimina un anuncio. Solo admin."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    ad = await Ad.find_one(Ad.id == ad_id)
    if not ad:
        raise HTTPException(status_code=404, detail="Anuncio no encontrado")
    await ad.delete()
    return {"message": "Anuncio eliminado", "id": ad_id}
