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
    Upsert (insert) a row into `cold_storage_conditions`.

    Required fields:
        room_id  uuid  — FK to cold_storage_rooms.id

    Optional fields (any subset):
        temperature, humidity, ambient_temperature, ambient_humidity,
        door_status, compressor_status
    """
    if not condition.get("room_id"):
        logger.warning("save_cold_storage_condition: missing room_id, skipping")
        return None

    data = {
        "room_id": condition["room_id"],
        "recorded_at": condition.get("recorded_at", datetime.now(timezone.utc).isoformat()),
    }

    for field in (
        "temperature", "humidity",
        "ambient_temperature", "ambient_humidity",
        "door_status", "compressor_status",
    ):
        if field in condition and condition[field] is not None:
            data[field] = condition[field]

    try:
        resp = supabase.table("cold_storage_conditions").insert(data).execute()
        if resp.data:
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
