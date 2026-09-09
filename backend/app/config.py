from dotenv import load_dotenv
import os
import sys

# Load environment variables from .env file
load_dotenv()


def _require(key: str) -> str:
    """Fetch a required env var and crash clearly if it's missing."""
    value = os.getenv(key)
    if not value:
        print(f"FATAL: Required environment variable '{key}' is not set.", file=sys.stderr)
        sys.exit(1)
    return value


def _int_env(key: str, default: int) -> int:
    """Safely parse an integer env var with a fallback default."""
    raw = os.getenv(key)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        print(
            f"WARNING: '{key}' has non-integer value '{raw}', using default {default}.",
            file=sys.stderr,
        )
        return default


# ── MQTT Configuration ────────────────────────────────────────────────────────
MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT: int = _int_env("MQTT_PORT", 1883)        # safe — no crash on missing/bad value
MQTT_TOPIC: str = os.getenv("MQTT_TOPIC", "coldsense/sensors")

# ── Supabase Configuration ────────────────────────────────────────────────────
SUPABASE_URL: str = _require("SUPABASE_URL")
SUPABASE_KEY: str = _require("SUPABASE_KEY")

# ── Door Threshold Configuration ─────────────────────────────────────────────
DOOR_THRESHOLD_MINUTES: float = float(os.getenv("DOOR_THRESHOLD_MINUTES", "5"))

# ── Logging ───────────────────────────────────────────────────────────────────
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
