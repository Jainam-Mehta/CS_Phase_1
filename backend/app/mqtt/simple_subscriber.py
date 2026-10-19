"""
Simple MQTT Subscriber - Direct to Supabase
Subscribes ONLY to: cdsense/gw1/MHNKIGP01/S01/R01
Parses payload and writes readings directly to cold_storage_conditions table
"""

import json
import logging
import threading
import sys
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT
from app.database.supabase import supabase

logger = logging.getLogger(__name__)

# HARDCODED - These are your specific IDs (Production)
SITE_CODE = "S01"
ROOM_CODE = "R01"
GATEWAY_ID = "gw1"
LOCATION_CODE = "MHNKIGP01"

# Production UUIDs - MHNKIGP001 facility
SITE_ID = "36ed749d-7c72-4e93-9074-19cfebd9ea09"  # MHNKIGP001
ROOM_ID = "59e5a40d-1526-433a-add3-e7f5acea96bb"  # RM-4939 (5000 kg capacity)

# Colors for terminal output
class Color:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'


def resolve_site_and_room():
    """Get the UUIDs for the test environment"""
    try:
        print(f"{Color.GREEN}✓ Site S01 → {SITE_ID}{Color.END}")
        print(f"{Color.GREEN}✓ Room R01 → {ROOM_ID}{Color.END}")
        return SITE_ID, ROOM_ID
    except Exception as e:
        print(f"{Color.RED}❌ Error: {e}{Color.END}")
        return None, None


def on_connect(client, userdata, flags, rc):
    """MQTT connection callback"""
    if rc == 0:
        topic = f"cdsense/{GATEWAY_ID}/{LOCATION_CODE}/{SITE_CODE}/{ROOM_CODE}"
        msg = f"✓ MQTT connected to {MQTT_BROKER}:{MQTT_PORT}"
        logger.info(msg)
        print(f"\n{Color.GREEN}{msg}{Color.END}")
        print(f"{Color.GREEN}✓ Subscribing to: {topic}{Color.END}\n")
        client.subscribe(topic)
    else:
        logger.error("✗ MQTT connection failed: rc=%s", rc)
        print(f"{Color.RED}✗ Connection failed: {rc}{Color.END}")


def on_disconnect(client, userdata, rc):
    """MQTT disconnect callback"""
    if rc != 0:
        logger.warning("MQTT unexpectedly disconnected (rc=%s). Auto-reconnecting...", rc)
        print(f"{Color.YELLOW}⚠ MQTT disconnected, reconnecting...{Color.END}")


def on_message(client, userdata, msg):
    """MQTT message callback - parse and store to Supabase"""
    try:
        topic = msg.topic
        payload_raw = msg.payload.decode()
        
        print(f"\n{Color.BOLD}{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}")
        print(f"{Color.GREEN}📨 MQTT MESSAGE RECEIVED{Color.END}")
        print(f"{Color.CYAN}Topic: {topic}{Color.END}")
        
        # Parse JSON
        try:
            payload = json.loads(payload_raw)
        except json.JSONDecodeError as e:
            logger.error("JSON decode error: %s | payload: %s", e, payload_raw[:200])
            print(f"{Color.RED}✗ Invalid JSON{Color.END}")
            return
        
        print(f"{Color.BLUE}Payload:{Color.END}")
        print(f"  - Timestamp: {payload.get('TS')}")
        print(f"  - Devices: {len(payload.get('device', []))} found")
        
        # Get site and room IDs
        site_id, room_id = userdata.get('site_id'), userdata.get('room_id')
        if not room_id:
            print(f"{Color.RED}❌ Room ID not set. Skipping message.{Color.END}")
            return
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Process each device in the payload
        devices = payload.get('device', [])
        print(f"{Color.BLUE}Processing {len(devices)} device(s):{Color.END}")
        
        for device_obj in devices:
            device_id = device_obj.get("id")
            slave_id = device_obj.get("slave_id")
            data = device_obj.get("data", {})
            
            if not data:
                continue
            
            print(f"  • Device {device_id} (Slave {slave_id}): {len(data)} sensors")
            
            # Process each sensor in the device
            for mqtt_key, raw_value in data.items():
                try:
                    # Convert value to float
                    value = float(raw_value) if isinstance(raw_value, (int, float, str)) else raw_value
                    
                    # Determine sensor type from MQTT key
                    key_lower = mqtt_key.lower()
                    
                    if "temp" in key_lower:
                        # Store as temperature
                        # Normalize: if > 100, divide by 100
                        if value > 100:
                            value = value / 100.0
                        
                        record = {
                            "room_id": room_id,
                            "site_id": site_id,
                            "gateway_id": GATEWAY_ID,
                            "slave_id": slave_id,
                            "device_id": device_id,
                            "sensor_type": "Temperature",
                            "temperature": value,
                            "recorded_at": timestamp
                        }
                        
                        supabase.table("cold_storage_conditions").insert(record).execute()
                        print(f"    ✅ {mqtt_key}: {value}°C → cold_storage_conditions")
                        logger.info(f"Stored temperature: {mqtt_key}={value}°C")
                        
                    elif "hum" in key_lower:
                        # Store as humidity
                        # Normalize: if > 100, divide by 100
                        if value > 100:
                            value = value / 100.0
                        
                        record = {
                            "room_id": room_id,
                            "site_id": site_id,
                            "gateway_id": GATEWAY_ID,
                            "slave_id": slave_id,
                            "device_id": device_id,
                            "sensor_type": "Humidity",
                            "humidity": value,
                            "recorded_at": timestamp
                        }
                        
                        supabase.table("cold_storage_conditions").insert(record).execute()
                        print(f"    ✅ {mqtt_key}: {value}% → cold_storage_conditions")
                        logger.info(f"Stored humidity: {mqtt_key}={value}%")
                    else:
                        print(f"    ⊘ {mqtt_key}: {value} (unknown sensor type, skipped)")
                        
                except ValueError as e:
                    logger.warning(f"Could not convert {mqtt_key}={raw_value} to float: {e}")
                    print(f"    ⚠ {mqtt_key}: invalid value {raw_value}")
                except Exception as e:
                    logger.error(f"Error storing {mqtt_key}: {e}")
                    print(f"    ❌ {mqtt_key}: error - {e}")
        
        print(f"{Color.GREEN}✓ Message processed{Color.END}\n")
        
    except Exception as e:
        logger.error(f"Error processing MQTT message: {e}")
        print(f"{Color.RED}❌ Error: {e}{Color.END}\n")


def _build_client(site_id, room_id):
    """Build MQTT client"""
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.user_data_set({"site_id": site_id, "room_id": room_id})
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    return client


def start_simple_subscriber():
    """Start the simple MQTT subscriber in a background thread"""
    
    print(f"\n{Color.BOLD}{Color.CYAN}ColdSense - Simple MQTT Subscriber{Color.END}")
    print(f"{Color.CYAN}Topic: cdsense/gw1/MHNKIGP01/S01/R01{Color.END}\n")
    
    # Resolve site and room IDs
    print(f"{Color.BLUE}Resolving site and room IDs...{Color.END}")
    site_id, room_id = resolve_site_and_room()
    
    if not site_id or not room_id:
        print(f"{Color.RED}❌ Could not resolve site/room IDs. Exiting.{Color.END}")
        return
    
    # Build and connect MQTT client
    client = _build_client(site_id, room_id)
    
    def mqtt_thread():
        try:
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as e:
            logger.error(f"MQTT thread error: {e}")
            print(f"{Color.RED}❌ MQTT thread error: {e}{Color.END}")
    
    # Start in background thread
    thread = threading.Thread(target=mqtt_thread, daemon=True)
    thread.start()
    print(f"{Color.GREEN}✓ Subscriber thread started{Color.END}")


if __name__ == "__main__":
    start_simple_subscriber()
    # Keep main thread alive
    try:
        while True:
            threading.Event().wait(1)
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}Shutting down...{Color.END}")
