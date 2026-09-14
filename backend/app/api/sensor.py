"""
Sensor API Router — ColdSense Backend
Endpoints for sensor registration, device status, and telemetry history.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone

from app.database.supabase import supabase

router = APIRouter()


class SensorDeviceResponse(BaseModel):
    id: str
    room_id: str
    sensor_type: str
    sensor_name: Optional[str] = None
    sensor_code: Optional[str] = None
    status: Optional[str] = "Online"
    last_reading_value: Optional[float] = None
    last_reading_unit: Optional[str] = None
    last_seen: Optional[str] = None


@router.get("/room/{room_id}", response_model=List[SensorDeviceResponse])
async def get_room_sensors(room_id: str):
    """Fetch all registered sensor devices for a given room."""
    try:
        resp = (
            supabase.table("sensor_devices")
            .select("*")
            .eq("room_id", room_id)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sensors for room {room_id}: {e}")


@router.get("/readings/{sensor_id}")
async def get_sensor_readings(sensor_id: str, limit: int = Query(50, le=500)):
    """Fetch telemetry history for a specific room sensor."""
    try:
        resp = (
            supabase.table("sensor_readings")
            .select("*")
            .eq("room_sensor_id", sensor_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        return resp.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch readings for sensor {sensor_id}: {e}")
