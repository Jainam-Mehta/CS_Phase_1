"""
NBSense → MQTT Ingestion Collector
====================================
Logs into api.nbsense.in, fetches live temp+humidity,
and publishes readings to ColdSense MQTT broker.

Topic format:
  coldsense/{room_id}/Temperature/1   payload: {"value": 28.3, "unit": "°C"}
  coldsense/{room_id}/Humidity/1      payload: {"value": 56.9, "unit": "%"}
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
LOGIN_ID      = os.getenv("NBSENSE_LOGIN_ID")
PASSWORD      = os.getenv("NBSENSE_PASSWORD")
BASE_URL      = os.getenv("NBSENSE_API_BASE", "https://api.nbsense.in").rstrip("/")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "60"))
MQTT_BROKER   = os.getenv("MQTT_BROKER", "35.200.228.62")
MQTT_PORT     = int(os.getenv("MQTT_PORT", "1883"))
ROOM_ID       = os.getenv("ROOM_ID", "")

# Supabase direct connection
SUPABASE_URL  = "https://vzoypfctadgyflzwodmp.supabase.co"
SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDc5NzcsImV4cCI6MjEwMDcyMzk3N30.oL-WZUgX2FQ2hvmahkDkqQLCuqdGoctrZiN8BtFw6y8"

LOGIN_URL     = f"{BASE_URL}/user/react/login"
DASHBOARD_URL = f"{BASE_URL}/th_ms/get_latest_dashboard"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("nbsense-collector")

# ── MQTT setup ────────────────────────────────────────────────────────────────
try:
    import paho.mqtt.client as mqtt_lib
    MQTT_AVAILABLE = True
except ImportError:
    logger.warning("paho-mqtt not installed. Run: pip install paho-mqtt")
    MQTT_AVAILABLE = False

_mqtt_client = None


def connect_mqtt():
    global _mqtt_client
    if not MQTT_AVAILABLE:
        return None
    client = mqtt_lib.Client(client_id="ColdSense_Collector")
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        client.loop_start()
        time.sleep(1)
        logger.info("✅ MQTT connected to %s:%s", MQTT_BROKER, MQTT_PORT)
        _mqtt_client = client
        return client
    except Exception as e:
        logger.error("❌ MQTT connection failed: %s", e)
        logger.error("   Readings will be logged but NOT published to MQTT")
        return None


def publish(client, sensor_type: str, value: float, unit: str):
    if not client or not ROOM_ID or ROOM_ID == "YOUR-ROOM-UUID-HERE":
        return
    topic   = f"coldsense/{ROOM_ID}/{sensor_type}/1"
    payload = json.dumps({
        "value":     value,
        "unit":      unit,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source":    "nbsense_api",
    })
    result = client.publish(topic, payload, qos=1)
    if result.rc == 0:
        logger.info("  📤 %s → %s %s", topic, value, unit)
    else:
        logger.error("  ❌ Publish failed for %s", topic)


# ── NBSense API ───────────────────────────────────────────────────────────────
def login() -> str:
    payload = {
        "password":     PASSWORD,
        "device_type":  "10",
        "device_model": "kubernetes",
        "fcm_token":    "coldsense-ingestion",
        "id":           LOGIN_ID,
    }
    response = requests.post(LOGIN_URL, data=payload, timeout=30)
    response.raise_for_status()
    body = response.json()
    if not body.get("success"):
        raise RuntimeError(f"NBSense login failed: {body}")
    token = body.get("token")
    if not token:
        raise RuntimeError("Login succeeded but no token returned")
    logger.info("🔑 NBSense authenticated. Token: %s...%s", token[:8], token[-4:])
    return token


def fetch_sensors(token: str) -> list:
    headers  = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    response = requests.get(DASHBOARD_URL, headers=headers, timeout=30)
    response.raise_for_status()
    data    = response.json()
    sensors = data.get("sensors", [])
    logger.info(
        "📊 Dashboard: total=%s active=%s inactive=%s",
        data.get("total"), data.get("active"), data.get("inactive"),
    )
    return sensors


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    if not LOGIN_ID or not PASSWORD:
        logger.error("❌ Missing NBSENSE_LOGIN_ID or NBSENSE_PASSWORD in .env")
        sys.exit(1)

    if not ROOM_ID or ROOM_ID == "YOUR-ROOM-UUID-HERE":
        logger.warning("⚠️  ROOM_ID not set in .env - readings will NOT be saved to DB")
        logger.warning("   Set ROOM_ID=your-room-uuid in ingestion/.env")

    print("")
    print("╔══════════════════════════════════════════════════════╗")
    print("║     ColdSense × NBSense Live Ingestion               ║")
    print("╚══════════════════════════════════════════════════════╝")
    print(f"  NBSense:  {BASE_URL}")
    print(f"  MQTT:     {MQTT_BROKER}:{MQTT_PORT}")
    print(f"  Room ID:  {ROOM_ID or 'NOT SET'}")
    print(f"  Interval: {POLL_INTERVAL}s")
    print("")

    # Login
    token     = login()
    # Connect MQTT
    mqtt_conn = connect_mqtt()

    cycle = 0
    while True:
        try:
            cycle += 1
            logger.info("─── Cycle #%d (%s) ───────────────────────────",
                        cycle, datetime.now().strftime("%H:%M:%S"))

            sensors = fetch_sensors(token)

            if not sensors:
                logger.warning("No sensors returned")
            else:
                for sensor in sensors:
                    temp     = sensor.get("temperature")
                    humidity = sensor.get("humidity")
                    name     = sensor.get("sensor_name", "Unknown")
                    location = sensor.get("location", "")
                    status   = sensor.get("status", "Unknown")
                    last_seen= sensor.get("last_seen", "")

                    logger.info(
                        "🌡️  Sensor: %s | Location: %s | Temp: %s°C | Humidity: %s%% | Status: %s | Last: %s",
                        name, location, temp, humidity, status, last_seen,
                    )

                    # Publish to MQTT → subscriber → DB → dashboard
                    if temp is not None:
                        publish(mqtt_conn, "Temperature", float(temp), "°C")
                    if humidity is not None:
                        publish(mqtt_conn, "Humidity", float(humidity), "%")

        except requests.HTTPError as exc:
            status_code = exc.response.status_code if exc.response else "unknown"
            logger.error("HTTP error from NBSense: %s", status_code)
            if status_code == 401:
                logger.warning("Token expired, re-authenticating...")
                try:
                    token = login()
                except Exception:
                    logger.exception("Re-auth failed")

        except Exception:
            logger.exception("Collector cycle failed")

        logger.info("⏳ Next poll in %ds...\n", POLL_INTERVAL)
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
