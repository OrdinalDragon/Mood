# ============================================================
# app/routes/events.py - Endpoints de Eventos
# ============================================================
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Event, EventStatus
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse

router = APIRouter(prefix="/events", tags=["Events"])

@router.get("/", response_model=List[EventListResponse])
def list_events(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    province: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None
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
    
    events = query.order_by(Event.date.desc()).all()
    
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
    
    # Búsqueda por texto
    if search:
        search_lower = search.lower().strip()
        events = [
            e for e in events 
            if search_lower in e.title.lower() or search_lower in (e.description or '').lower()
        ]
    
    return events

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
    new_event = Event(
        id=event_create.title.lower().replace(" ", "-")[:36],
        title=event_create.title,
        description=event_create.description,
        date=event_create.date,
        location=event_create.location.model_dump(),
        category=[event_create.category.value],
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