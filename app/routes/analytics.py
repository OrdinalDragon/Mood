from fastapi import APIRouter, Request, HTTPException, Depends
from datetime import datetime, timedelta
from typing import List, Optional
import hashlib
import json
from beanie import PydanticObjectId
from app.models import AnalyticsEvent, User
from app.database import client
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Configuration
SALT = "mood_secret_salt_2024"  # Should ideally be in env
WHITELISTED_TYPES = ["page_view", "mood_select", "search", "event_view", "favorite", "review"]

async def get_current_admin(request: Request):
    user = await User.find_one(User.uid == request.state.user.uid)
    if not user or user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return user

@router.post("/track")
async def track_event(request: Request):
    try:
        data = await request.json()
        event_type = data.get("type")
        
        if event_type not in WHITELISTED_TYPES:
            return JSONResponse(content={"status": "ignored"}, status_code=200)

        # IP Handling
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        ip = x_forwarded_for.split(",")[0] if x_forwarded_for else request.client.host
        
        # Hash IP
        ip_hash = hashlib.sha256((ip + SALT).encode()).hexdigest()

        new_event = AnalyticsEvent(
            type=event_type,
            path=request.url.path,
            mood=data.get("mood"),
            user_id=data.get("user_id"),
            client_id=data.get("client_id"),
            ip_hash=ip_hash,
            referrer=request.headers.get("Referer"),
            user_agent=request.headers.get("User-Agent"),
            created_at=datetime.utcnow()
        )
        await new_event.insert()
        return JSONResponse(content={"status": "ok"}, status_code=201)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)

@router.get("/summary")
async def get_summary(days: int = 30, user: User = Depends(get_current_admin)):
    now = datetime.utcnow()
    start_date = now - timedelta(days=days)
    
    # Fetch all events for the period
    events = await AnalyticsEvent.find(
        AnalyticsEvent.created_at >= start_date
    ).to_list()

    # Complex Aggregations
    summary = {
        "traffic": {
            "views_by_day": {},
            "unique_clients_by_day": {},
            "hourly_picos": {},
            "weekday_stats": {},
            "top_pages": {},
            "mobile_vs_desktop": {"mobile": 0, "desktop": 0}
        },
        "moods": {},
        "events": {
            "by_status": {},
            "by_category": {},
            "by_province": {},
            "by_mood": {},
            "next_7d": [],
            "next_30d": [],
            "top_favorites": [],
            "top_rated": []
        },
        "users": {
            "total": 0,
            "new_this_month": 0,
            "by_provider": {}
        },
        "engagement": {
            "reviews": 0,
            "favorites": 0,
            "claims": 0
        }
    }

    for e in events:
        # Traffic
        dt = e.created_at
        day_str = dt.strftime("%Y-%m-%d")
        hour_str = dt.strftime("%H")
        weekday_str = dt.strftime("%A")
        
        summary["traffic"]["views_by_day"][day_str] = summary["traffic"]["views_by_day"].get(day_str, 0) + 1
        
        if e.client_id:
            summary["traffic"]["unique_clients_by_day"][day_str] = summary["traffic"]["unique_clients_by_day"].get(day_str, 0) + 1
            
        summary["traffic"]["hourly_picos"][hour_str] = summary["traffic"]["hourly_picos"].get(hour_str, 0) + 1
        summary["traffic"]["weekday_stats"][weekday_str] = summary["traffic"]["weekday_stats"].get(weekday_str, 0) + 1
        
        if e.path:
            summary["traffic"]["top_pages"][e.path] = summary["traffic"]["top_pages"].get(e.path, 0) + 1
            
        if "Mobile" in e.user_agent:
            summary["traffic"]["mobile_vs_desktop"]["mobile"] += 1
        else:
            summary["traffic"]["mobile_vs_desktop"]["desktop"] += 1

        # Moods
        if e.mood:
            summary["moods"][e.mood] = summary["moods"].get(e.mood, 0) + 1

        # Events (Simplified for now, will refine based on actual data models)
        if e.type == "event_view":
            summary["events"]["by_status"][e.mood] = summary["events"]["by_status"].get(e.mood, 0) + 1 # Using mood as dummy for status if needed
            
        # Engagement
        if e.type == "review":
            summary["engagement"]["reviews"] += 1
        elif e.type == "favorite":
            summary["engagement"]["favorites"] += 1
        elif e.type == "claim": # Check if 'claim' is a valid type
            summary["engagement"]["claims"] += 1

    # Users
    unique_users = set()
    for e in events:
        if e.user_id:
            unique_users.add(e.user_id)
    summary["users"]["total"] = len(unique_users)

    return summary
