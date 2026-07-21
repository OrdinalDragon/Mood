# ============================================================
# app/routes/events.py - Endpoints de Eventos
# ============================================================
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from app.models import Event
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/", response_model=List[EventListResponse])
async def list_events(
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    province: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None
):
    """Lista eventos con filtros opcionales."""
    filters = []

    if status_filter:
        filters.append(Event.status == status_filter)
    else:
        filters.append(Event.status == "approved")

    query = Event.find(*filters).sort("-date")
    events = await query.to_list()

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
async def get_event(event_id: str):
    """Obtiene un evento por su ID."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(event_create: EventCreate):
    """Crea un nuevo evento."""
    new_event = Event(
        id=event_create.title.lower().replace(" ", "-")[:36],
        title=event_create.title,
        description=event_create.description,
        date=event_create.date,
        location=event_create.location.model_dump(),
        category=[event_create.category.value],
        status="pending",
        created_by="anonymous",
        author_name="Usuario"
    )
    await new_event.create()
    return new_event


@router.patch("/{event_id}/approve", response_model=EventResponse)
async def approve_event(event_id: str):
    """Aprueba un evento."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = "approved"
    await event.save()
    return event
