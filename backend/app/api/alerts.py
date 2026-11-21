"""
Alerts API — ColdSense Backend

Uses the real `sensor_alerts` schema:
  id, room_id, alert_type, severity, title, description, sensor_type, sensor_number,
  current_value, min_value, max_value, status, acknowledged, created_at, updated_at

FEATURES:
- Feature 1: Auto Sensor Alerts (read-only access)
- Feature 2: Auto Door Alerts (read-only access)
- Feature 3: Acknowledge Alerts with UI button + permission checks
- Feature 4: Permission enforcement (farmer can only access own rooms)
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class AlertResponse(BaseModel):
    id: str
    room_id: str
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    sensor_type: Optional[str] = None
    sensor_number: Optional[int] = None
    current_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    status: str
    acknowledged: bool
    created_at: str
    updated_at: Optional[str] = None


class AlertCreate(BaseModel):
    room_id: str
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    sensor_type: Optional[str] = None
    sensor_number: Optional[int] = None
    current_value: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None


# ── Helper functions ──────────────────────────────────────────────────────────

def _get_farmer_rooms(farmer_id: str) -> List[str]:
    """
    FEATURE 4: Get all room IDs that a farmer owns/manages.
    Used for permission checks. Uses farmer_room_access table for many-to-many relationship.
    """
    try:
        resp = supabase.table("farmer_room_access").select("room_id").eq("farmer_id", farmer_id).execute()
        return [r["room_id"] for r in resp.data] if resp.data else []
    except Exception as e:
        print(f"Warning: Failed to get farmer rooms: {e}")
        return []


def _verify_room_access(room_id: str, farmer_id: str) -> bool:
    """
    FEATURE 4: Verify farmer has access to room before returning alerts.
    Safety: Prevents farmers from viewing other farmers' alert data.
    """
    try:
        resp = supabase.table("farmer_room_access").select("id").eq("room_id", room_id).eq("farmer_id", farmer_id).execute()
        return bool(resp.data)
    except Exception:
        return False


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[AlertResponse])
async def get_all_alerts():
    """Get all alerts (admin/system view)."""
    try:
        resp = supabase.table("sensor_alerts").select("*").order("created_at", desc=True).execute()
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch alerts: {e}")


@router.get("/room/{room_id}", response_model=List[AlertResponse])
async def get_room_alerts(room_id: str, farmer_id: Optional[str] = None):
    """
    Get alerts for a room.
    FEATURE 4: If farmer_id provided, verify access before returning.
    """
    try:
        # Permission check: If farmer_id provided, verify they own this room
        if farmer_id:
            if not _verify_room_access(room_id, farmer_id):
                raise HTTPException(status_code=403, detail="Access denied: Not your room")
        
        resp = (
            supabase.table("sensor_alerts")
            .select("*")
            .eq("room_id", room_id)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch room alerts: {e}")


@router.get("/unread/{room_id}", response_model=List[AlertResponse])
async def get_unread_alerts(room_id: str, farmer_id: Optional[str] = None):
    """
    Get unread alerts for a room (what the farmer dashboard shows).
    FEATURE 4: Permission check included.
    """
    try:
        if farmer_id:
            if not _verify_room_access(room_id, farmer_id):
                raise HTTPException(status_code=403, detail="Access denied: Not your room")
        
        resp = (
            supabase.table("sensor_alerts")
            .select("*")
            .eq("room_id", room_id)
            .eq("acknowledged", False)
            .order("created_at", desc=True)
            .execute()
        )
        return resp.data or []
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch unread alerts: {e}")


@router.get("/farmer/{farmer_id}", response_model=List[AlertResponse])
async def get_farmer_alerts(farmer_id: str):
    """
    FEATURE 4: Get all alerts for farmer (visible to both farmer and owner).
    Returns alerts where:
    1. farmer_id matches (farmer stored product)
    2. owner_id matches (owner owns the facility)
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[ALERTS] GET /farmer/{farmer_id} called")
    
    try:
        logger.info(f"[ALERTS] Querying alerts for farmer_id={farmer_id}")
        
        # Get alerts where farmer_id or owner_id matches
        resp = (
            supabase.table("sensor_alerts")
            .select("*")
            .or_(f"farmer_id.eq.{farmer_id},owner_id.eq.{farmer_id}")
            .order("created_at", desc=True)
            .execute()
        )
        logger.info(f"[ALERTS] Query returned {len(resp.data or [])} alerts for farmer/owner {farmer_id}")
        return resp.data or []
    except Exception as e:
        import traceback
        logger.error(f"[ALERTS] Exception in get_farmer_alerts: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to fetch farmer alerts: {e}")


@router.post("/", response_model=AlertResponse)
async def create_alert(alert: AlertCreate):
    """Create a new alert."""
    try:
        data = alert.model_dump() if hasattr(alert, "model_dump") else alert.dict()
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        data["status"] = "active"
        data["acknowledged"] = False

        resp = supabase.table("sensor_alerts").insert(data).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Insert returned no data")
        return resp.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create alert: {e}")


@router.put("/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, farmer_id: Optional[str] = None):
    """
    FEATURE 3: Acknowledge alert (mark as read).
    FEATURE 4: Verify farmer owns the room containing this alert.
    
    Used by: Frontend AlertCard "Acknowledge" button
    """
    try:
        # Step 1: Fetch the alert to get room_id
        resp = supabase.table("sensor_alerts").select("room_id").eq("id", alert_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        room_id = resp.data[0]["room_id"]
        
        # Step 2: FEATURE 4 — Verify access
        if farmer_id:
            if not _verify_room_access(room_id, farmer_id):
                raise HTTPException(status_code=403, detail="Access denied: Cannot acknowledge other farmer's alert")
        
        # Step 3: Update alert
        update_resp = (
            supabase.table("sensor_alerts")
            .update({
                "acknowledged": True,
                "status": "acknowledged",
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("id", alert_id)
            .execute()
        )
        
        if not update_resp.data:
            raise HTTPException(status_code=500, detail="Failed to update alert")
        
        return {"message": "Alert acknowledged", "alert_id": alert_id, "status": "acknowledged"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {e}")


@router.put("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, farmer_id: Optional[str] = None):
    """
    Resolve an alert (mark issue as fixed).
    FEATURE 4: Verify access.
    """
    try:
        resp = supabase.table("sensor_alerts").select("room_id").eq("id", alert_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        room_id = resp.data[0]["room_id"]
        
        if farmer_id:
            if not _verify_room_access(room_id, farmer_id):
                raise HTTPException(status_code=403, detail="Access denied")
        
        update_resp = (
            supabase.table("sensor_alerts")
            .update({
                "status": "resolved",
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
            .eq("id", alert_id)
            .execute()
        )
        
        if not update_resp.data:
            raise HTTPException(status_code=500, detail="Failed to update alert")
        
        return {"message": "Alert resolved", "alert_id": alert_id, "status": "resolved"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve alert: {e}")
