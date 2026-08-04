from fastapi import APIRouter, Depends, HTTPException, status
from app.models import Event, User
from app.routes.auth import get_current_user
from app.notifications_service import sync_favorite_near
from app.schemas import EventListResponse

router = APIRouter(prefix="/favorites", tags=["Favorites"])


@router.get("/")
async def list_favorites(current_user: User = Depends(get_current_user)):
    user = await User.find_one(User.uid == current_user.uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    event_ids = user.favorites or []
    events = []
    for eid in event_ids:
        e = await Event.find_one(Event.id == eid)
        if e:
            events.append(e)
    return [EventListResponse(
        id=e.id,
        title=e.title,
        date=e.date,
        location=e.location or {},
        category=e.category or [],
        moods=e.moods or [],
        cover_image=e.cover_image,
        image_url=e.image_url,
        is_free=e.is_free,
        is_outdoor=e.is_outdoor,
        status=e.status,
    ) for e in events if e.id in event_ids]


@router.post("/{event_id}")
async def add_favorite(event_id: str, current_user: User = Depends(get_current_user)):
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    user = await User.find_one(User.uid == current_user.uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if event_id not in (user.favorites or []):
        user.favorites = (user.favorites or []) + [event_id]
        await user.save()
    await sync_favorite_near(user)
    return {"message": "Evento agregado a favoritos", "favorites": user.favorites}


@router.delete("/{event_id}")
async def remove_favorite(event_id: str, current_user: User = Depends(get_current_user)):
    user = await User.find_one(User.uid == current_user.uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.favorites and event_id in user.favorites:
        user.favorites = [f for f in user.favorites if f != event_id]
        await user.save()
    await sync_favorite_near(user)
    return {"message": "Evento eliminado de favoritos", "favorites": user.favorites}
