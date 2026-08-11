# ============================================================
# app/routes/reviews.py - Valoraciones y Comentarios
# ============================================================
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import Review, Event, User
from app.schemas import (
    ReviewCreate,
    ReviewReply,
    ReviewResponse,
    UserRatingResponse,
)
from app.routes.auth import get_current_user
from app.notifications_service import create_notification
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["Reviews"])

ADMIN_ROLES = ("admin", "moderator")


async def get_rating_map(event_ids):
    """Devuelve {event_id: {'avg': float, 'count': int}} para los eventos dados."""
    ids = list(set(event_ids))
    if not ids:
        return {}
    reviews = await Review.find({"event_id": {"$in": ids}}).to_list()
    acc = {}
    for r in reviews:
        entry = acc.setdefault(r.event_id, {"total": 0, "count": 0})
        entry["total"] += r.rating or 0
        entry["count"] += 1
    result = {}
    for eid, entry in acc.items():
        result[eid] = {
            "avg": round(entry["total"] / entry["count"], 1),
            "count": entry["count"],
        }
    return result


def review_dict(r: Review, include_event: bool = False, event: Event = None):
    d = {
        'id': r.id,
        'event_id': r.event_id,
        'user_id': r.user_id,
        'author_name': r.author_name,
        'author_photo': r.author_photo,
        'rating': r.rating,
        'comment': r.comment,
        'reply': r.reply,
        'replied_by': r.replied_by,
        'replied_by_name': r.replied_by_name,
        'replied_at': r.replied_at,
        'created_at': r.created_at,
        'updated_at': r.updated_at,
    }
    if include_event and event:
        d['event'] = {
            'id': event.id,
            'title': event.title,
            'date': event.date,
            'image_url': event.image_url,
            'cover_image': event.cover_image,
        }
    return d


async def build_event_join(event_id: str):
    event = await Event.find_one(Event.id == event_id)
    if not event:
        return None
    return {
        'id': event.id,
        'title': event.title,
        'date': event.date,
        'image_url': event.image_url,
        'cover_image': event.cover_image,
    }


@router.post("/{event_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    event_id: str,
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
):
    """Crea o actualiza la valoración del usuario autenticado para un evento.

    Un usuario solo puede tener una valoración por evento; si ya existe, se actualiza.
    """
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    if event.status not in ("approved", "archived"):
        raise HTTPException(status_code=400, detail="Solo podés valorar eventos aprobados o concluidos")
    if data.rating < 1 or data.rating > 10:
        raise HTTPException(status_code=400, detail="La puntuación debe estar entre 1 y 10")
    if data.comment and len(data.comment.strip()) > 2000:
        raise HTTPException(status_code=400, detail="El comentario es demasiado largo")

    existing = await Review.find_one(
        Review.event_id == event_id,
        Review.user_id == current_user.uid,
    )
    now = datetime.utcnow()
    is_new = existing is None

    if existing:
        existing.rating = data.rating
        existing.comment = data.comment.strip() if data.comment else None
        existing.updated_at = now
        await existing.save()
        review = existing
    else:
        review = await Review(
            id=str(uuid.uuid4()),
            event_id=event_id,
            user_id=current_user.uid,
            author_name=current_user.display_name or current_user.email.split("@")[0],
            author_photo=current_user.photo_url,
            rating=data.rating,
            comment=data.comment.strip() if data.comment else None,
            created_at=now,
            updated_at=now,
        ).create()

    # Notificar al creador del evento (no se auto-notifica)
    if is_new and event.created_by and event.created_by != current_user.uid:
        await create_notification(
            event.created_by,
            "new_review",
            "Nueva valoración",
            f"«{review.author_name}» valoró tu evento «{event.title}» con {review.rating}/10.",
            link=f"/event/{event.id}",
            event_id=event.id,
        )

    return review_dict(review)


@router.get("/event/{event_id}", response_model=List[ReviewResponse])
async def get_event_reviews(event_id: str):
    """Lista las valoraciones de un evento (público)."""
    event = await Event.find_one(Event.id == event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    reviews = await Review.find(Review.event_id == event_id).sort("-created_at").to_list()
    return [review_dict(r) for r in reviews]


@router.get("/mine", response_model=List[ReviewResponse])
async def get_my_reviews(current_user: User = Depends(get_current_user)):
    """Valoraciones del usuario autenticado, con datos del evento."""
    reviews = await Review.find(Review.user_id == current_user.uid).sort("-created_at").to_list()
    result = []
    for r in reviews:
        result.append(review_dict(r, include_event=True, event=await Event.find_one(Event.id == r.event_id)))
    return result


@router.get("/creator", response_model=List[ReviewResponse])
async def get_creator_reviews(current_user: User = Depends(get_current_user)):
    """Valoraciones recibidas en los eventos del usuario autenticado (organizador)."""
    events = await Event.find(Event.created_by == current_user.uid).to_list()
    event_ids = [e.id for e in events]
    if not event_ids:
        return []
    reviews = await Review.find({"event_id": {"$in": event_ids}}).sort("-created_at").to_list()
    events_by_id = {e.id: e for e in events}
    return [review_dict(r, include_event=True, event=events_by_id.get(r.event_id)) for r in reviews]


@router.get("/user/{user_id}/rating", response_model=UserRatingResponse)
async def get_user_rating(user_id: str):
    """Puntuación general de un organizador: promedio de todas sus valoraciones."""
    events = await Event.find(Event.created_by == user_id).to_list()
    if not events:
        return {"user_id": user_id, "avg_rating": None, "rating_count": 0}
    rmap = await get_rating_map([e.id for e in events])
    counts = [v["count"] for v in rmap.values()]
    total_count = sum(counts)
    if total_count == 0:
        return {"user_id": user_id, "avg_rating": None, "rating_count": 0}
    total = sum(v["avg"] * v["count"] for v in rmap.values())
    return {"user_id": user_id, "avg_rating": round(total / total_count, 1), "rating_count": total_count}


@router.patch("/{review_id}/reply", response_model=ReviewResponse)
async def reply_review(
    review_id: str,
    data: ReviewReply,
    current_user: User = Depends(get_current_user),
):
    """Responde una valoración. Solo el creador del evento o admins/moderadores."""
    review = await Review.find_one(Review.id == review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Valoración no encontrada")
    event = await Event.find_one(Event.id == review.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    is_creator = event.created_by == current_user.uid
    is_admin = current_user.role in ADMIN_ROLES
    if not is_creator and not is_admin:
        raise HTTPException(status_code=403, detail="Solo el organizador del evento o los admins pueden responder")

    reply_text = data.reply.strip()
    if not reply_text:
        raise HTTPException(status_code=400, detail="La respuesta no puede estar vacía")
    if len(reply_text) > 2000:
        raise HTTPException(status_code=400, detail="La respuesta es demasiado larga")

    review.reply = reply_text
    review.replied_by = current_user.uid
    review.replied_by_name = current_user.display_name or current_user.email.split("@")[0]
    review.replied_at = datetime.utcnow()
    review.updated_at = datetime.utcnow()
    await review.save()

    if review.user_id and review.user_id != current_user.uid:
        await create_notification(
            review.user_id,
            "review_reply",
            "Te respondieron",
            f"El organizador respondió tu valoración en «{event.title}».",
            link=f"/event/{event.id}",
            event_id=event.id,
        )

    return review_dict(review)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(review_id: str, current_user: User = Depends(get_current_user)):
    """Elimina una valoración. Solo el autor o admins/moderadores."""
    review = await Review.find_one(Review.id == review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Valoración no encontrada")
    if review.user_id != current_user.uid and current_user.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="No podés eliminar esta valoración")
    await review.delete()
    return None
