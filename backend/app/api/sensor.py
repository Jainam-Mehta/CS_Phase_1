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


class GCPSensorData(BaseModel):
    """Model for receiving sensor data from GCP gateway"""
    gateway_id: str  # The GCP gateway ID
    sensor_code: str  # Sensor identifier
    sensor_type: str  # e.g., "temperature", "humidity"
    reading_value: float  # The actual sensor reading
    reading_unit: str  # e.g., "°C", "%", "psi"
    timestamp: Optional[str] = None  # ISO timestamp or None for current time
    room_id: Optional[str] = None  # Optional room ID for routing


@router.post("/ingest-gcp-data")
async def ingest_gcp_sensor_data(data: GCPSensorData):
    """
    Receive sensor data from GCP gateway and store in Supabase.
    
    Expected payload from GCP:
    {
        "gateway_id": "gw-001",
        "sensor_code": "TEMP-001",
        "sensor_type": "temperature",
        "reading_value": 22.5,
        "reading_unit": "°C",
        "timestamp": "2026-08-26T10:30:00Z",
        "room_id": "uuid-of-room"
    }
    """
    try:
        timestamp = data.timestamp or datetime.now(timezone.utc).isoformat()
        
        # 1. Try to find sensor_device by sensor_code
        sensor_query = (
            supabase.table("sensor_devices")
            .select("id, room_id")
            .eq("sensor_code", data.sensor_code)
            .limit(1)
            .execute()
        )
        
        sensor_id = None
        room_id = data.room_id  # Use provided room_id or fall back to sensor's room
        
        if sensor_query.data and len(sensor_query.data) > 0:
            sensor = sensor_query.data[0]
            sensor_id = sensor["id"]
            room_id = sensor.get("room_id", data.room_id)
            
            # Try to update sensor_devices with latest reading (best effort)
            try:
                supabase.table("sensor_devices").update({
                    "last_reading_value": data.reading_value,
                    "last_seen": timestamp,
                }).eq("id", sensor_id).execute()
                print(f"✅ Updated sensor_devices: {sensor_id}")
            except Exception as e:
                print(f"⚠️ Could not update sensor_devices: {e}")
        else:
            print(f"⚠️ Sensor with code '{data.sensor_code}' not found in sensor_devices")
            if not data.room_id:
                raise HTTPException(
                    status_code=404,
                    detail=f"Sensor '{data.sensor_code}' not found and no room_id provided"
                )
        
        # 2. Insert into sensor_readings table for historical data
        reading_record = {
            "sensor_id": sensor_id or data.sensor_code,  # Use code as fallback
            "room_id": room_id,
            "sensor_type": data.sensor_type,
            "reading_value": data.reading_value,
            "reading_unit": data.reading_unit,
            "recorded_at": timestamp,
            "gateway_id": data.gateway_id
        }
        
        insert_result = (
            supabase.table("sensor_readings")
            .insert(reading_record)
            .execute()
        )
        
        print(f"✅ Sensor reading recorded: {sensor_id or data.sensor_code} = {data.reading_value}{data.reading_unit}")
        
        return {
            "status": "success",
            "message": f"Sensor {data.sensor_code} reading ingested",
            "sensor_id": sensor_id,
            "room_id": room_id,
            "reading": f"{data.reading_value}{data.reading_unit}",
            "timestamp": timestamp
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"❌ Error ingesting GCP sensor data: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to ingest sensor data: {str(e)}"
        )


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
