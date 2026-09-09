import os
import sys
import time
import logging
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

LOGIN_ID = os.getenv("NBSENSE_LOGIN_ID")
PASSWORD = os.getenv("NBSENSE_PASSWORD")
BASE_URL = os.getenv("NBSENSE_API_BASE", "https://api.nbsense.in").rstrip("/")
POLL_INTERVAL = int(os.getenv("POLL_INTERVAL_SECONDS", "60"))

LOGIN_URL = f"{BASE_URL}/user/react/login"
LATEST_URL = f"{BASE_URL}/th_ms/get_latest_dashboard"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

logger = logging.getLogger("nbsense-collector")


def login() -> str:
    """Authenticate against NBSense and return the bearer token."""
    payload = {
        "password": PASSWORD,
        "device_type": "10",
        "device_model": "kubernetes",
        "fcm_token": "coldsense-ingestion",
        "id": LOGIN_ID,
    }

    response = requests.post(LOGIN_URL, data=payload, timeout=30)
    response.raise_for_status()

    body = response.json()

    if not body.get("success"):
        raise RuntimeError(f"NBSense login failed: {body}")

    token = body.get("token")
    if not token:
        raise RuntimeError("Login succeeded but no token was returned")

    logger.info("NBSense authentication successful")
    return token


def fetch_latest_dashboard(token: str) -> dict:
    """Fetch the latest dashboard telemetry."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }

    response = requests.get(
        LATEST_URL,
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()

    return response.json()


def print_telemetry(data: dict) -> None:
    """Print the actual sensor data returned by NBSense"""
    sensors = data.get("sensors", [])

    logger.info(
        "Dashboard summary: total=%s active=%s inactive=%s",
        data.get("total"),
        data.get("active"),
        data.get("inactive"),
    )

    if not sensors:
        logger.warning("No sensors returned by NBSense")
        return

    for sensor in sensors:
        logger.info(
            "Sensor=%s | ID=%s | Meter=%s | Temp=%s°C | Humidity=%s%% | Status=%s | LastSeen=%s",
            sensor.get("sensor_name"),
            sensor.get("sensor_id"),
            sensor.get("meter_id"),
            sensor.get("temperature"),
            sensor.get("humidity"),
            sensor.get("status"),
            sensor.get("last_seen"),
        )


def main() -> None:
    if not LOGIN_ID or not PASSWORD:
        logger.error("Missing NBSENSE_LOGIN_ID or NBSENSE_PASSWORD in .env")
        sys.exit(1)

    token = login()

    while True:
        try:
            timestamp = datetime.now(timezone.utc).isoformat()
            logger.info("Polling NBSense at %s", timestamp)

            data = fetch_latest_dashboard(token)
            print_telemetry(data)

        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response else "unknown"
            logger.error("HTTP error from NBSense: %s", status)

            # Token could have expired. Re-authenticate on 401.
            if status == 401:
                logger.warning("Token rejected; re-authenticating")
                try:
                    token = login()
                except Exception:
                    logger.exception("Re-authentication failed")

        except Exception:
            logger.exception("Collector cycle failed")

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()