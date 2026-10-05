"""
MQTT Subscriber — ColdSense Backend (Multi-Gateway Architecture)

Topic Format (5-part hierarchy):
  coldsense/{gateway_id}/{site_id}/{room_id}/{sensor_name}

Real Examples:
  coldsense/gateway1/site-001/room-001/temp1
  coldsense/gateway1/site-001/room-001/humidity_combo1
  coldsense/gateway2/site-002/room-001/door1

Payload Format (single sensor per topic):
  Standard sensor:
  {
    "value": 28.8,
    "unit": "°C",
    "timestamp": "2026-08-26T12:35:45Z",  (optional - backend generates if missing)
    "sensor_id": "TEMP-001"
  }

  Combined sensor (temp+humidity):
  {
    "temperature": 28.8,
    "humidity": 65.5,
    "temp_unit": "°C",
    "humidity_unit": "%",
    "timestamp": "2026-08-26T12:35:45Z",
    "sensor_id": "COMBO-001"
  }

Supports:
  - Multiple gateways per site
  - Multiple rooms per site
  - Multiple sensors per room
  - Combined sensors (auto-split into separate records)
"""

import json
import logging
import threading
import sys
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT
from app.services.sensor_service import save_sensor_reading, save_cold_storage_condition
from app.services.door_service import process_door_state_change

logger = logging.getLogger(__name__)

# Color codes for terminal output
class Color:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'

# Wildcard - catches ALL coldsense topics
SUBSCRIBE_TOPIC = "coldsense/#"  # Subscribes to all gateways, sites, rooms, sensors

# Sensor type normalization mapping (case-insensitive)
# Maps various gateway sensor type formats to canonical internal types
SENSOR_TYPE_MAPPING = {
    # Temperature variants
    'temperature': 'temperature',
    'temp': 'temperature',
    'temp_c': 'temperature',
    'temperature_c': 'temperature',
    'ambient_temperature': 'ambient_temperature',
    'ambient_temp': 'ambient_temperature',
    'ambient_temp_c': 'ambient_temperature',
    'ambient-temperature': 'ambient_temperature',
    'ambienttemperature': 'ambient_temperature',
    
    # Humidity variants
    'humidity': 'humidity',
    'humid': 'humidity',
    'humidity_rh': 'humidity',
    'ambient_humidity': 'ambient_humidity',
    'ambient_humid': 'ambient_humidity',
    'ambient_humidity_rh': 'ambient_humidity',
    'ambient-humidity': 'ambient_humidity',
    'ambienthumidity': 'ambient_humidity',
    
    # Pressure variants
    'pressure': 'pressure',
    'press': 'pressure',
    'suction_pressure': 'suction_pressure',
    'suctionpressure': 'suction_pressure',
    'suction-pressure': 'suction_pressure',
    'discharge_pressure': 'discharge_pressure',
    'dischargepressure': 'discharge_pressure',
    'discharge-pressure': 'discharge_pressure',
    
    # Door and compressor
    'door': 'door',
    'door_status': 'door',
    'doorstatus': 'door',
    'door-status': 'door',
    'compressor': 'compressor',
    'compressor_status': 'compressor',
    'compressorstatus': 'compressor',
    'compressor-status': 'compressor',
    
    # Energy and solar
    'energy': 'energy',
    'energy_consumption': 'energy',
    'consumption': 'energy',
    'kwh': 'energy',
    'kw_h': 'energy',
    'solar': 'solar',
    'solar_percentage': 'solar',
    'solarpercentage': 'solar',
    'solar-percentage': 'solar',
}


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        msg = f"✓ MQTT connected to {MQTT_BROKER}:{MQTT_PORT}"
        logger.info(msg)
        print(f"\n{Color.GREEN}{msg}{Color.END}")
        client.subscribe(SUBSCRIBE_TOPIC)
        msg = f"✓ Subscribed to wildcard topic: {SUBSCRIBE_TOPIC}"
        logger.info(msg)
        print(f"{Color.GREEN}{msg}{Color.END}\n")
    else:
        msg = f"✗ MQTT connection failed with code {rc}"
        logger.error(msg)
        print(f"{Color.RED}{msg}{Color.END}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%s). Auto-reconnecting...", rc)


def on_message(client, userdata, msg):
    """
    Process MQTT messages from IoT gateway.
    
    Topic: coldsense/{gateway_id}/{site_id}/{room_id}/{sensor_name}
    Payload: Single sensor with value OR combined sensor with temperature+humidity
    
    Handles 1-20+ sensors per room (each on separate topic).
    Automatically splits combined sensors into separate records.
    """
    try:
        topic = msg.topic
        payload_raw = msg.payload.decode()
        timestamp_received = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError as e:
            logger.error("✗ JSON decode error on topic %s: %s | raw: %s", topic, e, payload_raw[:200])
            print(f"{Color.RED}✗ JSON decode error: {e}{Color.END}")
            return
        
        # Print to console with colors
        print(f"\n{Color.BOLD}{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}")
        print(f"{Color.GREEN}📨 DATA RECEIVED{Color.END} [{timestamp_received}]")
        print(f"{Color.CYAN}Topic: {topic}{Color.END}")
        print(f"{Color.CYAN}QoS: {msg.qos}{Color.END}")
        print(f"{Color.BLUE}Payload (JSON):{Color.END}")
        print(json.dumps(payload, indent=2))
        
        logger.info("📨 MQTT message on topic: %s", topic)
        logger.debug("Payload: %s", payload)

        # ── Parse topic: coldsense / {gateway_id} / {site_id} / {room_id} / {sensor_name}
        parts = topic.split("/")
        
        if len(parts) != 5 or parts[0] != "coldsense":
            logger.warning("Invalid topic format: %s (expected: coldsense/gateway_id/site_id/room_id/sensor_name)", topic)
            print(f"{Color.YELLOW}⚠ Invalid topic format{Color.END}")
            return
        
        gateway_id = parts[1]
        site_id = parts[2]
        room_id = parts[3]
        sensor_name = parts[4]
        
        # Validate required fields
        if not all([gateway_id, site_id, room_id, sensor_name]):
            logger.warning("Missing required topic parts in: %s", topic)
            print(f"{Color.YELLOW}⚠ Missing topic parts{Color.END}")
            return
        
        print(f"{Color.YELLOW}Extracted Values:{Color.END}")
        for key, value in payload.items():
            print(f"  • {key}: {Color.BOLD}{value}{Color.END}")
        
        logger.info("✅ Parsed topic: gateway=%s, site=%s, room=%s, sensor=%s", 
                   gateway_id, site_id, room_id, sensor_name)
        
        # ── Validate schema early ──────────────────────────────────────────
        if not isinstance(payload, dict):
            logger.warning("Payload is not a dict: %s", type(payload))
            return
        
        # ── Transform GCP payload format to standard format ─────────────────
        # GCP sends short names: {"Temp": "29.5", "Hum": "45.70", ...}
        # Transform to: {"temperature": 29.5, "humidity": 45.70}
        if "Temp" in payload or "Hum" in payload:
            transformed = {}
            
            # Map Temp → temperature
            if "Temp" in payload:
                try:
                    transformed["temperature"] = float(payload["Temp"])
                except (ValueError, TypeError):
                    logger.warning("Could not convert Temp to float: %s", payload["Temp"])
                    transformed["temperature"] = payload["Temp"]
            
            # Map Hum → humidity
            if "Hum" in payload:
                try:
                    transformed["humidity"] = float(payload["Hum"])
                except (ValueError, TypeError):
                    logger.warning("Could not convert Hum to float: %s", payload["Hum"])
                    transformed["humidity"] = payload["Hum"]
            
            payload = transformed
            logger.info("✓ Transformed GCP payload: %s", payload)
            print(f"{Color.BLUE}✓ Mapped GCP format (Temp/Hum) → standard format (temperature/humidity){Color.END}")
        
        # ── Validate room exists and belongs to the site ───────────────────
        try:
            from app.database.supabase import supabase
            
            room_check = supabase.table("cold_storage_rooms") \
                .select("id, site_id") \
                .eq("id", room_id) \
                .eq("site_id", site_id) \
                .limit(1) \
                .execute()
            
            if not room_check.data:
                logger.error(
                    "✗ Invalid room_id=%s for site_id=%s — room not found or doesn't belong to site",
                    room_id, site_id
                )
                print(f"{Color.RED}✗ Room not found or doesn't belong to site{Color.END}")
                return
            
            logger.debug("✓ Validated: room_id=%s belongs to site_id=%s", room_id, site_id)
            print(f"{Color.GREEN}✓ Room validated{Color.END}")
        except Exception as e:
            logger.error("Failed to validate room/site relationship: %s", e)
            print(f"{Color.YELLOW}⚠ Could not validate room (continuing anyway): {e}{Color.END}")
        
        # ── Update gateway heartbeat (optional) ────────────────────────────
        try:
            _update_gateway_heartbeat(site_id, gateway_id)
        except Exception as e:
            logger.warning("Failed to update gateway heartbeat: %s", e)
        
        # ── Parse payload and extract values ───────────────────────────────
        # ALWAYS use server time, ignore payload timestamp (GCP device time is unreliable)
        timestamp = datetime.now(timezone.utc).isoformat()
        sensor_id = payload.get("sensor_id", sensor_name)
        
        # ── UNIVERSAL SENSOR HANDLER ──────────────────────────────────────
        # Maps GCP payload keys to sensor types and processes all sensors
        
        from app.database.supabase import supabase
        now = datetime.now(timezone.utc).isoformat()
        
        # Define payload key → (sensor_type, unit) mapping
        payload_mapping = {
            # Temperature & Humidity (both GCP format and standard format)
            "Temp": ("Temperature", "°C"),
            "temperature": ("Temperature", "°C"),
            "Hum": ("Humidity", "%"),
            "humidity": ("Humidity", "%"),
            
            # Door sensors (both formats: Door1/Door2 and SlaveNo for door count)
            "Door1": ("Door", "Status"),
            "Door2": ("Door", "Status"),
            "Door3": ("Door", "Status"),
            "Door4": ("Door", "Status"),
            "SlaveNo": ("Door", "Status"),  # Door sensor count/number
            
            # Gas sensors
            "CO2": ("CO2", "ppm"),
            "Oxygen": ("Oxygen", "%"),
            "O2": ("Oxygen", "%"),
            "Ammonia": ("Ammonia", "ppm"),
            "Ethylene": ("Ethylene", "ppm"),
            
            # Pressure sensors
            "Pressure": ("Pressure", "psi"),
            "SuctionPressure": ("SuctionPressure", "psi"),
            "DischargePressure": ("DischargePressure", "psi"),
            
            # Power & Energy
            "Battery": ("Battery", "%"),
            "Solar": ("Solar", "W"),
            "Energy": ("Energy", "kWh"),
            
            # Environmental
            "AmbientTemperature": ("AmbientTemperature", "°C"),
            "AmbientHumidity": ("AmbientHumidity", "%"),
        }
        
        sensors_processed = 0
        
        # Process each key in payload
        for payload_key, (sensor_type, default_unit) in payload_mapping.items():
            if payload_key in payload:
                try:
                    value = payload[payload_key]
                    unit = payload.get(f"{payload_key}_unit", default_unit)
                    
                    # Convert to float for numeric types
                    try:
                        value_numeric = float(value)
                    except (ValueError, TypeError):
                        # For non-numeric (like door status), keep as-is
                        value_numeric = value
                    
                    # Update sensor_devices table
                    supabase.table("sensor_devices").update({
                        "last_reading": now,
                        "last_reading_value": value_numeric,
                        "last_reading_unit": unit,
                        "status": "Online",
                        "gateway_id": gateway_id,
                    }).eq("room_id", room_id).eq("sensor_type", sensor_type).eq("gateway_id", gateway_id).execute()
                    
                    logger.info("✓ Updated %s sensor: value=%s%s", sensor_type, value_numeric, unit)
                    print(f"{Color.GREEN}✓ {sensor_type}: {value_numeric}{unit}{Color.END}")
                    sensors_processed += 1
                    
                except Exception as e:
                    logger.error("Error processing %s: %s", payload_key, e)
                    print(f"{Color.YELLOW}⚠ Error processing {payload_key}: {e}{Color.END}")
        
        # Special handling: combined temp+humidity in ONE database row
        if "temperature" in payload or "Temp" in payload:
            temp_key = "temperature" if "temperature" in payload else "Temp"
            hum_key = "humidity" if "humidity" in payload else "Hum"
            
            if hum_key in payload:
                try:
                    temp_value = float(payload[temp_key])
                    humidity_value = float(payload[hum_key])
                    
                    condition_data = {
                        "site_id": site_id,
                        "room_id": room_id,
                        "gateway_id": gateway_id,
                        "temperature": temp_value,
                        "humidity": humidity_value,
                        "recorded_at": timestamp,
                    }
                    
                    resp = supabase.table("cold_storage_conditions").insert(condition_data).execute()
                    if resp.data:
                        logger.info("✓ Saved temp+humidity to cold_storage_conditions")
                        print(f"{Color.GREEN}✓ Archived to cold_storage_conditions{Color.END}")
                    
                except (ValueError, TypeError) as e:
                    logger.warning("Could not save combined temp+humidity: %s", e)
        
        # Handle case where no recognized keys were found
        if sensors_processed == 0:
            logger.warning("No recognized sensor keys in payload: %s", payload)
            print(f"{Color.YELLOW}⚠ No recognized sensor keys found{Color.END}")
            return
        
        logger.info("✓ Successfully processed %d sensor(s)", sensors_processed)
        print(f"{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}\n")

    except Exception as e:
        logger.exception("✗ Unhandled error in on_message: %s", e)
        print(f"{Color.RED}✗ Error: {e}{Color.END}")


def _normalize_sensor_type(sensor_name: str) -> str | None:
    """
    Map sensor_name from topic to canonical sensor_type (capitalized to match database format).
    
    Examples:
      temp1 → Temperature
      humidity_combo1 → Humidity (for combined, we split separately)
      door1 → Door
      pressure1 → Pressure
    """
    name_lower = sensor_name.lower().replace('-', '_').replace(' ', '')
    
    # Temperature
    if any(x in name_lower for x in ['temp', 'temperature']):
        return 'Temperature'
    
    # Humidity
    if any(x in name_lower for x in ['humid', 'humidity']):
        return 'Humidity'
    
    # Pressure
    if 'pressure' in name_lower or 'suction' in name_lower or 'discharge' in name_lower:
        if 'discharge' in name_lower:
            return 'DischargePressure'
        if 'suction' in name_lower:
            return 'SuctionPressure'
        return 'Pressure'
    
    # Door
    if any(x in name_lower for x in ['door', 'gate']):
        return 'Door'
    
    # CO2
    if 'co2' in name_lower or 'carbon' in name_lower:
        return 'CO2'
    
    # Oxygen
    if 'oxygen' in name_lower or 'o2' in name_lower:
        return 'Oxygen'
    
    # Energy
    if any(x in name_lower for x in ['energy', 'kwh', 'consumption', 'power']):
        return 'Energy'
    
    # Solar
    if 'solar' in name_lower or 'panel' in name_lower:
        return 'Solar'
    
    # Motion
    if 'motion' in name_lower or 'pir' in name_lower:
        return 'Motion'
    
    # Compressor
    if 'compressor' in name_lower or 'compresser' in name_lower:
        return 'Compressor'
    
    # Unknown
    logger.warning("Could not normalize sensor type for: %s", sensor_name)
    return None


def _process_sensor_reading(
    gateway_id: str,
    site_id: str,
    room_id: str,
    sensor_name: str,
    sensor_type: str,
    value: any,
    unit: str,
    timestamp: str,
    sensor_id: str
) -> None:
    """
    Process a single sensor reading:
    1. Create/update sensor_device record
    2. Save to sensor_readings (history)
    3. Aggregate into cold_storage_conditions
    """
    from app.database.supabase import supabase
    from app.services.sensor_service import save_sensor_reading, save_cold_storage_condition
    
    try:
        # 1. Get or create sensor_device
        sensor_device_id = _get_or_create_sensor_device(
            room_id=room_id,
            sensor_name=sensor_name,
            sensor_type=sensor_type,
            gateway_id=gateway_id,
            sensor_id=sensor_id
        )
        
        if not sensor_device_id:
            logger.error("Failed to get/create sensor_device for %s", sensor_name)
            return
        
        # 2. Update last reading in sensor_devices
        now = datetime.now(timezone.utc).isoformat()
        try:
            supabase.table("sensor_devices").update({
                "last_reading": now,
                "last_reading_value": value,
                "last_reading_unit": unit,
                "status": "Online",
                "gateway_id": gateway_id,
            }).eq("id", sensor_device_id).execute()
            
            logger.debug("✓ Updated sensor_device %s with reading: %s %s", sensor_device_id, value, unit)
            print(f"{Color.GREEN}✓ Updated sensor_devices table: {sensor_name} = {value}{unit}{Color.END}")
        except Exception as e:
            logger.error("Failed to update sensor_device: %s", e)
            print(f"{Color.YELLOW}⚠ Could not update sensor_devices (continuing): {e}{Color.END}")
        
        # 3. Save to sensor_readings for history
        try:
            save_sensor_reading({
                "room_sensor_id": sensor_device_id,
                "reading_value": value,
                "unit": unit,
                "recorded_at": timestamp,
                "gateway_id": gateway_id,
            })
        except Exception as e:
            logger.error("Failed to save sensor_reading: %s", e)
        
        # 4. Aggregate into cold_storage_conditions
        condition_data = {
            "site_id": site_id,
            "room_id": room_id,
            "gateway_id": gateway_id,
            "recorded_at": timestamp,
        }
        
        # Map sensor type to condition field
        if sensor_type == 'temperature':
            condition_data["temperature"] = value
        elif sensor_type == 'humidity':
            condition_data["humidity"] = value
        elif sensor_type == 'door':
            condition_data["door_status"] = str(value)
        elif sensor_type == 'pressure':
            condition_data["suction_pressure"] = value
        elif sensor_type == 'co2':
            condition_data["co2_level"] = value
        elif sensor_type == 'energy':
            condition_data["energy_consumption_kwh"] = value
        elif sensor_type == 'solar':
            condition_data["solar_percentage"] = value
        
        try:
            save_cold_storage_condition(condition_data)
        except Exception as e:
            logger.error("Failed to save cold_storage_condition: %s", e)
        
        logger.info("✓ Processed sensor reading: %s=%s%s via %s", 
                   sensor_name, value, unit, gateway_id)
        
    except Exception as e:
        logger.exception("Error processing sensor reading: %s", e)


def _get_or_create_sensor_device(
    room_id: str,
    sensor_name: str,
    sensor_type: str,
    gateway_id: str,
    sensor_id: str
) -> str | None:
    """
    Get or create a sensor_device record.
    Returns the sensor_device ID.
    """
    from app.database.supabase import supabase
    
    try:
        # Try to find existing sensor by room + sensor_name + gateway
        result = supabase.table("sensor_devices").select("id").eq("room_id", room_id).eq("sensor_name", sensor_name).eq("gateway_id", gateway_id).limit(1).execute()
        
        if result.data:
            return result.data[0]["id"]
        
        # Create new sensor_device
        insert_result = supabase.table("sensor_devices").insert({
            "room_id": room_id,
            "sensor_name": sensor_name,
            "sensor_type": sensor_type,
            "gateway_id": gateway_id,
            "sensor_code": sensor_id,
            "status": "Online",
            "last_reading": datetime.now(timezone.utc).isoformat(),
        }).select().execute()
        
        if insert_result.data:
            logger.info("✓ Created sensor_device: %s (%s)", sensor_name, insert_result.data[0]["id"])
            return insert_result.data[0]["id"]
        else:
            logger.error("Failed to create sensor_device")
            return None
            
    except Exception as e:
        logger.error("Error in _get_or_create_sensor_device: %s", e)
        return None


def _update_gateway_heartbeat(site_id: str, gateway_id: str) -> None:
    """
    Update or create gateway heartbeat record.
    Used to track which gateways are online.
    """
    from app.database.supabase import supabase
    
    try:
        # Try to update existing gateway
        update_result = supabase.table("gateways").update({
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            "status": "online",
        }).eq("site_id", site_id).eq("gateway_id", gateway_id).execute()
        
        # If no rows updated, try to insert new gateway
        if not update_result.data:
            supabase.table("gateways").insert({
                "site_id": site_id,
                "gateway_id": gateway_id,
                "status": "online",
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            }).execute()
            logger.debug("✓ Created gateway record: %s", gateway_id)
        else:
            logger.debug("✓ Updated gateway heartbeat: %s", gateway_id)
            
    except Exception as e:
        logger.warning("Failed to update gateway heartbeat: %s", e)


def _build_client() -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
        client_id="ColdSense_Subscriber"
    )
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
    print(f"\n{Color.BOLD}{Color.CYAN}")
    print("=" * 60)
    print("ColdSense MQTT Subscriber - Sensor Data Monitor")
    print("=" * 60)
    print(f"{Color.END}")
    print(f"{Color.BLUE}Broker: {MQTT_BROKER}:{MQTT_PORT}{Color.END}")
    print(f"{Color.BLUE}Topic:  {SUBSCRIBE_TOPIC}{Color.END}\n")

    client = _build_client()
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        print(f"{Color.GREEN}✓ Connected. Listening for sensor messages...{Color.END}\n")
        client.loop_forever()  # Blocks here indefinitely
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}🛑 Subscriber stopped by user{Color.END}")
    except Exception as e:
        print(f"{Color.RED}❌ Fatal error: {e}{Color.END}")
        sys.exit(1)
