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
from datetime import datetime, timezone, timedelta

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
        
        # Step 2a: Skip pincode lookup - not needed, just for reference
        logger.info("Topic parsed: Gateway=%s, Pincode=%s, Site=%s, Room=%s", 
                   gateway_id, pincode, site_code, room_code)
        print(f"{Color.GREEN}Parsed topic components (Gateway: {gateway_id}){Color.END}")
        print(f"Pincode: {pincode}")
        print(f"Site Code: {site_code}")
        print(f"Room Code: {room_code}")
        
        # Step 2b: Resolve site_code to site_id
        # Strategy: 
        # 1. Try sensor_location_mapping first (new format: location_code=s001)
        # 2. If not found, query all sites for this pincode and match by counter (s001=1st site, s002=2nd, etc.)
        # 3. Auto-create mapping for next time
        
        site_id = None
        
        # Try 1: Direct lookup in sensor_location_mapping (new format: s001)
        site_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id, site_id") \
            .eq("location_code", site_code) \
            .eq("code_type", "site") \
            .limit(1) \
            .execute()
        
        if site_mapping.data:
            site_id = site_mapping.data[0]["mapped_entity_id"]
            logger.info("Found site via sensor_location_mapping: %s", site_id)
        else:
            # Try 2: Query sites by pincode, then match by site counter (s001 = 1st site, s002 = 2nd site, etc.)
            # Extract numeric counter from site_code (e.g., s001 → 1)
            site_counter = None
            match = re.search(r'(\d+)', site_code)
            if match:
                site_counter = int(match.group(1))  # s001 → 1
            
            if site_counter:
                logger.debug("Extracted site counter from %s: %d", site_code, site_counter)
                
                # Query all sites for this pincode, ordered by creation time
                sites_response = supabase.table("sites") \
                    .select("id, site_code") \
                    .ilike("site_code", f"%{pincode}%") \
                    .order("created_at", desc=False) \
                    .execute()
                
                logger.debug("Found %d sites for pincode %s", len(sites_response.data or []), pincode)
                
                if sites_response.data and len(sites_response.data) >= site_counter:
                    # Get the Nth site (1-indexed)
                    site_id = sites_response.data[site_counter - 1]["id"]
                    site_code_in_db = sites_response.data[site_counter - 1]["site_code"]
                    logger.info("Found site via counter match (position %d): %s (site_code=%s)", 
                               site_counter, site_id, site_code_in_db)
                    
                    # Auto-create the mapping for next time
                    try:
                        supabase.table("sensor_location_mapping").insert({
                            "site_id": site_id,
                            "location_code": site_code,
                            "code_type": "site",
                            "mapped_entity_id": site_id
                        }).execute()
                        logger.info("Created sensor_location_mapping entry for site %s", site_code)
                    except Exception as e:
                        logger.debug("Mapping already exists or error: %s", e)
        
        if not site_id:
            logger.error("Site code '%s' not found for pincode '%s'", site_code, pincode)
            print(f"{Color.RED}Site code {site_code} not found for pincode {pincode}{Color.END}")
            print(f"{Color.YELLOW}Check database: sites with pincode {pincode}{Color.END}")
            return
        
        # Verify the site belongs to this pincode (safety check)
        site_check = supabase.table("sites") \
            .select("id, locality_id") \
            .eq("id", site_id) \
            .limit(1) \
            .execute()
        
        if site_check.data:
            locality_id = site_check.data[0]["locality_id"]
            # Verify pincode matches
            locality_check = supabase.table("localities") \
                .select("pincode") \
                .eq("id", locality_id) \
                .limit(1) \
                .execute()
            
            if locality_check.data and locality_check.data[0]["pincode"] != pincode:
                logger.error("Site %s pincode mismatch: expected %s, got %s", site_id, pincode, locality_check.data[0]["pincode"])
                print(f"{Color.RED}Pincode mismatch! Site belongs to different pincode{Color.END}")
                return
        
        # Step 2c: Resolve room_code to room_id using the site_id we just got
        # Strategy:
        # 1. Try sensor_location_mapping first (new format: location_code=r001)
        # 2. If not found, query rooms for this site and match by counter (r001=1st room, r002=2nd, etc.)
        # 3. Auto-create mapping for next time
        
        room_id = None
        
        # Try 1: Direct lookup in sensor_location_mapping (new format: r001)
        room_mapping = supabase.table("sensor_location_mapping") \
            .select("mapped_entity_id") \
            .eq("site_id", site_id) \
            .eq("location_code", room_code) \
            .eq("code_type", "room") \
            .limit(1) \
            .execute()
        
        if room_mapping.data:
            room_id = room_mapping.data[0]["mapped_entity_id"]
            logger.info("Found room via sensor_location_mapping: %s", room_id)
        else:
            # Try 2: Query rooms for this site, then match by counter (r001 = 1st room, r002 = 2nd room, etc.)
            # Extract numeric counter from room_code (e.g., r001 → 1)
            room_counter = None
            match = re.search(r'(\d+)', room_code)
            if match:
                room_counter = int(match.group(1))  # r001 → 1, r002 → 2
            
            if room_counter:
                logger.debug("Extracted room counter from %s: %d", room_code, room_counter)
                
                # Query all rooms for this site, ordered by creation time
                rooms_response = supabase.table("cold_storage_rooms") \
                    .select("id, room_code") \
                    .eq("site_id", site_id) \
                    .order("created_at", desc=False) \
                    .execute()
                
                logger.debug("Found %d rooms for site %s", len(rooms_response.data or []), site_id)
                
                if rooms_response.data and len(rooms_response.data) >= room_counter:
                    # Get the Nth room (1-indexed)
                    room_id = rooms_response.data[room_counter - 1]["id"]
                    room_code_in_db = rooms_response.data[room_counter - 1]["room_code"]
                    logger.info("Found room via counter match (position %d): %s (room_code=%s)", 
                               room_counter, room_id, room_code_in_db)
                    
                    # Auto-create the mapping for next time
                    try:
                        supabase.table("sensor_location_mapping").insert({
                            "site_id": site_id,
                            "location_code": room_code,
                            "code_type": "room",
                            "mapped_entity_id": room_id
                        }).execute()
                        logger.info("Created sensor_location_mapping entry for room %s", room_code)
                    except Exception as e:
                        logger.debug("Mapping already exists or error: %s", e)
        
        if not room_id:
            logger.error("Room code '%s' not found for site '%s'", room_code, site_id)
            print(f"{Color.RED}Room code {room_code} not mapped for site{Color.END}")
            return
        
        logger.info("Resolved: site_id=%s (from %s), room_id=%s (from %s)",
                   site_id, site_code, room_id, room_code)
        print(f"{Color.GREEN}Resolved codes to UUIDs{Color.END}")
        print(f"{site_code} to {site_id}")
        print(f"{room_code} to {room_id}")
        
        # ─── STEP 3: AGGREGATED PAYLOAD PROCESSING ──────────────────────
        # Collect ALL sensor data from this MQTT message, then insert ONE row into cold_storage_conditions
        # This ensures sparse columns are properly populated in a single database row per room per timestamp
        
        if "device" not in payload or not isinstance(payload["device"], list):
            logger.warning("Invalid payload: missing 'device' array")
            print(f"{Color.RED}Payload missing 'device' array{Color.END}")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        devices = payload["device"]
        total_sensors = 0
        
        # Dictionary to collect all sensor data for this room/timestamp
        cold_storage_row = {
            "room_id": room_id,
            "site_id": site_id,
            "gateway_id": gateway_id,
            "recorded_at": timestamp,
        }
        
        print(f"\nProcessing {len(devices)} device(s):")
        
        # ─── STEP 4: COLLECT ALL SENSOR DATA ──────────────────────────────
        # Pass 1: Process all device sensor data
        for device_obj in devices:
            device_id = device_obj.get("id")
            slave_id = device_obj.get("slave_id")
            data = device_obj.get("data", {})
            
            if not data:
                logger.debug("Device %s has no data, skipping", device_id)
                continue
            
            logger.debug("Processing device_id=%s, slave_id=%s", device_id, slave_id)
            print(f"Device {device_id} (Slave {slave_id}): {len(data)} sensors")
            
            for mqtt_key, raw_value in data.items():
                try:
                    # Convert value to float
                    try:
                        value = float(raw_value) if isinstance(raw_value, (int, float, str)) else raw_value
                    except (ValueError, TypeError):
                        logger.warning("Cannot convert %s to float for key %s", raw_value, mqtt_key)
                        continue
                    
                    # Map MQTT key to sensor type
                    sensor_type, unit = _map_mqtt_key_to_sensor(mqtt_key)
                    if not sensor_type:
                        logger.debug("Skipping unknown MQTT key: %s", mqtt_key)
                        continue
                    
                    # Extract sensor number (Temp1→1, Humidity2→2, etc.)
                    sensor_number = _extract_sensor_number(mqtt_key)
                    
                    # Apply scaling - CRITICAL: This must happen BEFORE storing in cold_storage_conditions
                    value = _apply_site_specific_scaling(site_id, sensor_type, value, slave_id)
                    
                    logger.debug("  → %s: %s=%s (sensor #%s)", mqtt_key, sensor_type, value, sensor_number)
                    
                    # Add to cold_storage_row based on sensor type and number
                    # IMPORTANT: Store scaled values in cold_storage_conditions (used by dashboards)
                    if sensor_type.lower() == 'temperature' and sensor_number:
                        scaled_value = float(value) if isinstance(value, (int, float, str)) else value
                        cold_storage_row[f"temperature_{sensor_number}"] = round(scaled_value, 2)
                    elif sensor_type.lower() == 'humidity' and sensor_number:
                        scaled_value = float(value) if isinstance(value, (int, float, str)) else value
                        cold_storage_row[f"humidity_{sensor_number}"] = round(scaled_value, 2)
                    elif sensor_type.lower() in ('door', 'door_status') and sensor_number:
                        cold_storage_row[f"door_status_{sensor_number}"] = str(value)
                    elif sensor_type.lower() == 'suction_pressure':
                        cold_storage_row["suction_pressure"] = value
                    elif sensor_type.lower() == 'discharge_pressure':
                        cold_storage_row["discharge_pressure"] = value
                    
                    total_sensors += 1
                    
                    # Still process individual sensor records for sensor_readings table
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
                    
                except Exception as e:
                    logger.error("Error processing sensor %s: %s", mqtt_key, e)
                    continue
        
        # ─── STEP 5: PROCESS DOOR STATUS (DIGI or DOOR FIELD) ─────────────────────
        # Handle both DIGI (legacy) and door (current) fields
        door_value = payload.get("DIGI") or payload.get("door")
        
        if door_value:
            try:
                # INVERTED LOGIC: "On" means door is CLOSED (off/secure)
                door_status_text = "closed" if door_value and str(door_value).lower() in ("on", "1", "true") else "open"
                door_status_numeric = 0.0 if door_status_text == "closed" else 1.0
                
                logger.info("Processing door sensor: status=%s", door_status_text)
                
                # Find door sensor in this room and update it
                door_sensors = supabase.table("sensor_devices") \
                    .select("id") \
                    .eq("room_id", room_id) \
                    .ilike("sensor_type", "Door") \
                    .order("created_at", desc=False) \
                    .limit(1) \
                    .execute()
                
                if door_sensors.data:
                    door_device_id = door_sensors.data[0]["id"]
                    
                    # Update sensor_devices with door status (text)
                    supabase.table("sensor_devices").update({
                        "last_reading_value": door_status_numeric,  # Store as numeric for consistency
                        "last_reading_unit": "Status",
                        "last_seen": timestamp,
                        "status": "Online"
                    }).eq("id", door_device_id).execute()
                    
                    # Insert into sensor_readings (use numeric 0/1)
                    supabase.table("sensor_readings").insert({
                        "sensor_id": door_device_id,
                        "room_id": room_id,
                        "reading_value": door_status_numeric,  # 1.0 = open, 0.0 = closed
                        "unit": "Status",
                        "recorded_at": timestamp,
                        "gateway_id": gateway_id,
                        "mqtt_payload_key": "door",
                    }).execute()
                    
                    # Add to cold_storage_row for analytics (text format)
                    cold_storage_row["door_status_1"] = door_status_text
                    
                    logger.info("Updated door sensor: %s (numeric: %s)", door_status_text, door_status_numeric)
                    print(f"Door Sensor: {door_status_text}")
                    total_sensors += 1
                else:
                    logger.debug("No door sensor found in room for door processing")
                    
            except Exception as e:
                logger.warning("Error processing door field: %s", e)
                print(f"Error processing door: {e}")
        
        # ─── STEP 6: INSERT ONE ROW INTO COLD_STORAGE_CONDITIONS ─────────
        # All sensor data from this MQTT message is now in cold_storage_row
        # Insert it as a single sparse row
        if total_sensors > 0:
            try:
                supabase.table("cold_storage_conditions").insert(cold_storage_row).execute()
                logger.info("Stored cold_storage_conditions row with %d sensors", total_sensors)
                print(f"{Color.GREEN}Stored 1 row in cold_storage_conditions with {total_sensors} sensors{Color.END}")
            except Exception as e:
                logger.error("Error storing cold_storage_conditions: %s", e)
                print(f"{Color.RED}Error storing cold_storage_conditions: {e}{Color.END}")
        
        print(f"{Color.GREEN}Successfully processed {total_sensors} sensors{Color.END}")
        
        # ─── STEP 7: CHECK SENSOR THRESHOLDS FOR AUTO-ALERTS (NEW) ──────────────
        # Non-blocking: Exceptions caught, won't crash MQTT processing
        try:
            from app.services.sensor_service import check_sensor_thresholds
            
            # Check temperature sensors
            for i in range(1, 5):
                temp_key = f'temperature_{i}'
                if temp_key in cold_storage_row and cold_storage_row[temp_key] is not None:
                    check_sensor_thresholds(
                        room_id=room_id,
                        sensor_type='Temperature',
                        current_value=cold_storage_row[temp_key],
                        sensor_number=i
                    )
            
            # Check humidity sensors
            for i in range(1, 5):
                humidity_key = f'humidity_{i}'
                if humidity_key in cold_storage_row and cold_storage_row[humidity_key] is not None:
                    check_sensor_thresholds(
                        room_id=room_id,
                        sensor_type='Humidity',
                        current_value=cold_storage_row[humidity_key],
                        sensor_number=i
                    )
        
        except ImportError:
            logger.warning("sensor_service not available, skipping threshold checks")
        except Exception as e:
            # SAFETY: Never crash the MQTT loop due to alert processing
            logger.warning("Error checking sensor thresholds: %s", e)
        
        # Update gateway status (optional heartbeat tracking)
        try:
            # Insert without upsert to avoid constraint issues
            supabase.table("gateways").insert({
                "site_id": site_id,
                "gateway_id": gateway_id,
                "status": "online",
                "last_heartbeat": timestamp
            }).execute()
            logger.debug("Updated gateway heartbeat")
        except Exception as e:
            # Ignore duplicate key errors (gateway already exists)
            if "duplicate" in str(e).lower() or "unique" in str(e).lower():
                logger.debug("Gateway already tracked")
            else:
                logger.warning("Gateway tracking error: %s", e)
        
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
    
    Standard scaling for all sites:
    - Temperature/Humidity: Multiply by 0.01 (raw values sent as 100x, e.g., 2550 = 25.50°C)
    - Slave 3: Often uses different sensor, apply 0.1 multiplier instead
    - Other sensor types: Use as-is
    """
    
    # Apply scaling for Temperature and Humidity (most common case)
    if sensor_type in ('Temperature', 'Humidity', 'AmbientTemperature', 'AmbientHumidity'):
        # Slave 3 often has different sensor model (10x scaled)
        if slave_id == 3:
            return value * 0.1
        # Default: Standard 0.01 scaling for slaves 1, 2, 4, etc.
        else:
            return value * 0.01
    
    # Pressure values: often sent as 10x, needs 0.1 scaling
    if sensor_type in ('SuctionPressure', 'DischargePressure'):
        return value * 0.1
    
    # Other sensor types: use as-is
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
                
                logger.debug("Recorded in sensor_readings")
            except Exception as e:
                logger.warning("Error recording sensor_readings: %s", e)
        
        # ─── CHECK THRESHOLDS AND GENERATE ALERTS ────────────────────────────
        # Feature 1: Auto-generate sensor alerts when reading violates thresholds
        try:
            if sensor_type and sensor_number:
                # Query sensor_alert_thresholds for this room and sensor type
                thresholds_query = supabase.table("sensor_alert_thresholds") \
                    .select("id, product_id, min_value, max_value, alert_when_below, alert_when_above") \
                    .eq("room_id", room_id) \
                    .eq("sensor_type", sensor_type) \
                    .execute()
                
                if thresholds_query.data:
                    for threshold in thresholds_query.data:
                        product_id = threshold.get("product_id")
                        min_val = threshold.get("min_value")
                        max_val = threshold.get("max_value")
                        alert_when_below = threshold.get("alert_when_below", True)
                        alert_when_above = threshold.get("alert_when_above", True)
                        
                        # Get product name for alert description
                        product_name = "Unknown Product"
                        if product_id:
                            try:
                                prod_query = supabase.table("products").select("name").eq("id", product_id).maybeSingle().execute()
                                if prod_query.data:
                                    product_name = prod_query.data.get("name", "Unknown Product")
                            except Exception as e:
                                logger.debug(f"Could not fetch product name: {e}")
                        
                        # Check if reading violates thresholds
                        alert_triggered = False
                        alert_msg = ""
                        
                        if alert_when_below and min_val is not None and value < min_val:
                            alert_triggered = True
                            alert_msg = f"{product_name}: {sensor_type} {sensor_number} below minimum: {value} < {min_val}"
                        elif alert_when_above and max_val is not None and value > max_val:
                            alert_triggered = True
                            alert_msg = f"{product_name}: {sensor_type} {sensor_number} above maximum: {value} > {max_val}"
                        
                        # Generate alert if triggered
                        if alert_triggered:
                            try:
                                # Check if similar UNACKNOWLEDGED alert already exists (within last 15 minutes)
                                # This prevents alert flooding - only one alert per 15 min interval per sensor
                                fifteen_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=15)).isoformat()
                                existing_alert = supabase.table("sensor_alerts") \
                                    .select("id, created_at") \
                                    .eq("room_id", room_id) \
                                    .eq("sensor_type", sensor_type) \
                                    .eq("sensor_number", sensor_number) \
                                    .eq("acknowledged", False) \
                                    .gte("created_at", fifteen_min_ago) \
                                    .order("created_at", desc=True) \
                                    .limit(1) \
                                    .execute()
                                
                                # Only create new alert if no recent unacknowledged alert exists
                                # This means:
                                # - If alert acknowledged, new alert can be created immediately
                                # - If alert NOT acknowledged, wait 15 min before creating another one
                                if not existing_alert.data:
                                    # Get farmer_id and owner_id for visibility
                                    farmer_id = None
                                    owner_id = None
                                    
                                    try:
                                        # Get farmer who has access to this room
                                        farmer_access = supabase.table("farmer_room_access") \
                                            .select("farmer_id") \
                                            .eq("room_id", room_id) \
                                            .eq("status", "Approved") \
                                            .limit(1) \
                                            .execute()
                                        if farmer_access.data:
                                            farmer_id = farmer_access.data[0].get("farmer_id")
                                        
                                        # Get owner of the site (which owns this room)
                                        room_data = supabase.table("cold_storage_rooms") \
                                            .select("site_id") \
                                            .eq("id", room_id) \
                                            .maybeSingle() \
                                            .execute()
                                        
                                        if room_data.data:
                                            site_id = room_data.data.get("site_id")
                                            site_data = supabase.table("sites") \
                                                .select("owner_profile_id") \
                                                .eq("id", site_id) \
                                                .maybeSingle() \
                                                .execute()
                                            if site_data.data:
                                                owner_id = site_data.data.get("owner_profile_id")
                                    except Exception as e:
                                        logger.debug(f"Could not fetch farmer/owner IDs: {e}")
                                    
                                    alert_data = {
                                        "room_id": room_id,
                                        "alert_type": "sensor_threshold_violation",
                                        "severity": "warning",
                                        "title": f"{product_name}: {sensor_type} Threshold Violated",
                                        "description": alert_msg,
                                        "sensor_type": sensor_type,
                                        "sensor_number": sensor_number,
                                        "current_value": value,
                                        "min_value": min_val,
                                        "max_value": max_val,
                                        "status": "active",
                                        "acknowledged": False,
                                        "farmer_id": farmer_id,
                                        "owner_id": owner_id,
                                        "created_at": timestamp,
                                        "updated_at": timestamp,
                                    }
                                    
                                    supabase.table("sensor_alerts").insert(alert_data).execute()
                                    logger.info(f"🚨 ALERT GENERATED: {alert_msg} (farmer: {farmer_id}, owner: {owner_id})")
                                else:
                                    logger.debug(f"Alert suppressed: Recent unacknowledged alert exists for {sensor_type} {sensor_number} (last: {existing_alert.data[0].get('created_at')})")
                            except Exception as alert_err:
                                logger.warning(f"Error generating alert: {alert_err}")
        except Exception as e:
            logger.debug(f"Threshold check skipped (non-critical): {e}")
        
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
