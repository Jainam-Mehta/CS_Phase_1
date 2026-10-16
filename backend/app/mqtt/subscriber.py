"""
ColdSense MQTT Subscriber - NEW ARCHITECTURE
Topic Formats Supported:
1. General: coldsense/{gateway}/{location_code}/{site_code}/{room_code}
   Example: coldsense/gw1/MHNKIGP01/S01/R01
   
2. Gateway-Specific with Details: cdsense/{gateway}/{location_code}/{site_code}/{room_code}
   Example: cdsense/gw1/MHNKIGP01/S01/R01
   (Uses 'cdsense' prefix for this specific gateway)

3. Gateway-Specific Simplified: cdsense/{site_code}/{room_code}
   Example: cdsense/S01/R01
   (Uses 'gw-default' as gateway_id when specific gateway not in topic)

Payload: Aggregated message with ALL room sensors:
{
    "TS": "261012144329",
    "fver": 0.1,
    "SS": -77,
    "device": [
        {"id": 1, "slave_id": 1, "data": {"Temp1": "25.5", "Humidity1": "65.0"}},
        {"id": 2, "slave_id": 3, "data": {"Temp3": "26.2", "Humidity3": "62.5"}},
        {"id": 3, "slave_id": 2, "data": {"Temp2": "24.8", "Hum2": "61.0"}},
        {"id": 4, "slave_id": 4, "data": {"voltage4": "230", "currentN": "0.5"}}
    ],
    "DIGI": "Off"
}

KEY CHANGES:
1. Parse codes (S01, R01) from topic and resolve to UUIDs
2. Process aggregated device array (not separate topics per sensor)
3. Track slave_id for each reading to prevent consolidation
4. Update sensor_devices with slave_id filter (not blanket updates)
5. Support gateway-specific topic names (coldsense, cdsense, or both)
6. Flexible parsing: supports both full and simplified gateway topic formats
"""

import json
import logging
import threading
import re
import sys
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT
from app.database.supabase import supabase

logger = logging.getLogger(__name__)


class Color:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'


SUBSCRIBE_TOPICS = ["coldsense/#", "cdsense/#"]


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        msg = f"✓ MQTT connected to {MQTT_BROKER}:{MQTT_PORT}"
        logger.info(msg)
        print(f"\n{Color.GREEN}{msg}{Color.END}")
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic)
        print(f"{Color.GREEN}✓ Subscribed to: {', '.join(SUBSCRIBE_TOPICS)}{Color.END}\n")
    else:
        logger.error("✗ MQTT connection failed: rc=%s", rc)
        print(f"{Color.RED}✗ Connection failed: {rc}{Color.END}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%s). Auto-reconnecting...", rc)


def on_message(client, userdata, msg):
    """
    Main MQTT message handler for NEW aggregated payload format.
    
    Flow:
    1. Parse topic: coldsense/gw1/MHNKIGP01/S01/R01
    2. Resolve codes to UUIDs: S01→site_uuid, R01→room_uuid
    3. Parse aggregated payload
    4. Process each device in array
    5. Update sensor_devices with slave_id filter (CRITICAL FIX)
    6. Store in cold_storage_conditions with sensor_id reference
    """
    try:
        topic = msg.topic
        payload_raw = msg.payload.decode()
        timestamp_received = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
        
        print(f"\n{Color.BOLD}{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}")
        print(f"{Color.GREEN}📨 MQTT MESSAGE RECEIVED{Color.END} [{timestamp_received}]")
        print(f"{Color.CYAN}Topic: {topic}{Color.END}")
        
        # Parse JSON payload
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError as e:
            logger.error("JSON decode error: %s | payload: %s", e, payload_raw[:200])
            print(f"{Color.RED}✗ Invalid JSON{Color.END}")
            return
        
        print(f"{Color.BLUE}Payload structure:{Color.END}")
        print(f"  - Timestamp: {payload.get('TS')}")
        print(f"  - Firmware: {payload.get('fver')}")
        print(f"  - Signal: {payload.get('SS')} dBm")
        print(f"  - Devices: {len(payload.get('device', []))} found")
        
        # ─── STEP 1: PARSE TOPIC FORMAT ──────────────────────────────────
        # Supports THREE formats:
        # 1. coldsense/{gateway}/{location_code}/{site_code}/{room_code}
        #    Example: coldsense/gw1/MHNKIGP01/S01/R01
        # 2. cdsense/{gateway}/{location_code}/{site_code}/{room_code}
        #    Example: cdsense/gw1/MHNKIGP01/S01/R01 (gateway-specific prefix)
        # 3. cdsense/{site_code}/{room_code}
        #    Example: cdsense/S01/R01 (uses 'gw-default' as gateway_id)
        
        parts = topic.split("/")
        topic_prefix = parts[0] if parts else ""
        
        # Determine topic format
        if (topic_prefix == "coldsense" or topic_prefix == "cdsense") and len(parts) == 5:
            # Format 1 or 2: Full topic with gateway and location_code
            gateway_id = parts[1]           # gw1
            location_code = parts[2]        # MHNKIGP01
            site_code = parts[3]            # S01
            room_code = parts[4]            # R01
            logger.info("✓ Parsed %s topic (full): gw=%s, location=%s, site_code=%s, room_code=%s",
                       topic_prefix, gateway_id, location_code, site_code, room_code)
        elif topic_prefix == "cdsense" and len(parts) == 3:
            # Format 3: Gateway-specific topic (simplified, no gateway/location in topic)
            site_code = parts[1]            # S01
            room_code = parts[2]            # R01
            gateway_id = "gw-default"       # Default gateway identifier
            location_code = "DEFAULT"       # Generic location code
            logger.info("✓ Parsed cdsense topic (gateway-specific simplified): site_code=%s, room_code=%s",
                       site_code, room_code)
        else:
            logger.warning("Invalid topic format: %s (expected: [coldsense|cdsense]/gw/loc/site/room or cdsense/site/room)", topic)
            print(f"{Color.RED}✗ Invalid topic format: {topic}{Color.END}")
            return
        
        print(f"{Color.GREEN}✓ Parsed topic components (Gateway: {gateway_id}){Color.END}")
        print(f"  - Prefix: {topic_prefix}")
        print(f"  - Site Code: {site_code}")
        print(f"  - Room Code: {room_code}")
        
        # ─── STEP 2: RESOLVE CODES TO UUIDs ──────────────────────────────
        # Use sensor_location_mapping table to convert S01→uuid, R01→uuid
        
        # Resolve site_code to site_id
        site_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id") \
            .eq("location_code", site_code) \
            .eq("code_type", "site") \
            .limit(1) \
            .execute()
        
        if not site_mapping.data:
            logger.error("❌ Site code '%s' not found in sensor_location_mapping", site_code)
            print(f"{Color.RED}✗ Site code {site_code} not mapped{Color.END}")
            print(f"{Color.YELLOW}  Run setup script to add mapping{Color.END}")
            return
        
        site_id = site_mapping.data[0]["mapped_entity_id"]
        
        # Resolve room_code to room_id
        room_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id") \
            .eq("site_id", site_id) \
            .eq("location_code", room_code) \
            .eq("code_type", "room") \
            .limit(1) \
            .execute()
        
        if not room_mapping.data:
            logger.error("❌ Room code '%s' not found for site '%s'", room_code, site_id)
            print(f"{Color.RED}✗ Room code {room_code} not mapped for site{Color.END}")
            return
        
        room_id = room_mapping.data[0]["mapped_entity_id"]
        
        logger.info("✓ Resolved: site_id=%s (from %s), room_id=%s (from %s)",
                   site_id, site_code, room_id, room_code)
        print(f"{Color.GREEN}✓ Resolved codes to UUIDs{Color.END}")
        print(f"  - {site_code} → {site_id}")
        print(f"  - {room_code} → {room_id}")
        
        # ─── STEP 3: PROCESS AGGREGATED PAYLOAD ──────────────────────────
        # Payload structure: {"device": [{"id": 1, "slave_id": 1, "data": {...}}, ...]}
        
        if "device" not in payload or not isinstance(payload["device"], list):
            logger.warning("Invalid payload: missing 'device' array")
            print(f"{Color.RED}✗ Payload missing 'device' array{Color.END}")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        devices = payload["device"]
        total_sensors = 0
        
        print(f"\n{Color.BLUE}Processing {len(devices)} device(s):{Color.END}")
        
        # Process each device in the aggregated array
        for device_obj in devices:
            device_id = device_obj.get("id")
            slave_id = device_obj.get("slave_id")
            data = device_obj.get("data", {})
            
            if not data:
                logger.debug("Device %s has no data, skipping", device_id)
                continue
            
            logger.debug("Processing device_id=%s, slave_id=%s", device_id, slave_id)
            print(f"  • Device {device_id} (Slave {slave_id}): {len(data)} sensors")
            
            # ─── STEP 4: PROCESS EACH SENSOR IN THIS DEVICE ───────────────
            # data = {"Temp1": "25.5", "Humidity1": "65.0"} OR 
            #        {"Temp2": "24.8", "Hum2": "61.0"}
            
            for mqtt_key, raw_value in data.items():
                try:
                    # Convert value to float
                    try:
                        value = float(raw_value) if isinstance(raw_value, (int, float, str)) else raw_value
                    except (ValueError, TypeError):
                        logger.warning("Cannot convert %s to float for key %s", raw_value, mqtt_key)
                        value = raw_value
                    
                    # Map MQTT key to sensor type
                    sensor_type, unit = _map_mqtt_key_to_sensor(mqtt_key)
                    if not sensor_type:
                        logger.debug("Skipping unknown MQTT key: %s", mqtt_key)
                        continue
                    
                    # Extract sensor number (Temp1→1, Humidity2→2, etc.)
                    sensor_number = _extract_sensor_number(mqtt_key)
                    
                    logger.debug("  → %s: %s=%s%s (sensor #%s)",
                               mqtt_key, sensor_type, value, unit, sensor_number)
                    
                    # ─── STEP 5: CRITICAL UPDATE WITH SLAVE_ID FILTER ────
                    # This is the FIX: Update ONLY this specific slave, not all sensors
                    _process_single_sensor(
                        room_id=room_id,
                        site_id=site_id,
                        gateway_id=gateway_id,
                        slave_id=slave_id,
                        device_id=device_id,
                        sensor_type=sensor_type,
                        sensor_number=sensor_number,
                        mqtt_key=mqtt_key,
                        value=value,
                        unit=unit,
                        timestamp=timestamp
                    )
                    
                    total_sensors += 1
                    
                except Exception as e:
                    logger.error("Error processing sensor %s: %s", mqtt_key, e)
                    continue
        
        # ─── STEP 6: PROCESS TOP-LEVEL DIGI FIELD (DOOR SENSOR) ──────────
        # Some gateways send door status at top level: "DIGI": "On" or "Off"
        if "DIGI" in payload:
            try:
                digi_value = payload.get("DIGI")
                digi_status = "open" if digi_value and digi_value.lower() in ("on", "1", "true") else "closed"
                
                # Find the Door sensor in this room with the last slave_id (or a default)
                door_sensors = supabase.table("sensor_devices") \
                    .select("id, slave_id") \
                    .eq("room_id", room_id) \
                    .eq("sensor_type", "Door") \
                    .order("created_at", {"ascending": False}) \
                    .limit(1) \
                    .execute()
                
                if door_sensors.data:
                    door_sensor = door_sensors.data[0]
                    door_slave_id = door_sensor.get("slave_id")
                    
                    # Use a high slave_id if not set (e.g., 100 for DIGI)
                    if not door_slave_id:
                        door_slave_id = 100
                    
                    logger.info("Processing DIGI door sensor: status=%s, slave_id=%s", digi_status, door_slave_id)
                    
                    _process_single_sensor(
                        room_id=room_id,
                        site_id=site_id,
                        gateway_id=gateway_id,
                        slave_id=door_slave_id,
                        device_id=999,  # Special ID for DIGI
                        sensor_type="Door",
                        sensor_number=None,
                        mqtt_key="DIGI",
                        value=digi_status,
                        unit="Status",
                        timestamp=timestamp
                    )
                    total_sensors += 1
                    print(f"  • DIGI (Door Sensor): {digi_status}")
                else:
                    logger.debug("No door sensor found in room for DIGI processing")
            except Exception as e:
                logger.warning("Error processing DIGI field: %s", e)
        
        # Update gateway status
        try:
            supabase.table("gateways").upsert({
                "site_id": site_id,
                "gateway_id": gateway_id,
                "status": "online",
                "last_heartbeat": timestamp
            }).execute()
            logger.debug("✓ Updated gateway heartbeat")
        except Exception as e:
            logger.warning("Failed to update gateway: %s", e)
        
        logger.info("✓ Processed %d total sensors from aggregated payload", total_sensors)
        print(f"\n{Color.GREEN}✓ Successfully processed {total_sensors} sensors{Color.END}")
        print(f"{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}\n")
        
    except Exception as e:
        logger.exception("✗ Unhandled error in on_message: %s", e)
        print(f"{Color.RED}✗ Error: {e}{Color.END}")


def _map_mqtt_key_to_sensor(mqtt_key: str) -> tuple:
    """Map MQTT payload key to (sensor_type, unit)."""
    key_lower = mqtt_key.lower()
    
    if key_lower.startswith(('temp', 't')) and not key_lower.endswith('_unit'):
        return ('Temperature', '°C')
    elif key_lower.startswith(('hum', 'h')) and not key_lower.endswith('_unit'):
        return ('Humidity', '%')
    elif key_lower.startswith(('voltage', 'volt', 'v_')):
        return ('Voltage', 'V')
    elif key_lower.startswith(('current', 'i_')):
        return ('Current', 'A')
    elif key_lower.startswith(('door', 'd_')):
        return ('Door', 'Status')
    elif key_lower.startswith(('pressure', 'psi', 'p_')):
        return ('Pressure', 'psi')
    
    return None, 'Unknown'


def _extract_sensor_number(mqtt_key: str) -> int:
    """Extract number from MQTT key (Temp1→1, Humidity2→2, etc.)."""
    match = re.search(r'(\d+)', mqtt_key)
    return int(match.group(1)) if match else None


def _process_single_sensor(
    room_id: str,
    site_id: str,
    gateway_id: str,
    slave_id: int,
    device_id: int,
    sensor_type: str,
    sensor_number: int,
    mqtt_key: str,
    value,
    unit: str,
    timestamp: str
) -> None:
    """
    Process ONE sensor reading (KEY FIX).
    
    Critical: Filter by slave_id when updating, not just sensor_type.
    This prevents all temperature sensors from showing the same value.
    """
    try:
        # ─── GET OR CREATE SENSOR_DEVICE (with slave_id) ─────────────────
        # KEY FIX: Query includes slave_id to get the correct sensor
        
        sensor_query = supabase.table("sensor_devices") \
            .select("id") \
            .eq("room_id", room_id) \
            .eq("sensor_type", sensor_type) \
            .eq("slave_id", slave_id) \
            .eq("gateway_id", gateway_id) \
            .limit(1) \
            .execute()
        
        if sensor_query.data:
            sensor_device_id = sensor_query.data[0]["id"]
            logger.debug("Found existing sensor_device: %s", sensor_device_id)
        else:
            # Create new sensor_device with slave_id
            sensor_name = f"{sensor_type} {sensor_number}" if sensor_number else sensor_type
            sensor_code = f"SN-{gateway_id}-{mqtt_key}-{int(datetime.now().timestamp() * 1000) % 1000000}"
            insert_result = supabase.table("sensor_devices").insert({
                "room_id": room_id,
                "site_id": site_id,
                "sensor_type": sensor_type,
                "sensor_name": sensor_name,
                "sensor_code": sensor_code,  # REQUIRED: Cannot be null
                "slave_id": slave_id,
                "device_id": device_id,
                "protocol": "MQTT",
                "mqtt_identifier": mqtt_key,
                "gateway_location_code": gateway_id,
                "gateway_id": gateway_id,
                "status": "Online",
                "last_reading": timestamp,
            }).execute()
            
            if insert_result.data:
                sensor_device_id = insert_result.data[0]["id"]
                logger.info("✓ Created sensor_device: %s (%s)", sensor_name, sensor_device_id)
            else:
                logger.error("Failed to create sensor_device for %s", mqtt_key)
                return
        
        # ─── UPDATE SENSOR_DEVICES (KEY FIX: with slave_id filter) ───────
        # Only update the specific sensor by slave_id, not all sensors of this type
        
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("sensor_devices").update({
            "last_reading": now,
            "last_reading_value": value,
            "last_reading_unit": unit,
            "status": "Online",
        }).eq("id", sensor_device_id).execute()
        
        logger.debug("✓ Updated sensor_device %s: %s%s", sensor_device_id, value, unit)
        
        # ─── INSERT INTO SENSOR_READINGS (history) ───────────────────────
        supabase.table("sensor_readings").insert({
            "room_sensor_id": sensor_device_id,
            "sensor_id": sensor_device_id,
            "reading_value": value,
            "unit": unit,
            "recorded_at": timestamp,
            "gateway_id": gateway_id,
            "slave_id": slave_id,
            "mqtt_payload_key": mqtt_key,
        }).execute()
        
        logger.debug("✓ Recorded in sensor_readings")
        
        # ─── INSERT INTO COLD_STORAGE_CONDITIONS (with sensor tracking) ───
        # NEW: Reference the specific sensor_device via sensor_id
        
        condition_data = {
            "room_id": room_id,
            "site_id": site_id,
            "gateway_id": gateway_id,
            "sensor_id": sensor_device_id,
            "slave_id": slave_id,
            "reading_source": f"{sensor_type}_{sensor_number}" if sensor_number else sensor_type,
            "sensor_type": sensor_type,
            "recorded_at": timestamp,
        }
        
        # Map value to appropriate column based on type
        if sensor_type == 'Temperature':
            condition_data["temperature"] = value
        elif sensor_type == 'Humidity':
            condition_data["humidity"] = value
        elif sensor_type == 'Voltage':
            condition_data["voltage"] = value
        elif sensor_type == 'Door':
            condition_data["door_status"] = str(value)
        elif sensor_type == 'Pressure':
            condition_data["suction_pressure"] = value
        
        supabase.table("cold_storage_conditions").insert(condition_data).execute()
        
        logger.info("✓ Stored in cold_storage_conditions: %s=%s%s (slave_id=%s)",
                   sensor_type, value, unit, slave_id)
        
    except Exception as e:
        logger.exception("Error processing sensor: %s", e)


def _build_client() -> mqtt.Client:
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
        client_id="ColdSense_Subscriber"
    )
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    return client


def start_subscriber():
    """Start MQTT subscriber in background daemon thread."""
    def _run():
        client = _build_client()
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            logger.info("🚀 MQTT subscriber started")
            client.loop_forever()
        except Exception as e:
            logger.error("✗ MQTT subscriber failed: %s", e)
    
    thread = threading.Thread(target=_run, daemon=True, name="mqtt-subscriber")
    thread.start()
    logger.info("MQTT subscriber thread launched")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        stream=sys.stdout,
    )
    print(f"\n{Color.BOLD}{Color.CYAN}")
    print("=" * 60)
    print("ColdSense MQTT Subscriber (NEW ARCHITECTURE)")
    print("=" * 60)
    print(f"{Color.END}")
    print(f"{Color.BLUE}Broker: {MQTT_BROKER}:{MQTT_PORT}{Color.END}")
    print(f"{Color.BLUE}Topic:  {SUBSCRIBE_TOPIC}{Color.END}\n")
    
    client = _build_client()
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        print(f"{Color.GREEN}✓ Connected. Listening...{Color.END}\n")
        client.loop_forever()
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}🛑 Stopped by user{Color.END}")
    except Exception as e:
        print(f"{Color.RED}❌ Error: {e}{Color.END}")
        sys.exit(1)
