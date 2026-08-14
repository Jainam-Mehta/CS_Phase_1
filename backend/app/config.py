from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER")
MQTT_PORT = int(os.getenv("MQTT_PORT"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Door Threshold Configuration
DOOR_THRESHOLD_MINUTES = float(os.getenv("DOOR_THRESHOLD_MINUTES", "5"))

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")