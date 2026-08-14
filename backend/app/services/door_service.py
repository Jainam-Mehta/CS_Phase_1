"""
Door Service
Handles door sensor tracking, event logging, and threshold monitoring
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from app.database.supabase import supabase, get_previous_door_state
from app.config import DOOR_THRESHOLD_MINUTES


def process_door_state_change(door_id: str, new_state: int) -> Optional[Dict]:
    """
    Process door state changes and create events when doors open/close.
    
    Args:
        door_id: ID of the door (door_sensor_1 or door_sensor_2)
        new_state: New door state (0 = Closed, 1 = Open)
    
    Returns:
        Created door event dict if state changed, None otherwise
    """
    # Get previous state from database
    previous_state = get_previous_door_state(door_id)
    
    # Only create event when state actually changes
    if previous_state is not None and new_state == previous_state:
        return None
    
    # Door opened (0 -> 1)
    if new_state == 1:
        return create_door_open_event(door_id)
    
    # Door closed (1 -> 0)
    if new_state == 0 and previous_state == 1:
        return close_door_open_event(door_id)
    
    return None


def create_door_open_event(door_id: str) -> Dict:
    """
    Create a new door open event.
    
    Args:
        door_id: ID of the door
    
    Returns:
        Created door event dict
    """
    event_data = {
        "door_id": door_id,
        "opened_at": datetime.utcnow().isoformat(),
        "closed_at": None,
        "duration_seconds": None,
        "duration_minutes": None,
        "created_at": datetime.utcnow().isoformat()
    }
    
    response = supabase.table("door_events").insert(event_data).execute()
    
    if response.data:
        return response.data[0]
    return event_data


def close_door_open_event(door_id: str) -> Optional[Dict]:
    """
    Close the most recent open door event by setting closed_at and duration.
    
    Args:
        door_id: ID of the door
    
    Returns:
        Updated door event dict if found, None otherwise
    """
    # Find the most recent open event for this door
    response = (
        supabase
        .table("door_events")
        .select("*")
        .eq("door_id", door_id)
        .is_("closed_at", "null")
        .order("opened_at", desc=True)
        .limit(1)
        .execute()
    )
    
    if not response.data:
        return None
    
    event = response.data[0]
    opened_at = datetime.fromisoformat(event["opened_at"])
    closed_at = datetime.utcnow()
    
    duration_seconds = (closed_at - opened_at).total_seconds()
    duration_minutes = duration_seconds / 60
    
    update_data = {
        "closed_at": closed_at.isoformat(),
        "duration_seconds": duration_seconds,
        "duration_minutes": duration_minutes
    }
    
    update_response = (
        supabase
        .table("door_events")
        .update(update_data)
        .eq("id", event["id"])
        .execute()
    )
    
    if update_response.data:
        return update_response.data[0]
    return None


def get_door_frequency_today(door_id: str) -> int:
    """
    Get the number of times a door was opened today.
    
    Args:
        door_id: ID of the door
    
    Returns:
        Count of door open events today
    """
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time()).isoformat()
    today_end = datetime.combine(today, datetime.max.time()).isoformat()
    
    response = (
        supabase
        .table("door_events")
        .select("*")
        .eq("door_id", door_id)
        .gte("opened_at", today_start)
        .lte("opened_at", today_end)
        .execute()
    )
    
    return len(response.data) if response.data else 0


def get_door_open_duration_today(door_id: str) -> float:
    """
    Get total door open duration in minutes for today.
    
    Args:
        door_id: ID of the door
    
    Returns:
        Total duration in minutes
    """
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time()).isoformat()
    today_end = datetime.combine(today, datetime.max.time()).isoformat()
    
    response = (
        supabase
        .table("door_events")
        .select("duration_minutes")
        .eq("door_id", door_id)
        .gte("opened_at", today_start)
        .lte("opened_at", today_end)
        .not_("duration_minutes", "null")
        .execute()
    )
    
    if not response.data:
        return 0.0
    
    total_duration = sum(event["duration_minutes"] or 0 for event in response.data)
    return round(total_duration, 2)


def get_total_door_frequency_today() -> Dict[str, int]:
    """
    Get door open frequency for both doors today.
    
    Returns:
        Dict with door_1_frequency and door_2_frequency
    """
    return {
        "door_1_frequency": get_door_frequency_today("door_sensor_1"),
        "door_2_frequency": get_door_frequency_today("door_sensor_2")
    }


def get_total_door_duration_today() -> Dict[str, float]:
    """
    Get total door open duration for both doors today.
    
    Returns:
        Dict with door_1_duration and door_2_duration in minutes
    """
    return {
        "door_1_duration": get_door_open_duration_today("door_sensor_1"),
        "door_2_duration": get_door_open_duration_today("door_sensor_2")
    }


def check_door_threshold() -> bool:
    """
    Check if total door open duration today exceeds the threshold.
    
    Returns:
        True if threshold exceeded, False otherwise
    """
    durations = get_total_door_duration_today()
    total_duration = durations["door_1_duration"] + durations["door_2_duration"]
    
    return total_duration > DOOR_THRESHOLD_MINUTES


def get_remaining_allowed_duration() -> float:
    """
    Calculate remaining allowed door open duration for today.
    
    Returns:
        Remaining duration in minutes (can be negative if exceeded)
    """
    durations = get_total_door_duration_today()
    total_duration = durations["door_1_duration"] + durations["door_2_duration"]
    
    remaining = DOOR_THRESHOLD_MINUTES - total_duration
    return round(remaining, 2)


def get_door_status() -> Dict:
    """
    Get comprehensive door status including current states, frequency, duration, and alerts.
    Updated to use OR logic: any sensor=1 means closed, both=0 means open.
    
    Returns:
        Dict with door_1_state, door_2_state, final_status, frequency, duration, remaining_duration, and alert
    """
    # Get latest sensor readings for door states
    response = (
        supabase
        .table("sensor_readings")
        .select("door_sensor1", "door_sensor2")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    
    door_1_state = 0
    door_2_state = 0
    
    if response.data:
        door_1_state = response.data[0].get("door_sensor1", 0)
        door_2_state = response.data[0].get("door_sensor2", 0)
    
    # Apply OR logic: any sensor=1 means closed, both=0 means open
    # Note: Sensor values are inverted for physical door sensors
    # 1 = sensor active (door closed), 0 = sensor inactive (door open)
    final_status = "closed" if (door_1_state == 1 or door_2_state == 1) else "open"
    
    frequency = get_total_door_frequency_today()
    duration = get_total_door_duration_today()
    total_duration = duration["door_1_duration"] + duration["door_2_duration"]
    remaining_duration = get_remaining_allowed_duration()
    alert = check_door_threshold()
    
    return {
        "door_1_state": door_1_state,
        "door_2_state": door_2_state,
        "final_status": final_status,
        "door_1_frequency": frequency["door_1_frequency"],
        "door_2_frequency": frequency["door_2_frequency"],
        "door_1_duration": duration["door_1_duration"],
        "door_2_duration": duration["door_2_duration"],
        "total_duration": total_duration,
        "remaining_allowed_duration": remaining_duration,
        "door_alert": alert,
        "threshold_minutes": DOOR_THRESHOLD_MINUTES
    }


def get_door_events_today(limit: int = 50) -> List[Dict]:
    """
    Get door events for today with optional limit.
    
    Args:
        limit: Maximum number of events to return
    
    Returns:
        List of door event dicts
    """
    today = datetime.utcnow().date()
    today_start = datetime.combine(today, datetime.min.time()).isoformat()
    today_end = datetime.combine(today, datetime.max.time()).isoformat()
    
    response = (
        supabase
        .table("door_events")
        .select("*")
        .gte("opened_at", today_start)
        .lte("opened_at", today_end)
        .order("opened_at", desc=True)
        .limit(limit)
        .execute()
    )
    
    return response.data if response.data else []
