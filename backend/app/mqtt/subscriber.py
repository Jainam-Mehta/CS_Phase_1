"""
MQTT Subscriber — ColdSense Backend

Listens to TWO topic patterns:

1. Per-sensor topic (from real hardware):
   coldsense/{room_id}/{sensor_type}/{sensor_index}
   Payload: {"value": 4.2, "unit": "°C", "timestamp": "..."}

2. Legacy flat topic (from simulator):
   coldsense/sensors  or  coldsense/{room_id}
   Payload: {"room_id": "...", "temperature": 4.2, "humidity": 85.0, ...}
"""

import json
import logging
import threading

import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT
from app.services.sensor_service import save_sensor_reading, save_cold_storage_condition
from app.services.door_service import process_door_state_change

logger = logging.getLogger(__name__)

# Wildcard - catches ALL coldsense topics
SUBSCRIBE_TOPIC = "coldsense/#"


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("✓ MQTT connected to %s:%s", MQTT_BROKER, MQTT_PORT)
        client.subscribe(SUBSCRIBE_TOPIC)
        logger.info("✓ Subscribed to wildcard topic: %s", SUBSCRIBE_TOPIC)
    else:
        logger.error("✗ MQTT connection failed with code %s", rc)


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%s). Auto-reconnecting...", rc)


def on_message(client, userdata, msg):
    """
    Route incoming MQTT messages based on topic structure.
    Topic format: coldsense/{room_id}/{sensor_type}/{sensor_index}
    """
    try:
        topic = msg.topic
        payload = json.loads(msg.payload.decode())
        logger.info("📨 MQTT message on topic: %s", topic)
        logger.debug("Payload: %s", payload)

        parts = topic.split("/")
        # coldsense / {room_id} / {sensor_type} / {sensor_index}
        # parts[0]   parts[1]    parts[2]          parts[3]

        if len(parts) == 4 and parts[0] == "coldsense":
            # ── Path 1: Per-sensor topic (real hardware) ──────────────────
            room_id    = parts[1]
            sensor_type = parts[2]
            sensor_index = parts[3]

            value = payload.get("value")
            unit  = payload.get("unit", "")

            if value is None:
                logger.warning("No 'value' in payload for topic %s", topic)
                return

            logger.info(
                "📡 Sensor reading | room=%s type=%s index=%s value=%s%s",
                room_id, sensor_type, sensor_index, value, unit
            )

            # 1a. Update sensor_devices.last_reading_value + last_seen
            _update_sensor_device(room_id, sensor_type, float(value), unit)

            # 1b. Also persist in cold_storage_conditions for dashboard charts
            condition: dict = {"room_id": room_id}
            st = sensor_type.lower()
            if "ambienttemperature" in st or "ambient_temp" in st:
                condition["ambient_temperature"] = float(value)
            elif "ambienthumidity" in st or "ambient_hum" in st:
                condition["ambient_humidity"] = float(value)
            elif "temperature" in st:
                condition["temperature"] = float(value)
            elif "humidity" in st:
                condition["humidity"] = float(value)
            elif "suctionpressure" in st:
                condition["suction_pressure"] = float(value)
            elif "dischargepressure" in st:
                condition["discharge_pressure"] = float(value)
            elif "door" in st:
                condition["door_status"] = str(value)
                door_val = 1 if str(value).lower() in ("1", "open", "true", "opened") else 0
                process_door_state_change(door_id=f"door_{room_id}", new_state=door_val, room_id=room_id)

            if len(condition) > 1:
                save_cold_storage_condition(condition)

        elif len(parts) >= 2 and parts[0] == "coldsense":
            # ── Path 2: Legacy flat payload (simulator / old publishers) ──
            room_id = payload.get("room_id") or (parts[1] if len(parts) > 1 else None)
            if not room_id:
                logger.warning("No room_id found in legacy payload: %s", topic)
                return

            condition: dict = {"room_id": room_id}
            mapping = {
                "temperature":        "temperature",
                "temperature_avg":    "temperature",
                "humidity":           "humidity",
                "ambient_temperature":"ambient_temperature",
                "ambient_humidity":   "ambient_humidity",
                "door_status":        "door_status",
                "suction_pressure":   "suction_pressure",
                "discharge_pressure": "discharge_pressure",
                "energy_consumption_kwh": "energy_consumption_kwh",
                "solar_percentage":   "solar_percentage",
            }
            for src, dst in mapping.items():
                if src in payload:
                    condition[dst] = payload[src]

            if "door_status" in payload:
                ds = str(payload["door_status"]).lower()
                door_val = 1 if ds in ("1", "open", "true", "opened") else 0
                process_door_state_change(door_id=f"door_{room_id}", new_state=door_val, room_id=room_id)

            # Average dual temperature sensors if present
            if "temperature_sensor1" in payload and "temperature_sensor2" in payload:
                t1 = float(payload["temperature_sensor1"])
                t2 = float(payload["temperature_sensor2"])
                condition["temperature"] = round((t1 + t2) / 2, 2)

            if len(condition) > 1:
                save_cold_storage_condition(condition)
                logger.info("✓ Legacy condition saved for room_id=%s", room_id)

        else:
            logger.debug("Unrecognised topic pattern, skipping: %s", topic)

    except json.JSONDecodeError as e:
        logger.error("✗ JSON decode error: %s | raw: %s", e, msg.payload[:200])
    except Exception as e:
        logger.exception("✗ Unhandled error in on_message: %s", e)


def _update_sensor_device(room_id: str, sensor_type: str, value: float, unit: str):
    """Update last_reading_value and last_seen on the matching sensor_device row."""
    try:
        from app.database.supabase import supabase
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc).isoformat()
        logger.info("🔍 Searching for sensor: room_id=%s sensor_type=%s", room_id, sensor_type)

        # Find sensor by room_id + sensor_type (exact match first, then case-insensitive)
        result = supabase.table("sensor_devices") \
            .select("id, sensor_type") \
            .eq("room_id", room_id) \
            .execute()

        logger.debug("Found %d sensors in room_id=%s: %s", len(result.data or []), room_id, result.data or [])

        # Match sensor_type (case-insensitive)
        matching_sensor = None
        if result.data:
            for sensor in result.data:
                if sensor["sensor_type"].lower() == sensor_type.lower():
                    matching_sensor = sensor
                    break

        if matching_sensor:
            sensor_id = matching_sensor["id"]
            update_result = supabase.table("sensor_devices") \
                .update({
                    "last_reading_value": value,
                    "last_reading_unit":  unit,
                    "last_seen":          now,
                    "status":             "Online",
                }) \
                .eq("id", sensor_id) \
                .execute()
            logger.info("✓ Updated sensor_device id=%s type=%s value=%s%s | update_result=%s", 
                       sensor_id, sensor_type, value, unit, update_result)
        else:
            logger.warning(
                "⚠ No sensor_device found for room_id=%s sensor_type=%s. Available sensors: %s",
                room_id, sensor_type, result.data or []
            )
    except Exception as e:
        logger.exception("✗ Failed to update sensor_device: %s", e)


def _build_client() -> mqtt.Client:
    client = mqtt.Client(client_id="ColdSense_Subscriber")
    client.on_connect    = on_connect
    client.on_disconnect = on_disconnect
    client.on_message    = on_message
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    return client


def start_subscriber():
    """Start MQTT subscriber in a background daemon thread."""
    def _run():
        client = _build_client()
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            logger.info("🚀 MQTT subscriber loop started")
            client.loop_forever()
        except Exception as e:
            logger.error("✗ MQTT subscriber failed: %s", e)

    thread = threading.Thread(target=_run, daemon=True, name="mqtt-subscriber")
    thread.start()
    logger.info("MQTT subscriber thread launched → listening on %s", SUBSCRIBE_TOPIC)


# ── Standalone entrypoint ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )
    logger.info("🚀 Starting ColdSense MQTT Subscriber (standalone mode)")
    logger.info("   Broker: %s:%s", MQTT_BROKER, MQTT_PORT)
    logger.info("   Topic:  coldsense/#")

    client = _build_client()
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        logger.info("✅ Connected. Listening for sensor messages...")
        client.loop_forever()  # Blocks here indefinitely
    except KeyboardInterrupt:
        logger.info("🛑 Subscriber stopped by user")
    except Exception as e:
        logger.error("❌ Fatal error: %s", e)
        sys.exit(1)
