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


@router.get("/averages/room/{room_id}")
async def get_room_sensor_averages(room_id: str, minutes: int = Query(5, ge=1, le=1440)):
    """
    Get temperature and humidity averages for a room from all sensors.
    
    This calculates averages from the last N minutes of readings in cold_storage_conditions
    grouped by sensor type. Useful for dashboard display.
    
    Returns:
    - avg_temperature: Average of all temperature readings
    - avg_humidity: Average of all humidity readings
    - temp_sensor_count: Number of temperature sensors with data
    - humidity_sensor_count: Number of humidity sensors with data
    - latest_reading_time: Timestamp of the most recent reading
    """
    try:
        from datetime import datetime, timedelta, timezone
        
        # Calculate time threshold
        cutoff_time = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
        
        # Query cold_storage_conditions for temperature readings in the last N minutes
        temp_resp = (
            supabase.table("cold_storage_conditions")
            .select("temperature, slave_id, recorded_at")
            .eq("room_id", room_id)
            .not_("temperature", "is", None)
            .gte("recorded_at", cutoff_time)
            .order("recorded_at", descending=True)
            .execute()
        )
        
        # Query humidity readings
        humidity_resp = (
            supabase.table("cold_storage_conditions")
            .select("humidity, slave_id, recorded_at")
            .eq("room_id", room_id)
            .not_("humidity", "is", None)
            .gte("recorded_at", cutoff_time)
            .order("recorded_at", descending=True)
            .execute()
        )
        
        temp_data = temp_resp.data or []
        humidity_data = humidity_resp.data or []
        
        # Calculate averages
        avg_temperature = None
        avg_humidity = None
        latest_reading_time = None
        
        if temp_data:
            temps = [float(t["temperature"]) for t in temp_data if t["temperature"] is not None]
            if temps:
                avg_temperature = sum(temps) / len(temps)
                latest_reading_time = temp_data[0]["recorded_at"]
        
        if humidity_data:
            humidities = [float(h["humidity"]) for h in humidity_data if h["humidity"] is not None]
            if humidities:
                avg_humidity = sum(humidities) / len(humidities)
                if not latest_reading_time or humidity_data[0]["recorded_at"] > latest_reading_time:
                    latest_reading_time = humidity_data[0]["recorded_at"]
        
        # Count unique sensors
        unique_temp_sensors = len(set(t["slave_id"] for t in temp_data if t["slave_id"] is not None))
        unique_humidity_sensors = len(set(h["slave_id"] for h in humidity_data if h["slave_id"] is not None))
        
        return {
            "room_id": room_id,
            "avg_temperature": round(avg_temperature, 2) if avg_temperature else None,
            "avg_humidity": round(avg_humidity, 2) if avg_humidity else None,
            "temp_sensor_count": unique_temp_sensors,
            "humidity_sensor_count": unique_humidity_sensors,
            "latest_reading_time": latest_reading_time,
            "time_window_minutes": minutes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate averages for room {room_id}: {str(e)}")
