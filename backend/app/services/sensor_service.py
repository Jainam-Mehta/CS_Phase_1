"""
Sensor Service — ColdSense Backend

Two write paths matching the real Supabase schema:

1. save_sensor_reading()
   → Writes to `sensor_readings` table
   → Schema: room_sensor_id (uuid FK → room_sensors), reading_value, unit, recorded_at

2. save_cold_storage_condition()
   → Writes to `cold_storage_conditions` table
   → Schema: room_id, temperature, humidity, ambient_temperature, ambient_humidity,
             door_status, compressor_status, recorded_at

The frontend reads `cold_storage_conditions` for live telemetry (FarmerDashboard,
FarmerAlerts, OwnerMonitoring). The normalized `sensor_readings` table is for
per-sensor history and analytics.
"""

import logging
from datetime import datetime, timezone

from app.database.supabase import supabase

logger = logging.getLogger(__name__)


def save_sensor_reading(reading: dict) -> dict | None:
    """
    Insert one normalized sensor reading into `sensor_readings`.

    Required fields:
        room_sensor_id  uuid  — FK to room_sensors.id
        reading_value   float — the measured value
        unit            str   — optional unit string (°C, %, kPa …)
    """
    if not reading.get("room_sensor_id"):
        logger.warning("save_sensor_reading: missing room_sensor_id, skipping")
        return None

    data = {
        "room_sensor_id": reading["room_sensor_id"],
        "reading_value": float(reading["reading_value"]),
        "unit": reading.get("unit", ""),
        "recorded_at": reading.get("recorded_at", datetime.now(timezone.utc).isoformat()),
        "received_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        resp = supabase.table("sensor_readings").insert(data).execute()
        if resp.data:
            return resp.data[0]
        logger.error("save_sensor_reading: empty response from Supabase")
    except Exception as e:
        logger.exception("save_sensor_reading failed: %s", e)
    return None


def save_cold_storage_condition(condition: dict) -> dict | None:
    """
    Upsert a row into `cold_storage_conditions` — merges with the most recent row for the room.

    Required fields:
        room_id  uuid  — FK to cold_storage_rooms.id
        site_id  uuid  — FK to sites.id (optional but recommended)

    Optional fields (any subset):
        temperature, humidity, ambient_temperature, ambient_humidity,
        door_status, compressor_status, site_id
    """
    if not condition.get("room_id"):
        logger.warning("save_cold_storage_condition: missing room_id, skipping")
        return None

    room_id = condition["room_id"]
    data = {
        "room_id": room_id,
        "recorded_at": condition.get("recorded_at", datetime.now(timezone.utc).isoformat()),
    }
    
    # Add site_id if provided (for multi-tenancy filtering)
    if condition.get("site_id"):
        data["site_id"] = condition["site_id"]

    for field in (
        "temperature", "humidity",
        "ambient_temperature", "ambient_humidity",
        "door_status", "compressor_status",
        "suction_pressure", "discharge_pressure",
        "energy_consumption_kwh", "solar_percentage",
    ):
        if field in condition and condition[field] is not None:
            data[field] = condition[field]

    try:
        # Try to upsert: get the most recent row for this room and update it
        # If no row exists in the last 60 seconds, create a new one
        latest = (
            supabase.table("cold_storage_conditions")
            .select("id, recorded_at")
            .eq("room_id", room_id)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        
        if latest.data:
            latest_row = latest.data[0]
            try:
                # Parse the latest recorded timestamp safely
                latest_recorded_str = latest_row.get("recorded_at", "")
                if isinstance(latest_recorded_str, str):
                    latest_recorded_str = latest_recorded_str.replace('Z', '+00:00')
                latest_time = datetime.fromisoformat(latest_recorded_str)
            except (ValueError, TypeError, AttributeError) as e:
                logger.warning("Invalid timestamp format in DB for room_id=%s: %s, creating new row", room_id, e)
                # Fall through to insert new row
                latest.data = None
            
            if latest.data:
                # Parse the message timestamp (should be valid, but handle gracefully)
                message_timestamp = data.get("recorded_at")
                if isinstance(message_timestamp, str):
                    try:
                        message_timestamp = message_timestamp.replace('Z', '+00:00')
                        message_time = datetime.fromisoformat(message_timestamp)
                    except (ValueError, TypeError, AttributeError) as e:
                        logger.error("Invalid message timestamp: %s, using current time", e)
                        message_time = datetime.now(timezone.utc)
                else:
                    message_time = datetime.now(timezone.utc)
                
                # Calculate time difference (use message time, not server time)
                time_diff = (message_time - latest_time).total_seconds()
                
                # If the message is from the same room within 60 seconds and not out-of-order, merge
                if 0 <= time_diff < 60:
                    resp = supabase.table("cold_storage_conditions") \
                        .update(data) \
                        .eq("id", latest_row["id"]) \
                        .execute()
                    if resp.data:
                        logger.info("✓ Merged condition into existing row for room_id=%s (age=%ds)", room_id, int(time_diff))
                        return resp.data[0]
                elif time_diff < 0:
                    logger.warning("Out-of-order message detected: received message with timestamp %.1f seconds in the past, creating new row", -time_diff)
        
        # If no recent row found or out-of-order, insert a new one
        resp = supabase.table("cold_storage_conditions").insert(data).execute()
        if resp.data:
            logger.info("✓ Created new condition row for room_id=%s", room_id)
            return resp.data[0]
        logger.error("save_cold_storage_condition: empty response from Supabase")
    except Exception as e:
        logger.exception("save_cold_storage_condition failed: %s", e)
    return None


def get_latest_condition(room_id: str) -> dict | None:
    """Return the most recent cold_storage_conditions row for a room."""
    try:
        resp = (
            supabase.table("cold_storage_conditions")
            .select("*")
            .eq("room_id", room_id)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception as e:
        logger.exception("get_latest_condition failed: %s", e)
        return None


def get_latest_sensor_reading(room_sensor_id: str) -> dict | None:
    """Return the most recent sensor_readings row for a room_sensor."""
    try:
        resp = (
            supabase.table("sensor_readings")
            .select("*")
            .eq("room_sensor_id", room_sensor_id)
            .order("recorded_at", desc=True)
            .limit(1)
            .execute()
        )
        return resp.data[0] if resp.data else None
    except Exception as e:
        logger.exception("get_latest_sensor_reading failed: %s", e)
        return None
