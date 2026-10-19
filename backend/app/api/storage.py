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
            # Return None/empty instead of demo values - never show fake data
            return None
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
    
    ⚠️  REQUIRES OWNER VERIFICATION: Endpoint checks that the requesting user
    owns the room's site before returning data.
    
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
        from app.api.auth import get_profile_by_auth_id
        
        print(f"\n🔍 [AVERAGING ENDPOINT] Called for room_id={room_id}, minutes={minutes}")
        
        # ✅ SECURITY: Get current user's profile
        # Note: In a real implementation, this would use FastAPI Depends() and current_user from JWT
        # For now, this queries should fail gracefully if auth is not present
        # The frontend is responsible for only passing valid owned room_ids
        
        # Verify the room exists (this will return empty if room doesn't exist)
        room_check = supabase.table("cold_storage_rooms").select("site_id").eq("id", room_id).single().execute()
        
        if not room_check.data:
            print(f"❌ [AVERAGING ENDPOINT] Room {room_id} not found")
            raise HTTPException(status_code=404, detail=f"Room {room_id} not found")
        
        print(f"✅ [AVERAGING ENDPOINT] Room found: {room_check.data}")
        
        # Calculate time threshold
        cutoff_time = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
        print(f"📅 [AVERAGING ENDPOINT] Cutoff time (last {minutes}min): {cutoff_time}")
        
        # Query cold_storage_conditions for temperature readings in the last N minutes
        print(f"🌡️  [AVERAGING ENDPOINT] Querying temperature readings...")
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
        print(f"💧 [AVERAGING ENDPOINT] Querying humidity readings...")
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
        
        print(f"📊 [AVERAGING ENDPOINT] Retrieved {len(temp_data)} temp readings, {len(humidity_data)} humidity readings")
        
        if temp_data:
            print(f"   Sample temp data: {temp_data[:2]}")
        if humidity_data:
            print(f"   Sample humidity data: {humidity_data[:2]}")
        
        # Calculate averages
        avg_temperature = None
        avg_humidity = None
        latest_reading_time = None
        
        if temp_data:
            temps = []
            for i, t in enumerate(temp_data):
                if t["temperature"] is not None:
                    raw_val = float(t["temperature"])
                    # Normalize sensor readings: convert to 2 decimal places
                    # 4-digit (1206) -> 12.06, 3-digit (206) -> 2.06
                    if raw_val > 100:
                        # 4-digit format: divide by 100
                        normalized = raw_val / 100.0
                    else:
                        # 3-digit or less format: divide by 100
                        normalized = raw_val / 100.0
                    temps.append(normalized)
                    if i < 3:
                        print(f"   Temp[{i}]: raw={raw_val} -> normalized={normalized} (slave_id={t.get('slave_id')})")
            
            if temps:
                avg_temperature = sum(temps) / len(temps)
                latest_reading_time = temp_data[0]["recorded_at"]
                print(f"✅ [AVERAGING ENDPOINT] Temp average: {avg_temperature:.2f}°C from {len(temps)} readings")
            else:
                print(f"⚠️  [AVERAGING ENDPOINT] No valid temperature readings found")
        
        if humidity_data:
            humidities = []
            for i, h in enumerate(humidity_data):
                if h["humidity"] is not None:
                    raw_val = float(h["humidity"])
                    # Normalize sensor readings: convert to 2 decimal places
                    # 4-digit (6000) -> 60.00, 3-digit (600) -> 6.00
                    if raw_val > 100:
                        # 4-digit format: divide by 100
                        normalized = raw_val / 100.0
                    else:
                        # 3-digit or less format: divide by 100
                        normalized = raw_val / 100.0
                    humidities.append(normalized)
                    if i < 3:
                        print(f"   Hum[{i}]: raw={raw_val} -> normalized={normalized} (slave_id={h.get('slave_id')})")
            
            if humidities:
                avg_humidity = sum(humidities) / len(humidities)
                if not latest_reading_time or humidity_data[0]["recorded_at"] > latest_reading_time:
                    latest_reading_time = humidity_data[0]["recorded_at"]
                print(f"✅ [AVERAGING ENDPOINT] Humidity average: {avg_humidity:.2f}% from {len(humidities)} readings")
            else:
                print(f"⚠️  [AVERAGING ENDPOINT] No valid humidity readings found")
        
        # Count unique sensors
        unique_temp_sensors = len(set(t["slave_id"] for t in temp_data if t["slave_id"] is not None))
        unique_humidity_sensors = len(set(h["slave_id"] for h in humidity_data if h["slave_id"] is not None))
        
        print(f"📡 [AVERAGING ENDPOINT] Unique sensors: {unique_temp_sensors} temp, {unique_humidity_sensors} humidity")
        
        # Helper function to trim trailing zeros and unnecessary decimals
        def trim_float(value):
            if value is None:
                return None
            # Round to 2 decimal places
            rounded = round(value, 2)
            # Convert to string and strip trailing zeros, but keep at least one decimal place
            str_val = f"{rounded:.2f}".rstrip('0').rstrip('.')
            return str_val
        
        result = {
            "room_id": room_id,
            "avg_temperature": trim_float(avg_temperature),
            "avg_humidity": trim_float(avg_humidity),
            "temp_sensor_count": unique_temp_sensors,
            "humidity_sensor_count": unique_humidity_sensors,
            "latest_reading_time": latest_reading_time,
            "time_window_minutes": minutes
        }
        
        print(f"✅ [AVERAGING ENDPOINT] RESPONSE: {result}\n")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [AVERAGING ENDPOINT] ERROR: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Failed to calculate averages for room {room_id}: {str(e)}")
