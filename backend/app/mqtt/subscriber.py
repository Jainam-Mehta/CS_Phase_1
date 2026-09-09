"""
MQTT Subscriber — ColdSense Backend

IMPORTANT: This module must NOT be imported directly at module level
because client.loop_forever() is blocking. Instead, call start_subscriber()
from a background thread launched by FastAPI's startup event.

Sensor payload shape expected from publisher:
{
  "room_id": "<uuid>",            # cold_storage_rooms.id
  "sensor_readings": [
    {"room_sensor_id": "<uuid>", "value": 4.2, "unit": "°C"},
    ...
  ],
  # Legacy flat fields (handled for backwards compat):
  "temperature": 4.2,
  "humidity": 85.0,
  "door_status": "Closed",
  "ambient_temperature": 28.0,
  "ambient_humidity": 63.0
}
"""

import json
import logging
import threading

import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC
from app.services.sensor_service import save_sensor_reading, save_cold_storage_condition

logger = logging.getLogger(__name__)


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("✓ MQTT connected to %s:%s", MQTT_BROKER, MQTT_PORT)
        client.subscribe(MQTT_TOPIC)
        logger.info("Subscribed to topic: %s", MQTT_TOPIC)
    else:
        logger.error("MQTT connection failed with code %s", rc)


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%s). Will auto-reconnect.", rc)


def on_message(client, userdata, msg):
    """Handle incoming MQTT messages safely — never crash the subscriber loop."""
    try:
        payload = json.loads(msg.payload.decode())
        logger.debug("Received MQTT payload: %s", payload)

        room_id = payload.get("room_id")

        # ── Path 1: Normalized sensor_readings array (new schema) ───────────
        # Each element: {"room_sensor_id": "<uuid>", "value": <float>, "unit": "<str>"}
        if "sensor_readings" in payload and isinstance(payload["sensor_readings"], list):
            for reading in payload["sensor_readings"]:
                rs_id = reading.get("room_sensor_id")
                value = reading.get("value")
                unit = reading.get("unit", "")
                if rs_id and value is not None:
                    save_sensor_reading({
                        "room_sensor_id": rs_id,
                        "reading_value": float(value),
                        "unit": unit,
                    })

        # ── Path 2: Flat legacy payload (write to cold_storage_conditions) ──
        # Used by the simulator and old publishers.
        # Writes to cold_storage_conditions so the frontend can read it.
        if room_id:
            condition_data: dict = {"room_id": room_id}
            if "temperature" in payload:
                condition_data["temperature"] = float(payload["temperature"])
            elif "temperature_avg" in payload:
                condition_data["temperature"] = float(payload["temperature_avg"])
            elif "temperature_sensor1" in payload and "temperature_sensor2" in payload:
                t1 = float(payload["temperature_sensor1"])
                t2 = float(payload["temperature_sensor2"])
                condition_data["temperature"] = round((t1 + t2) / 2, 2)

            if "humidity" in payload:
                condition_data["humidity"] = float(payload["humidity"])

            if "ambient_temperature" in payload:
                condition_data["ambient_temperature"] = float(payload["ambient_temperature"])

            if "ambient_humidity" in payload:
                condition_data["ambient_humidity"] = float(payload["ambient_humidity"])

            if "door_status" in payload:
                condition_data["door_status"] = payload["door_status"]

            if len(condition_data) > 1:  # more than just room_id
                save_cold_storage_condition(condition_data)

        logger.info("MQTT message processed for room_id=%s", room_id)

    except json.JSONDecodeError as e:
        logger.error("MQTT JSON decode error: %s | raw: %s", e, msg.payload[:200])
    except Exception as e:
        logger.exception("Unhandled error in on_message: %s", e)


def _build_client() -> mqtt.Client:
    client = mqtt.Client(client_id="ColdSense_Backend")
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    # Auto-reconnect every 5 seconds on disconnect
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    return client


def start_subscriber():
    """
    Start the MQTT subscriber in a background thread.
    Call this from FastAPI's startup event — NOT at module import time.
    """
    def _run():
        client = _build_client()
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            logger.info("MQTT subscriber started (loop_forever)")
            client.loop_forever()
        except Exception as e:
            logger.error("MQTT subscriber failed to start: %s", e)

    thread = threading.Thread(target=_run, daemon=True, name="mqtt-subscriber")
    thread.start()
    logger.info("MQTT subscriber thread launched")
