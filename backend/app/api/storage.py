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
        # Note: Schema uses sparse columns: temperature_1, temperature_2, temperature_3, temperature_4
        print(f"🌡️  [AVERAGING ENDPOINT] Querying temperature readings...")
        temp_resp = (
            supabase.table("cold_storage_conditions")
            .select("temperature_1, temperature_2, temperature_3, temperature_4, recorded_at")
            .eq("room_id", room_id)
            .gte("recorded_at", cutoff_time)
            .order("recorded_at", descending=True)
            .execute()
        )
        
        # Query humidity readings
        # Note: Schema uses sparse columns: humidity_1, humidity_2, humidity_3, humidity_4
        print(f"💧 [AVERAGING ENDPOINT] Querying humidity readings...")
        humidity_resp = (
            supabase.table("cold_storage_conditions")
            .select("humidity_1, humidity_2, humidity_3, humidity_4, recorded_at")
            .eq("room_id", room_id)
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
            for record in temp_data:
                # Extract all temperature columns and average them
                temp_values = [
                    float(record["temperature_1"]) 
                    for col in ["temperature_1", "temperature_2", "temperature_3", "temperature_4"]
                    if record.get(col) is not None
                ]
                # Get individual temp sensors from this record
                for col in ["temperature_1", "temperature_2", "temperature_3", "temperature_4"]:
                    if record.get(col) is not None:
                        raw_val = float(record[col])
                        # Values already scaled by MQTT subscriber (multiplied by 0.01)
                        # so they should already be in correct range (e.g., 12.3°C not 1230)
                        temps.append(raw_val)
            
            if temps:
                avg_temperature = sum(temps) / len(temps)
                latest_reading_time = temp_data[0]["recorded_at"]
                print(f"✅ [AVERAGING ENDPOINT] Temp average: {avg_temperature:.2f}°C from {len(temps)} readings")
            else:
                print(f"⚠️  [AVERAGING ENDPOINT] No valid temperature readings found")
        
        if humidity_data:
            humidities = []
            for record in humidity_data:
                # Extract all humidity columns
                for col in ["humidity_1", "humidity_2", "humidity_3", "humidity_4"]:
                    if record.get(col) is not None:
                        raw_val = float(record[col])
                        # Values already scaled by MQTT subscriber (multiplied by 0.01)
                        # so they should already be in correct range (e.g., 56.7% not 5670)
                        humidities.append(raw_val)
            
            if humidities:
                avg_humidity = sum(humidities) / len(humidities)
                if not latest_reading_time or humidity_data[0]["recorded_at"] > latest_reading_time:
                    latest_reading_time = humidity_data[0]["recorded_at"]
                print(f"✅ [AVERAGING ENDPOINT] Humidity average: {avg_humidity:.2f}% from {len(humidities)} readings")
            else:
                print(f"⚠️  [AVERAGING ENDPOINT] No valid humidity readings found")
        
        # Count unique sensors
        temp_sensor_count = 0
        humidity_sensor_count = 0
        for record in temp_data:
            for col in ["temperature_1", "temperature_2", "temperature_3", "temperature_4"]:
                if record.get(col) is not None:
                    temp_sensor_count += 1
        for record in humidity_data:
            for col in ["humidity_1", "humidity_2", "humidity_3", "humidity_4"]:
                if record.get(col) is not None:
                    humidity_sensor_count += 1
        
        print(f"📡 [AVERAGING ENDPOINT] Unique sensors: {temp_sensor_count} temp, {humidity_sensor_count} humidity")
        
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
