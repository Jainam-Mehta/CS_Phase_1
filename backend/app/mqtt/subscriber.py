"""
ColdSense MQTT Subscriber - UNIVERSAL TOPIC FORMAT
Topic Format Supported:
CS/{gateway}/{pincode}/{site_code}/{room_code}
  Example: CS/gw1/110001/s001/r001
  
Flow:
1. Parse topic components
2. Look up locality by pincode to get location_code
3. Resolve s001 → site_uuid, r001 → room_uuid using sensor_location_mapping
4. Process aggregated device array

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
1. New universal topic format: CS/{gateway}/{pincode}/{site_code}/{room_code}
2. Site codes now lowercase with 3-digit padding: s001, s002, s003, etc.
3. Room codes now lowercase with 3-digit padding: r001, r002, r003, etc.
4. Pincode lookup from localities table for geographic reference
5. Flexible gateway assignment per site
6. Aggregated device processing with slave_id tracking
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


SUBSCRIBE_TOPICS = ["CS/#", "cs/#"]


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        msg = f"MQTT connected to {MQTT_BROKER}:{MQTT_PORT}"
        logger.info(msg)
        print(f"\n{Color.GREEN}{msg}{Color.END}")
        for topic in SUBSCRIBE_TOPICS:
            client.subscribe(topic)
        print(f"{Color.GREEN}Subscribed to: {', '.join(SUBSCRIBE_TOPICS)}{Color.END}\n")
    else:
        logger.error("MQTT connection failed: rc=%s", rc)
        print(f"{Color.RED}Connection failed: {rc}{Color.END}")


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
        
        print(f"\n{Color.BOLD}{Color.CYAN}MQTT MESSAGE RECEIVED{Color.END} [{timestamp_received}]")
        print(f"{Color.CYAN}Topic: {topic}{Color.END}")
        
        # Parse JSON payload
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError as e:
            logger.error("JSON decode error: %s | payload: %s", e, payload_raw[:200])
            print(f"{Color.RED}✗ Invalid JSON{Color.END}")
            return
        
        print(f"{Color.BLUE}Payload structure:{Color.END}")
        print(f"Timestamp: {payload.get('TS')}")
        print(f"Firmware: {payload.get('fver')}")
        print(f"Signal: {payload.get('SS')} dBm")
        print(f"Devices: {len(payload.get('device', []))} found")
        
        # ─── STEP 1: PARSE TOPIC FORMAT ──────────────────────────────────
        # Universal format: CS/{gateway}/{pincode}/{site_code}/{room_code}
        # Example: CS/gw1/110001/s001/r001
        # Parts: [CS, gw1, 110001, s001, r001]
        
        parts = topic.split("/")
        topic_prefix = parts[0] if parts else ""
        
        # Validate topic format
        if (topic_prefix.upper() == "CS") and len(parts) == 5:
            # Valid format: CS/gw1/110001/s001/r001
            gateway_id = parts[1].lower()           # gw1
            pincode = parts[2]                      # 110001
            site_code = parts[3].lower()            # s001
            room_code = parts[4].lower()            # r001
            logger.info("✓ Parsed universal topic: gw=%s, pincode=%s, site_code=%s, room_code=%s",
                       gateway_id, pincode, site_code, room_code)
        else:
            logger.warning("Invalid topic format: %s (expected: CS/{gw}/{pincode}/{site_code}/{room_code})", topic)
            print(f"{Color.RED}Invalid topic format: {topic}{Color.END}")
            print(f"{Color.YELLOW}Expected: CS/gw1/110001/s001/r001{Color.END}")
            return
        
        print(f"{Color.GREEN}Parsed topic components (Gateway: {gateway_id}){Color.END}")
        print(f"Pincode: {pincode}")
        print(f"Site Code: {site_code}")
        print(f"Room Code: {room_code}")
        
        # ─── STEP 2: RESOLVE CODES TO UUIDs ──────────────────────────────
        # Step 2a: Look up locality by pincode to get location reference
        # Step 2b: Use sensor_location_mapping to convert site_code→site_uuid, room_code→room_uuid
        
        # Step 2a: Get location_code from pincode lookup (for reference)
        try:
            locality_lookup = supabase.table("localities") \
                .select("id, name") \
                .eq("pincode", pincode) \
                .limit(1) \
                .execute()
            
            if locality_lookup.data:
                location_name = locality_lookup.data[0]["name"]
                logger.info("Pincode %s resolved to locality: %s", pincode, location_name)
                print(f"{Color.GREEN}Pincode to Location: {location_name}{Color.END}")
            else:
                logger.warning("Pincode %s not found in localities table", pincode)
                location_name = "UNKNOWN"
        except Exception as e:
            logger.warning("Could not lookup pincode %s: %s", pincode, e)
            location_name = "UNKNOWN"
        
        # Step 2b: Resolve site_code to site_id using sensor_location_mapping
        site_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id") \
            .eq("location_code", site_code) \
            .eq("code_type", "site") \
            .limit(1) \
            .execute()
        
        if not site_mapping.data:
            logger.error("Site code '%s' not found in sensor_location_mapping", site_code)
            print(f"{Color.RED}Site code {site_code} not mapped{Color.END}")
            print(f"{Color.YELLOW}Please create site in the app or run setup script{Color.END}")
            return
        
        site_id = site_mapping.data[0]["mapped_entity_id"]
        
        # Step 2c: Resolve room_code to room_id
        room_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id") \
            .eq("site_id", site_id) \
            .eq("location_code", room_code) \
            .eq("code_type", "room") \
            .limit(1) \
            .execute()
        
        if not room_mapping.data:
            logger.error("Room code '%s' not found for site '%s'", room_code, site_id)
            print(f"{Color.RED}Room code {room_code} not mapped for site{Color.END}")
            return
        
        room_id = room_mapping.data[0]["mapped_entity_id"]
        
        logger.info("Resolved: site_id=%s (from %s), room_id=%s (from %s)",
                   site_id, site_code, room_id, room_code)
        print(f"{Color.GREEN}Resolved codes to UUIDs{Color.END}")
        print(f"{site_code} to {site_id}")
        print(f"{room_code} to {room_id}")
        
        # ─── STEP 3: PROCESS AGGREGATED PAYLOAD ──────────────────────────
        # Payload structure: {"device": [{"id": 1, "slave_id": 1, "data": {...}}, ...]}
        
        if "device" not in payload or not isinstance(payload["device"], list):
            logger.warning("Invalid payload: missing 'device' array")
            print(f"{Color.RED}Payload missing 'device' array{Color.END}")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        devices = payload["device"]
        total_sensors = 0
        
        print(f"\nProcessing {len(devices)} device(s):")
        
        # Process each device in the aggregated array
        for device_obj in devices:
            device_id = device_obj.get("id")
            slave_id = device_obj.get("slave_id")
            data = device_obj.get("data", {})
            
            if not data:
                logger.debug("Device %s has no data, skipping", device_id)
                continue
            
            logger.debug("Processing device_id=%s, slave_id=%s", device_id, slave_id)
            print(f"Device {device_id} (Slave {slave_id}): {len(data)} sensors")
            
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
                    
                    # Skip if sensor_type is not supported (e.g., Voltage, Current)
                    if not sensor_type:
                        logger.debug("Skipping unsupported MQTT key: %s (no database mapping)", mqtt_key)
                        continue
                    
                    # ✅ APPLY SITE-SPECIFIC SCALING (e.g., Nashik site needs 0.01 factor, Slave 3 needs 0.001)
                    value = _apply_site_specific_scaling(site_id, sensor_type, value, slave_id)
                    
                    logger.debug("  → %s: %s=%s%s (sensor #%s, after scaling)",
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
                    .ilike("sensor_type", "Door") \
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
            }, on_conflict="site_id,gateway_id").execute()
            logger.debug("✓ Updated gateway heartbeat")
        except Exception as e:
            logger.warning("Failed to update gateway: %s", e)
        
        logger.info("Processed %d total sensors from aggregated payload", total_sensors)
        print(f"\nSuccessfully processed {total_sensors} sensors\n")
        
    except Exception as e:
        logger.exception("Unhandled error in on_message: %s", e)
        print(f"{Color.RED}Error: {e}{Color.END}")


def _map_mqtt_key_to_sensor(mqtt_key: str) -> tuple:
    """Map MQTT payload key to (sensor_type, unit).
    
    Note: Only returns sensor types that are in the database constraint.
    Voltage and Current readings are skipped (no database columns for them yet).
    """
    key_lower = mqtt_key.lower()
    
    if key_lower.startswith(('temp', 't')) and not key_lower.endswith('_unit'):
        return ('Temperature', '°C')
    elif key_lower.startswith(('hum', 'h')) and not key_lower.endswith('_unit'):
        return ('Humidity', '%')
    elif key_lower.startswith(('voltage', 'volt', 'v_')):
        # Voltage readings skipped - no database column support yet
        return None, 'Unknown'
    elif key_lower.startswith(('current', 'i_')):
        # Current readings skipped - no database column support yet
        return None, 'Unknown'
    elif key_lower.startswith(('door', 'd_')):
        return ('Door', 'Status')
    elif key_lower.startswith(('pressure', 'psi', 'p_')):
        # Changed from 'Pressure' to 'SuctionPressure' for consistency with frontend
        return ('SuctionPressure', 'psi')
    
    return None, 'Unknown'


def _apply_site_specific_scaling(site_id: str, sensor_type: str, value: float, slave_id: int = None) -> float:
    """
    Apply site-specific and slave-specific scaling factors.
    
    Some gateways send raw values that need scaling:
    - Nashik site (796b7749-d427-4563-b90a-aa0170afd835):
      - Slaves 1, 2: Multiply by 0.01 for Temperature/Humidity (raw values 100x scaled)
      - Slave 3: No scaling (raw values already correct, different sensor model)
    - Other sites: Use values as-is
    """
    # Nashik site ID
    NASHIK_SITE_ID = "796b7749-d427-4563-b90a-aa0170afd835"
    
    if site_id == NASHIK_SITE_ID:
        if sensor_type in ('Temperature', 'Humidity'):
            # Slave 3: Different sensor model, 10x scaled (needs 0.1 multiplier)
            if slave_id == 3:
                return value * 0.1
            # Slaves 1, 2: Standard 0.01 scaling (100x scaled raw values)
            elif slave_id in (1, 2):
                return value * 0.01
            # Default: Use 0.01 if slave_id not specified
            else:
                return value * 0.01
    
    return value


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
    Process ONE sensor reading with RESILIENT MATCHING.
    
    ✅ Key improvements:
    1. Case-insensitive sensor_type matching (.ilike instead of .eq)
    2. Ignores gateway_id if existing sensor has it as NULL (self-healing)
    3. Fallback matching: If no slave_id match, try unassigned sensor by name
    4. Auto-pairs unassigned sensors with incoming slave_id (learning)
    """
    try:
        sensor_device_id = None
        
        # ─── PRIORITY A: Match by room_id, sensor_type (case-insensitive), and slave_id ───
        logger.debug("PRIORITY A: Matching sensor_type=%s, slave_id=%s", sensor_type, slave_id)
        
        sensor_query = supabase.table("sensor_devices") \
            .select("id, gateway_id, slave_id") \
            .eq("room_id", room_id) \
            .ilike("sensor_type", sensor_type) \
            .eq("slave_id", slave_id) \
            .limit(1) \
            .execute()
        
        if sensor_query.data:
            sensor_device_id = sensor_query.data[0]["id"]
            logger.info("✓ PRIORITY A matched: Found existing sensor_device %s", sensor_device_id)
            
            # Self-healing: If gateway_id was NULL, adopt the incoming gateway_id
            if not sensor_query.data[0].get("gateway_id") and gateway_id:
                try:
                    supabase.table("sensor_devices").update({
                        "gateway_id": gateway_id
                    }).eq("id", sensor_device_id).execute()
                    logger.debug("✓ Adopted gateway_id=%s for sensor %s", gateway_id, sensor_device_id)
                except Exception as e:
                    logger.warning("Could not update gateway_id: %s", e)
        else:
            # ─── PRIORITY B: Match unassigned manual sensor by type and number ───
            logger.debug("PRIORITY A no match. Trying PRIORITY B: unassigned sensor by name.")
            
            search_name = f"%{sensor_number}%" if sensor_number else "%"
            unassigned_query = supabase.table("sensor_devices") \
                .select("id") \
                .eq("room_id", room_id) \
                .ilike("sensor_type", sensor_type) \
                .is_("slave_id", "null") \
                .ilike("sensor_name", search_name) \
                .limit(1) \
                .execute()
            
            if unassigned_query.data:
                sensor_device_id = unassigned_query.data[0]["id"]
                logger.info("✓ PRIORITY B matched: Found unassigned sensor_device %s", sensor_device_id)
                
                # Self-healing: Adopt the slave_id and gateway_id
                try:
                    supabase.table("sensor_devices").update({
                        "slave_id": slave_id,
                        "gateway_id": gateway_id,
                    }).eq("id", sensor_device_id).execute()
                    logger.info("✓ Paired unassigned sensor %s with slave_id=%s, gateway_id=%s", 
                               sensor_device_id, slave_id, gateway_id)
                except Exception as e:
                    logger.warning("Could not pair unassigned sensor: %s", e)
            else:
                logger.debug("PRIORITY B no match. Will attempt auto-create.")
        
        # ─── UPDATE SENSOR_DEVICES WITH LATEST READING ───────────────────────
        if sensor_device_id:
            now = datetime.now(timezone.utc).isoformat()
            try:
                supabase.table("sensor_devices").update({
                    "last_reading_value": value,
                    "last_reading_unit": unit,
                    "last_seen": now,
                }).eq("id", sensor_device_id).execute()
                
                logger.debug("Updated sensor_device %s: %s%s", sensor_device_id, value, unit)
            except Exception as e:
                logger.warning("Error updating sensor_device: %s", e)
        
        # ─── INSERT INTO SENSOR_READINGS (if sensor exists) ──────────────────
        if sensor_device_id:
            try:
                supabase.table("sensor_readings").insert({
                    "sensor_id": sensor_device_id,
                    "room_id": room_id,
                    "reading_value": value,
                    "unit": unit,
                    "recorded_at": timestamp,
                    "gateway_id": gateway_id,
                    "slave_id": slave_id,
                    "mqtt_payload_key": mqtt_key,
                }).execute()
                
                logger.debug("✓ Recorded in sensor_readings")
            except Exception as e:
                logger.warning("Error recording sensor_readings: %s", e)
        
        # ─── INSERT INTO COLD_STORAGE_CONDITIONS (always succeeds) ───────────
        try:
            condition_data = {
                "room_id": room_id,
                "site_id": site_id,
                "recorded_at": timestamp,
            }
            
            # Map value to appropriate column based on type and sensor number
            # Only insert columns that exist in schema, skip unknown sensors
            if sensor_type.lower() == 'temperature' and sensor_number:
                condition_data[f"temperature_{sensor_number}"] = value
            elif sensor_type.lower() == 'humidity' and sensor_number:
                condition_data[f"humidity_{sensor_number}"] = value
            elif sensor_type.lower() == 'door_status' or (sensor_type.lower() == 'door' and sensor_number):
                condition_data[f"door_status_{sensor_number}"] = str(value)
            elif sensor_type.lower() == 'suction_pressure':
                condition_data["suction_pressure"] = value
            elif sensor_type.lower() == 'discharge_pressure':
                condition_data["discharge_pressure"] = value
            else:
                # Skip unmapped sensor types (oxygen, co2, etc. if not in schema)
                logger.debug("Skipping unmapped sensor type for cold_storage_conditions: %s", sensor_type)
                return
            
            supabase.table("cold_storage_conditions").insert(condition_data).execute()
            
            logger.info("Stored in cold_storage_conditions: %s=%s%s", sensor_type, value, unit)
        except Exception as e:
            logger.warning("Error storing cold_storage_conditions: %s", e)
        
    except Exception as e:
        logger.warning("Error processing sensor (non-fatal): %s", e)


def _build_client() -> mqtt.Client:
    from app.config import MQTT_USER, MQTT_PASSWORD
    
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
        client_id="ColdSense_Subscriber"
    )
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    
    # Set username and password if provided
    if MQTT_USER and MQTT_PASSWORD:
        client.username_pw_set(MQTT_USER, MQTT_PASSWORD)
    
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
    print("ColdSense MQTT Subscriber")
    print("=" * 60)
    print(f"{Color.END}")
    print(f"{Color.BLUE}Broker: {MQTT_BROKER}:{MQTT_PORT}{Color.END}")
    print(f"{Color.BLUE}Topics: {', '.join(SUBSCRIBE_TOPICS)}{Color.END}\n")
    
    client = _build_client()
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        print(f"{Color.GREEN}Connected. Listening...{Color.END}\n")
        client.loop_forever()
    except KeyboardInterrupt:
        print(f"\nStopped by user")
    except Exception as e:
        print(f"{Color.RED}Error: {e}{Color.END}")
        sys.exit(1)
