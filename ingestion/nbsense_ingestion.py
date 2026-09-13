"""
NBSense API → MQTT Ingestion Script
=====================================
Polls api.nbsense.in for temperature + humidity readings
and publishes them to ColdSense MQTT broker.

Flow:
  api.nbsense.in  →  This script  →  MQTT (35.200.228.62:1883)  →  Subscriber  →  DB  →  Dashboard

Usage:
    pip install requests paho-mqtt

    # Set your credentials first (edit CONFIG below)
    python nbsense_ingestion.py

    # Or with env vars:
    NBSENSE_TOKEN=your_token ROOM_ID=your_room_id python nbsense_ingestion.py
"""

import json
import logging
import os
import time
from datetime import datetime, timezone

import requests
import paho.mqtt.client as mqtt

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG  ← Edit these values
# ─────────────────────────────────────────────────────────────────────────────
CONFIG = {
    # NBSense API credentials
    "NBSENSE_TOKEN":  os.getenv("NBSENSE_TOKEN",  "YOUR_BEARER_TOKEN_HERE"),
    "NBSENSE_BASE":   "https://api.nbsense.in",
    "METER_ID":       os.getenv("METER_ID",        "1"),      # meter_id from their API
    "SENSOR_NAME":    os.getenv("SENSOR_NAME",     "225"),    # sensor_name from their API

    # ColdSense MQTT broker
    "MQTT_BROKER":    os.getenv("MQTT_BROKER",     "35.200.228.62"),
    "MQTT_PORT":      int(os.getenv("MQTT_PORT",   "1883")),

    # Your Supabase room UUID (from cold_storage_rooms table)
    "ROOM_ID":        os.getenv("ROOM_ID",         "YOUR-ROOM-UUID-HERE"),

    # How often to poll (seconds)
    "POLL_INTERVAL":  int(os.getenv("POLL_INTERVAL", "60")),
}
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("nbsense-ingestion")


# ── NBSense API Client ────────────────────────────────────────────────────────

def _headers() -> dict:
    return {"Authorization": f"Bearer {CONFIG['NBSENSE_TOKEN']}"}


def fetch_latest_reading() -> dict | None:
    """
    Fetch the latest temperature + humidity from NBSense API.
    Uses the month chart endpoint to get today's most recent reading.
    Returns {"temperature": float, "humidity": float} or None on error.
    """
    now = datetime.now()

    # Try month chart for current month to get latest data
    url = (
        f"{CONFIG['NBSENSE_BASE']}/th_ms/chart/month"
        f"?meter_id={CONFIG['METER_ID']}"
        f"&sensor_name={CONFIG['SENSOR_NAME']}"
        f"&year={now.year}&month={now.month}"
    )

    try:
        log.info("📡 Fetching from NBSense: %s", url)
        resp = requests.get(url, headers=_headers(), timeout=15)
        resp.raise_for_status()

        data = resp.json()
        log.debug("NBSense response: %s", json.dumps(data)[:500])

        return _parse_reading(data)

    except requests.exceptions.Timeout:
        log.error("❌ NBSense API timeout")
    except requests.exceptions.ConnectionError:
        log.error("❌ Cannot connect to NBSense API")
    except requests.exceptions.HTTPError as e:
        log.error("❌ NBSense API HTTP error: %s", e)
        if e.response.status_code == 401:
            log.error("   → Token is invalid or expired. Check NBSENSE_TOKEN")
    except Exception as e:
        log.exception("❌ Unexpected error fetching NBSense data: %s", e)

    return None


def _parse_reading(data: any) -> dict | None:
    """
    Parse NBSense API response to extract temperature and humidity.
    Handles multiple possible response formats.
    """
    if data is None:
        return None

    result = {}

    # Format 1: {"temperature": 4.2, "humidity": 85.0}
    if isinstance(data, dict):
        if "temperature" in data:
            result["temperature"] = float(data["temperature"])
        if "humidity" in data:
            result["humidity"] = float(data["humidity"])
        if "temp" in data:
            result["temperature"] = float(data["temp"])
        if "hum" in data:
            result["humidity"] = float(data["hum"])

        # Format 2: {"data": [...]}
        if "data" in data and isinstance(data["data"], list) and len(data["data"]) > 0:
            last = data["data"][-1]  # Most recent reading
            return _parse_reading(last)

        # Format 3: {"readings": [...]}
        if "readings" in data and isinstance(data["readings"], list) and len(data["readings"]) > 0:
            last = data["readings"][-1]
            return _parse_reading(last)

        # Format 4: {"value": 4.2, "type": "temperature"}
        if "value" in data and "type" in data:
            sensor_type = str(data["type"]).lower()
            if "temp" in sensor_type:
                result["temperature"] = float(data["value"])
            elif "hum" in sensor_type:
                result["humidity"] = float(data["value"])

    # Format 5: Array of readings [[timestamp, temp, humidity], ...]
    elif isinstance(data, list) and len(data) > 0:
        last = data[-1]
        if isinstance(last, list) and len(last) >= 3:
            result["temperature"] = float(last[1])
            result["humidity"] = float(last[2])
        elif isinstance(last, dict):
            return _parse_reading(last)

    if result:
        log.info("✅ Parsed reading: Temp=%.1f°C  Humidity=%.1f%%",
                 result.get("temperature", 0), result.get("humidity", 0))
        return result

    log.warning("⚠️  Could not parse NBSense response. Raw: %s",
                str(data)[:300])
    log.warning("   Please check the response format and update _parse_reading()")
    return None


# ── MQTT Publisher ────────────────────────────────────────────────────────────

_mqtt_client: mqtt.Client | None = None
_mqtt_connected = False


def _on_connect(client, userdata, flags, rc):
    global _mqtt_connected
    if rc == 0:
        _mqtt_connected = True
        log.info("✅ MQTT connected to %s:%s", CONFIG["MQTT_BROKER"], CONFIG["MQTT_PORT"])
    else:
        _mqtt_connected = False
        log.error("❌ MQTT connection failed (rc=%s)", rc)


def _on_disconnect(client, userdata, rc):
    global _mqtt_connected
    _mqtt_connected = False
    if rc != 0:
        log.warning("⚠️  MQTT disconnected (rc=%s), will reconnect...", rc)


def connect_mqtt() -> mqtt.Client:
    global _mqtt_client, _mqtt_connected
    client = mqtt.Client(client_id="ColdSense_NBSense_Ingestion")
    client.on_connect    = _on_connect
    client.on_disconnect = _on_disconnect
    client.reconnect_delay_set(min_delay=5, max_delay=30)

    try:
        client.connect(CONFIG["MQTT_BROKER"], CONFIG["MQTT_PORT"], keepalive=60)
        client.loop_start()
        time.sleep(2)  # Wait for connection
    except Exception as e:
        log.error("❌ Cannot connect to MQTT broker: %s", e)
        log.error("   Is the VM deployed? Run: bash infrastructure/deploy.sh")
        raise

    _mqtt_client = client
    return client


def publish_to_mqtt(client: mqtt.Client, reading: dict):
    """Publish temp and humidity to MQTT topics."""
    room_id   = CONFIG["ROOM_ID"]
    timestamp = datetime.now(timezone.utc).isoformat()

    published = []

    if "temperature" in reading:
        topic   = f"coldsense/{room_id}/Temperature/1"
        payload = json.dumps({
            "value":     reading["temperature"],
            "unit":      "°C",
            "timestamp": timestamp,
            "source":    "nbsense_api",
        })
        result = client.publish(topic, payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            published.append(f"Temperature={reading['temperature']}°C")
            log.info("  📤 %s → %s", topic, reading['temperature'])
        else:
            log.error("  ❌ Failed to publish temperature")

    if "humidity" in reading:
        topic   = f"coldsense/{room_id}/Humidity/1"
        payload = json.dumps({
            "value":     reading["humidity"],
            "unit":      "%",
            "timestamp": timestamp,
            "source":    "nbsense_api",
        })
        result = client.publish(topic, payload, qos=1)
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            published.append(f"Humidity={reading['humidity']}%")
            log.info("  📤 %s → %s", topic, reading['humidity'])
        else:
            log.error("  ❌ Failed to publish humidity")

    if published:
        log.info("✅ Published: %s", "  |  ".join(published))


# ── MAIN LOOP ─────────────────────────────────────────────────────────────────

def validate_config():
    """Check config before starting."""
    errors = []
    if CONFIG["NBSENSE_TOKEN"] == "YOUR_BEARER_TOKEN_HERE":
        errors.append("NBSENSE_TOKEN not set")
    if CONFIG["ROOM_ID"] == "YOUR-ROOM-UUID-HERE":
        errors.append("ROOM_ID not set (get from Supabase → cold_storage_rooms → id)")
    if errors:
        log.error("❌ Configuration errors:")
        for e in errors:
            log.error("   • %s", e)
        log.error("")
        log.error("Edit CONFIG in this file or set env vars:")
        log.error("  NBSENSE_TOKEN=xxx ROOM_ID=yyy python nbsense_ingestion.py")
        raise SystemExit(1)


def main():
    print("")
    print("╔══════════════════════════════════════════════════════════╗")
    print("║     ColdSense × NBSense Ingestion Service                ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"  NBSense API:  {CONFIG['NBSENSE_BASE']}")
    print(f"  Meter ID:     {CONFIG['METER_ID']}")
    print(f"  Sensor Name:  {CONFIG['SENSOR_NAME']}")
    print(f"  MQTT Broker:  {CONFIG['MQTT_BROKER']}:{CONFIG['MQTT_PORT']}")
    print(f"  Room ID:      {CONFIG['ROOM_ID']}")
    print(f"  Poll Every:   {CONFIG['POLL_INTERVAL']}s")
    print("")

    validate_config()

    # Connect to MQTT
    log.info("🔌 Connecting to MQTT broker...")
    client = connect_mqtt()

    cycle = 0
    log.info("🚀 Starting ingestion loop (Ctrl+C to stop)\n")

    try:
        while True:
            cycle += 1
            log.info("─── Cycle #%d (%s) ──────────────────────────",
                     cycle, datetime.now().strftime("%H:%M:%S"))

            # Fetch from NBSense
            reading = fetch_latest_reading()

            if reading:
                # Publish to MQTT
                publish_to_mqtt(client, reading)
            else:
                log.warning("⚠️  No reading fetched this cycle, skipping publish")

            log.info("⏳ Next poll in %ds...\n", CONFIG["POLL_INTERVAL"])
            time.sleep(CONFIG["POLL_INTERVAL"])

    except KeyboardInterrupt:
        log.info("\n🛑 Stopped after %d cycles.", cycle)
    finally:
        client.loop_stop()
        client.disconnect()
        log.info("✅ Disconnected.")


if __name__ == "__main__":
    main()
