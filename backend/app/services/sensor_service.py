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
    
    Currently disabled - using cold_storage_conditions instead.
    Keeping this function for future use.
    """
    logger.debug("save_sensor_reading: skipped (using cold_storage_conditions instead)")
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
        # Always create a new row - no merging
        # This allows us to store every reading with timestamp history
        resp = supabase.table("cold_storage_conditions").insert(data).execute()
        if resp.data:
            logger.info("✓ Created new condition row for room_id=%s (timestamp: %s)", room_id, data.get("recorded_at"))
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
