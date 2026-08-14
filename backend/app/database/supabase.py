from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY
from datetime import datetime, timedelta

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

def get_latest_reading():
    """
    Fetch the latest sensor reading from Supabase.
    """

    response = (
        supabase
        .table("sensor_readings")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if response.data:
        return response.data[0]

    return {}


def get_previous_door_state(door_id: str):
    """
    Get the previous state of a door sensor.
    
    Args:
        door_id: ID of the door (door_sensor1 or door_sensor2)
    
    Returns:
        Previous door state (0 or 1) or None if no previous reading
    """
    # Map door service IDs to database field names
    field_mapping = {
        "door_sensor_1": "door_sensor1",
        "door_sensor_2": "door_sensor2"
    }
    
    field_name = field_mapping.get(door_id, door_id)
    
    response = (
        supabase
        .table("sensor_readings")
        .select(field_name)
        .order("created_at", desc=True)
        .limit(2)
        .execute()
    )
    
    if response.data and len(response.data) >= 2:
        return response.data[1].get(field_name, 0)
    
    return None