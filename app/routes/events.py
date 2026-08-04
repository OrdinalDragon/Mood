# ============================================================
# app/routes/events.py - Endpoints de Eventos
# ============================================================
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from app.models import Event, User
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.routes.auth import get_current_user
from app.notifications_service import (
    sync_admin_pending_notifications,
    notify_event_status,
    cleanup_favorite_near_for_event,
)
from datetime import datetime, timedelta, timezone


async def get_current_user_optional(authorization: str = Header(None)):
    """Igual que get_current_user pero devuelve None si no hay token."""
    if not authorization:
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None

router = APIRouter(prefix="/events", tags=["Events"])

ARG_TZ = timezone(timedelta(hours=-3))

def arg_now():
    return datetime.now(ARG_TZ).replace(tzinfo=None)


@router.get("/", response_model=List[EventListResponse])
async def list_events(
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
    filters = []

    if status_filter:
        filters.append(Event.status == status_filter)
    else:
        filters.append(Event.status == "approved")

    if is_free and is_free.lower() in ('true', '1'):
        filters.append(Event.is_free == True)

    if is_outdoor and is_outdoor.lower() in ('true', '1'):
        filters.append(Event.is_outdoor == True)

    if today and today.lower() in ('true', '1'):
        now = arg_now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        filters.append(Event.date >= today_start)
        filters.append(Event.date < today_end)

    if weekend and weekend.lower() in ('true', '1'):
        now = arg_now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = today_start + timedelta(days=(6 - today_start.weekday()))
        week_start = week_end - timedelta(days=2)
        filters.append(Event.date >= week_start)
        filters.append(Event.date < week_end + timedelta(days=1))

    query = Event.find(*filters).sort("-date")
    events = await query.to_list()

    # Filtro por estado de ánimo
    if mood:
        mood_lower = mood.lower().strip()
        events = [
            e for e in events
            if e.moods and mood_lower in [m.lower() for m in e.moods]
        ]

    # Filtrar por categoría
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

    result = []
    for e in events:
        d = {
            'id': e.id, 'title': e.title, 'date': e.date, 'end_date': e.end_date,
            'location': e.location, 'category': e.category,
            'moods': e.moods, 'cover_image': e.cover_image,
            'images': e.images,
            'image_url': e.image_url,
            'is_free': e.is_free, 'is_outdoor': e.is_outdoor,
            'status': e.status,
        }
        dist = getattr(e, '_distance', None)
        if dist is not None:
            d['distance'] = dist
        result.append(d)
    return result


@router.get("/counts")
async def get_event_counts():
    """Devuelve counts reales: today, weekend, free, outdoor."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=(6 - today_start.weekday()))
    week_start = week_end - timedelta(days=2)

    all_approved = await Event.find(Event.status == "approved").to_list()

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


@router.get("/mine", response_model=List[EventListResponse])
async def get_my_events(current_user: User = Depends(get_current_user)):
    """Lista los eventos creados por el usuario autenticado."""
    events = await Event.find(Event.created_by == current_user.uid).sort("-date").to_list()
    return [
        {
            'id': e.id, 'title': e.title, 'date': e.date, 'end_date': e.end_date,
            'location': e.location, 'category': e.category,
            'moods': e.moods, 'cover_image': e.cover_image,
            'images': e.images,
            'image_url': e.image_url,
            'is_free': e.is_free, 'is_outdoor': e.is_outdoor,
            'status': e.status,
        }
        for e in events
    ]


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str):
    """Obtiene un evento por su ID."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    event_create: EventCreate,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Crea un nuevo evento."""
    anonymous_user = await User.find_one(User.uid == "anonymous")
    if not anonymous_user:
        anonymous_user = await User(
            uid="anonymous",
            email="anonymous@mood.com",
            display_name="Usuario Anónimo",
            role="user",
            password_hash="",
            created_at=datetime.utcnow()
        ).create()

    new_event = Event(
        id=event_create.title.lower().replace(" ", "-")[:36],
        title=event_create.title,
        description=event_create.description,
        date=event_create.date,
        end_date=event_create.end_date,
        location=event_create.location.model_dump(),
        category=[event_create.category.value],
        moods=event_create.moods,
        cover_image=event_create.cover_image,
        images=event_create.images,
        image_url=event_create.image_url,
        is_free=event_create.is_free,
        is_outdoor=event_create.is_outdoor,
        status="pending",
        created_by=current_user.uid if current_user else "anonymous",
        author_name=(current_user.display_name or "Usuario") if current_user else "Usuario Anónimo"
    )
    await new_event.create()
    await sync_admin_pending_notifications()
    return new_event


@router.patch("/{event_id}/approve", response_model=EventResponse)
async def approve_event(event_id: str):
    """Aprueba un evento."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = "approved"
    await event.save()
    await notify_event_status(event, "approved")
    await sync_admin_pending_notifications()
    return event


@router.patch("/{event_id}/reject", response_model=EventResponse)
async def reject_event(event_id: str):
    """Rechaza un evento."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    event.status = "rejected"
    await event.save()
    await notify_event_status(event, "rejected")
    await sync_admin_pending_notifications()
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: str):
    """Elimina un evento."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    await event.delete()
    await sync_admin_pending_notifications()
    await cleanup_favorite_near_for_event(event.id)


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str,
    event_update: EventUpdate,
    current_user: User = Depends(get_current_user)
):
    """Actualiza un evento existente. Solo admins."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Solo admins pueden editar eventos")
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    update_data = event_update.model_dump(exclude_unset=True)

    if 'title' in update_data and update_data['title']:
        event.title = update_data['title']
    if 'description' in update_data:
        event.description = update_data['description']
    if 'date' in update_data:
        event.date = update_data['date']
    if 'end_date' in update_data:
        event.end_date = update_data['end_date']
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

    await event.save()
    return event
