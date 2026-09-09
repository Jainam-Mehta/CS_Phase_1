"""
Alerts API — ColdSense Backend

Uses the real `alerts` schema:
  id, room_id, farmer_id, alert_type, severity, title, description,
  is_read, status, updated_at, created_at

The `door_readings` table does not exist — door alert generation now
reads from `door_events` (room_id, event_type, occurred_at, duration_seconds).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    room_id: str
    farmer_id: Optional[str] = None
    alert_type: Optional[str] = None
    severity: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    is_read: Optional[bool] = False
    status: Optional[str] = "Unresolved"
    created_at: Optional[str] = None


class AlertCreate(BaseModel):
    room_id: str
    farmer_id: Optional[str] = None
    alert_type: str
    severity: str          # 'critical' | 'warning' | 'info'
    title: str
    description: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[AlertResponse])
async def get_all_alerts():
    try:
        resp = supabase.table("alerts").select("*").order("created_at", desc=True).execute()
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {e}")


@router.get("/room/{room_id}", response_model=List[AlertResponse])
async def get_room_alerts(room_id: str):
    try:
        resp = (
            supabase.table("alerts")
            .select("*")
            .eq("room_id", room_id)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room alerts: {e}")


@router.get("/unread/{room_id}", response_model=List[AlertResponse])
async def get_unread_alerts(room_id: str):
    """Return unread alerts for a room (what the farmer dashboard shows)."""
    try:
        resp = (
            supabase.table("alerts")
            .select("*")
            .eq("room_id", room_id)
            .eq("is_read", False)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch unread alerts: {e}")


@router.post("/", response_model=AlertResponse)
async def create_alert(alert: AlertCreate):
    try:
        data = alert.model_dump() if hasattr(alert, "model_dump") else alert.dict()
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_read"] = False
        data["status"] = "Unresolved"

        resp = supabase.table("alerts").insert(data).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {e}")


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    try:
        resp = (
            supabase.table("alerts")
            .update({"is_read": True, "status": "Acknowledged", "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", alert_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"message": "Alert acknowledged"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {e}")


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    try:
        resp = (
            supabase.table("alerts")
            .update({"status": "Resolved", "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", alert_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        return {"message": "Alert resolved"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {e}")


@router.post("/check-door-alerts/{room_id}")
async def check_door_alerts(room_id: str):
    """
    Check today's door events for this room and generate alerts if thresholds are exceeded.
    Reads from `door_events` (the real table) — NOT the nonexistent `door_readings`.
    """
    try:
        today = datetime.now(timezone.utc).date().isoformat()

        # Get today's door events for this room
        resp = (
            supabase.table("door_events")
            .select("event_type, duration_seconds, occurred_at")
            .eq("room_id", room_id)
            .gte("occurred_at", f"{today}T00:00:00+00:00")
            .order("occurred_at", desc=True)
            .execute()
        )

        events = resp.data or []
        total_seconds = sum(
            (e.get("duration_seconds") or 0)
            for e in events
            if e.get("event_type", "").lower() in ("open", "opened")
        )
        total_minutes = total_seconds / 60

        if total_minutes > 20:
            await create_alert(AlertCreate(
                room_id=room_id,
                alert_type="door_critical",
                severity="critical",
                title="Door Open — Critical",
                description=f"Door has been open for {total_minutes:.1f} minutes today. Immediate action required.",
            ))
        elif total_minutes > 10:
            await create_alert(AlertCreate(
                room_id=room_id,
                alert_type="door_warning",
                severity="warning",
                title="Door Open — Warning",
                description=f"Door has been open for {total_minutes:.1f} minutes today. Please close the door.",
            ))

        return {"message": "Door alerts checked", "total_open_minutes": round(total_minutes, 2)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check door alerts: {e}")
