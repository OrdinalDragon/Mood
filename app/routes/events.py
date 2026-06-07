# ============================================================
# app/routes/events.py - Endpoints de Eventos
# ============================================================
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Event, EventStatus, User
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.routes.auth import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/", response_model=List[EventListResponse])
def list_events(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    province: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    mood: Optional[str] = None,
    is_free: Optional[str] = None,
    is_outdoor: Optional[str] = None,
    today: Optional[str] = None,
    weekend: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: Optional[float] = 50
):
    """Lista eventos con filtros opcionales."""
    query = db.query(Event)
    
    if status_filter:
        try:
            status_enum = EventStatus(status_filter)
            query = query.filter(Event.status == status_enum)
        except:
            query = query.filter(Event.status == EventStatus.approved)
    else:
        query = query.filter(Event.status == EventStatus.approved)
    
    if is_free and is_free.lower() in ('true', '1'):
        query = query.filter(Event.is_free == True)
    
    if is_outdoor and is_outdoor.lower() in ('true', '1'):
        query = query.filter(Event.is_outdoor == True)
    
    if today and today.lower() in ('true', '1'):
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        query = query.filter(Event.date >= today_start, Event.date < today_end)
    
    if weekend and weekend.lower() in ('true', '1'):
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = today_start + timedelta(days=(6 - today_start.weekday()))
        week_start = week_end - timedelta(days=2)
        query = query.filter(Event.date >= week_start, Event.date < week_end + timedelta(days=1))
    
    events = query.order_by(Event.date.desc()).all()
    
    # Filtro por estado de ánimo (independiente de categoría)
    if mood:
        mood_lower = mood.lower().strip()
        events = [
            e for e in events 
            if e.moods and mood_lower in [m.lower() for m in e.moods]
        ]
    
    # Filtrar por categoría en Python
    if category:
        cat_lower = category.lower().strip()
        events = [
            e for e in events 
            if e.category and cat_lower in [c.lower() for c in e.category]
        ]
    
    # Filtrar por provincia
    if province and province.lower().strip() not in ['', 'todos']:
        province_clean = province.lower().strip()
        events = [
            e for e in events 
            if e.location and province_clean in e.location.get('province', '').lower().strip()
        ]
    
    # Filtrar por ciudad
    if city and city.lower().strip() not in ['', 'todos']:
        city_clean = city.lower().strip()
        events = [
            e for e in events 
            if e.location and city_clean in e.location.get('city', '').lower().strip()
        ]
    
    # Filtrar por cercanía (Haversine)
    if lat is not None and lng is not None:
        r = 6371
        lat_rad = math.radians(lat)
        lng_rad = math.radians(lng)
        events_filtered = []
        for e in events:
            if not e.location:
                continue
            e_lat = e.location.get('lat')
            e_lng = e.location.get('lng')
            if e_lat is None or e_lng is None:
                continue
            dlat = math.radians(e_lat) - lat_rad
            dlng = math.radians(e_lng) - lng_rad
            a = math.sin(dlat / 2)**2 + math.cos(lat_rad) * math.cos(math.radians(e_lat)) * math.sin(dlng / 2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            dist = r * c
            if dist <= (radius_km or 25):
                e._distance = round(dist, 1)
                events_filtered.append(e)
        events = events_filtered
        events.sort(key=lambda e: getattr(e, '_distance', 9999))

    # Búsqueda por texto
    if search:
        search_lower = search.lower().strip()
        events = [
            e for e in events 
            if search_lower in e.title.lower() or search_lower in (e.description or '').lower()
        ]
    
    # Incluir distance si existe
    result = []
    for e in events:
        d = {
            'id': e.id, 'title': e.title, 'date': e.date,
            'location': e.location, 'category': e.category,
            'moods': e.moods, 'cover_image': e.cover_image,
            'image_url': e.image_url,
            'is_free': e.is_free, 'is_outdoor': e.is_outdoor,
            'status': e.status.value if e.status else 'pending',
        }
        dist = getattr(e, '_distance', None)
        if dist is not None:
            d['distance'] = dist
        result.append(d)
    return result

@router.get("/counts")
def get_event_counts(db: Session = Depends(get_db)):
    """Devuelve counts reales: today, weekend, free, outdoor."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=(6 - today_start.weekday()))
    week_start = week_end - timedelta(days=2)

    all_approved = db.query(Event).filter(Event.status == EventStatus.approved).all()

    today_count = sum(1 for e in all_approved if today_start <= e.date < today_end)
    weekend_count = sum(1 for e in all_approved if week_start <= e.date < week_end + timedelta(days=1))
    free_count = sum(1 for e in all_approved if e.is_free)
    outdoor_count = sum(1 for e in all_approved if e.is_outdoor)

    return {
        "today": today_count,
        "weekend": weekend_count,
        "free": free_count,
        "outdoor": outdoor_count
    }

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Obtiene un evento por su ID."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event_create: EventCreate, db: Session = Depends(get_db)):
    """Crea un nuevo evento."""
    # Verificar o crear usuario anonymous
    anonymous_user = db.query(User).filter(User.uid == "anonymous").first()
    if not anonymous_user:
        anonymous_user = User(
            uid="anonymous",
            email="anonymous@mood.com",
            display_name="Usuario Anónimo",
            role="user",
            password_hash="",
            created_at=datetime.utcnow()
        )
        db.add(anonymous_user)
        db.commit()
    
    new_event = Event(
        id=event_create.title.lower().replace(" ", "-")[:36],
        title=event_create.title,
        description=event_create.description,
        date=event_create.date,
        location=event_create.location.model_dump(),
        category=[event_create.category.value],
        moods=event_create.moods,
        cover_image=event_create.cover_image,
        images=event_create.images,
        image_url=event_create.image_url,
        is_free=event_create.is_free,
        is_outdoor=event_create.is_outdoor,
        status=EventStatus.pending,
        created_by="anonymous",
        author_name="Usuario"
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event

@router.patch("/{event_id}/approve", response_model=EventResponse)
def approve_event(event_id: str, db: Session = Depends(get_db)):
    """Aprueba un evento."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = EventStatus.approved
    db.commit()
    db.refresh(event)
    return event

@router.patch("/{event_id}/reject", response_model=EventResponse)
def reject_event(event_id: str, db: Session = Depends(get_db)):
    """Rechaza un evento."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = EventStatus.rejected
    db.commit()
    db.refresh(event)
    return event

@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(event_id: str, db: Session = Depends(get_db)):
    """Elimina un evento."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(event)
    db.commit()

@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    event_update: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza un evento existente. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden editar eventos")
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = event_update.model_dump(exclude_unset=True)
    
    if 'title' in update_data and update_data['title']:
        event.title = update_data['title']
    if 'description' in update_data:
        event.description = update_data['description']
    if 'date' in update_data:
        event.date = update_data['date']
    if 'location' in update_data:
        event.location = update_data['location'].model_dump() if hasattr(update_data['location'], 'model_dump') else update_data['location']
    if 'category' in update_data:
        event.category = [update_data['category'].value] if hasattr(update_data['category'], 'value') else [update_data['category']]
    if 'moods' in update_data:
        event.moods = update_data['moods']
    if 'cover_image' in update_data:
        event.cover_image = update_data['cover_image']
    if 'images' in update_data:
        event.images = update_data['images']
    if 'image_url' in update_data:
        event.image_url = update_data['image_url']
    if 'is_free' in update_data:
        event.is_free = update_data['is_free']
    if 'is_outdoor' in update_data:
        event.is_outdoor = update_data['is_outdoor']
    
    db.commit()
    db.refresh(event)
    return event