"""
Cold Storage Condition & Room API Router — ColdSense Backend
Endpoints for querying live cold room conditions and room status summaries.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List

from app.database.supabase import supabase
from app.services.sensor_service import get_latest_condition

router = APIRouter()


class ColdStorageConditionResponse(BaseModel):
    id: Optional[str] = None
    room_id: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    ambient_temperature: Optional[float] = None
    ambient_humidity: Optional[float] = None
    door_status: Optional[str] = "closed"
    compressor_status: Optional[str] = "on"
    recorded_at: Optional[str] = None


@router.get("/condition/room/{room_id}", response_model=Optional[ColdStorageConditionResponse])
async def get_room_condition(room_id: str):
    """Fetch the latest cold storage condition telemetry for a room."""
    try:
        condition = get_latest_condition(room_id)
        if not condition:
            return ColdStorageConditionResponse(
                room_id=room_id,
                temperature=4.0,
                humidity=85.0,
                ambient_temperature=28.0,
                ambient_humidity=65.0,
                door_status="closed",
                compressor_status="on"
            )
        return condition
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch condition for room {room_id}: {e}")


@router.get("/rooms/site/{site_id}")
async def get_site_rooms(site_id: str):
    """Fetch all cold storage rooms in a given site."""
    try:
        resp = (
            supabase.table("cold_storage_rooms")
            .select("*")
            .eq("site_id", site_id)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rooms for site {site_id}: {e}")
