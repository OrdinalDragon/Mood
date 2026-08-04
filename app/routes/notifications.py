# ============================================================
# app/routes/notifications.py - Endpoints de Notificaciones
# ============================================================
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models import Notification, User
from app.schemas import NotificationResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(current_user: User = Depends(get_current_user)):
    """Lista las notificaciones del usuario (máx. 10, no leídas primero)."""
    notifications = await Notification.find(
        Notification.user_id == current_user.uid
    ).sort("read", "-created_at").limit(10).to_list()
    return notifications


@router.get("/unread-count")
async def unread_count(current_user: User = Depends(get_current_user)):
    count = await Notification.find(
        Notification.user_id == current_user.uid,
        Notification.read == False,
    ).count()
    return {"unread_count": count}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(notification_id: str, current_user: User = Depends(get_current_user)):
    notification = await Notification.find_one(Notification.id == notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    if notification.user_id != current_user.uid:
        raise HTTPException(status_code=403, detail="No podés acceder a esta notificación")
    if not notification.read:
        notification.read = True
        await notification.save()
    return notification


@router.patch("/read-all")
async def mark_all_read(current_user: User = Depends(get_current_user)):
    await Notification.find(
        Notification.user_id == current_user.uid,
        Notification.read == False,
    ).update({"$set": {"read": True}})
    return {"message": "Todas las notificaciones marcadas como leídas"}
