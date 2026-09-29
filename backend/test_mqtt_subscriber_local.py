#!/usr/bin/env python3
"""
Local MQTT Subscriber Test Suite
─────────────────────────────────

This script tests the MQTT subscriber locally WITHOUT deploying to GCP.

Requirements:
  - mosquitto_pub and mosquitto_sub CLI tools (or use Python paho-mqtt library)
  - MQTT broker running on localhost:1883
  - Backend container running with Supabase connection
  - Test site and room created in Supabase

Test Flow:
  1. Verify MQTT broker is running
  2. Subscribe to test topics in background
  3. Publish test payloads
  4. Verify messages appear in logs
  5. Query Supabase to verify data was saved
  6. Verify frontend can display data

Usage:
  python test_mqtt_subscriber_local.py [--broker localhost] [--port 1883] [--verbose]
  
"""

import json
import subprocess
import time
import sys
import logging
from datetime import datetime, timezone, timedelta
import argparse
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration
DEFAULT_BROKER = "localhost"
DEFAULT_PORT = 1883
TEST_TIMEOUT_SECONDS = 30

# Test data (must match your Supabase site/room IDs)
TEST_SITE_ID = "site-001"
TEST_ROOM_ID = "room-001"
TEST_GATEWAY_ID = "gateway1"

# Color codes for terminal output
class Color:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    print(f"\n{Color.BOLD}{Color.HEADER}{'='*70}{Color.ENDC}")
    print(f"{Color.BOLD}{Color.HEADER}{text:^70}{Color.ENDC}")
    print(f"{Color.BOLD}{Color.HEADER}{'='*70}{Color.ENDC}\n")

def print_step(text: str):
    print(f"{Color.BOLD}{Color.OKCYAN}→ {text}{Color.ENDC}")

def print_success(text: str):
    print(f"{Color.OKGREEN}✓ {text}{Color.ENDC}")

def print_error(text: str):
    print(f"{Color.FAIL}✗ {text}{Color.ENDC}")

def print_warning(text: str):
    print(f"{Color.WARNING}⚠ {text}{Color.ENDC}")

def print_info(text: str):
    print(f"{Color.OKBLUE}ℹ {text}{Color.ENDC}")

def test_broker_connection(broker: str, port: int) -> bool:
    """Test if MQTT broker is accessible."""
    print_step(f"Testing MQTT broker connection: {broker}:{port}")
    
    try:
        import paho.mqtt.client as mqtt
        client = mqtt.Client(client_id="test_client")
        client.connect(broker, port, keepalive=5)
        client.disconnect()
        print_success(f"MQTT broker is running on {broker}:{port}")
        return True
    except Exception as e:
        print_error(f"Cannot connect to MQTT broker: {e}")
        print_warning("Make sure MQTT broker is running. Start it with:")
        print_warning("  Docker: docker run -it -p 1883:1883 eclipse-mosquitto")
        print_warning("  Or: mosquitto -p 1883")
        return False

def publish_test_payload(broker: str, port: int, topic: str, payload: dict, verbose: bool = False):
    """Publish a test MQTT message."""
    import paho.mqtt.client as mqtt
    
    payload_str = json.dumps(payload)
    
    def on_connect(client, userdata, flags, rc):
        if verbose:
            print_info(f"  Publisher connected with rc={rc}")
        client.publish(topic, payload_str, qos=1)
        if verbose:
            print_info(f"  Published to {topic}: {payload_str}")
        client.disconnect()
    
    def on_disconnect(client, userdata, rc):
        if verbose:
            print_info(f"  Publisher disconnected")
    
    client = mqtt.Client(client_id=f"test_pub_{int(time.time())}")
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    
    try:
        client.connect(broker, port, keepalive=5)
        client.loop_start()
        time.sleep(1)
        client.loop_stop()
        if verbose:
            print_success(f"Published: {topic} → {payload_str[:80]}")
    except Exception as e:
        print_error(f"Failed to publish {topic}: {e}")

def subscribe_and_monitor(broker: str, port: int, topic: str, duration: int = 10):
    """Subscribe to a topic and print received messages."""
    import paho.mqtt.client as mqtt
    
    messages_received = []
    start_time = time.time()
    
    def on_connect(client, userdata, flags, rc):
        print_info(f"  Subscriber connected")
        client.subscribe(topic, qos=1)
    
    def on_message(client, userdata, msg):
        elapsed = time.time() - start_time
        print_success(f"  Received on {msg.topic} (after {elapsed:.1f}s): {msg.payload.decode()[:100]}")
        messages_received.append(msg)
    
    client = mqtt.Client(client_id=f"test_sub_{int(time.time())}")
    client.on_connect = on_connect
    client.on_message = on_message
    
    try:
        client.connect(broker, port, keepalive=60)
        client.loop_start()
        
        print_info(f"Listening for {duration}s...")
        time.sleep(duration)
        
        client.loop_stop()
        client.disconnect()
        return messages_received
    except Exception as e:
        print_error(f"Failed to subscribe: {e}")
        return []

def test_single_sensor(broker: str, port: int, verbose: bool = False):
    """Test 1: Single temperature sensor."""
    print_header("Test 1: Single Temperature Sensor")
    
    topic = f"coldsense/{TEST_GATEWAY_ID}/{TEST_SITE_ID}/{TEST_ROOM_ID}/temp1"
    payload = {
        "value": 28.8,
        "unit": "°C",
        "sensor_id": "TEMP-001"
    }
    
    print_step(f"Publishing single sensor reading")
    print_info(f"Topic: {topic}")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")
    
    publish_test_payload(broker, port, topic, payload, verbose)
    time.sleep(2)
    
    print_success("Test 1 complete. Check backend logs for confirmation.")

def test_combined_sensor(broker: str, port: int, verbose: bool = False):
    """Test 2: Combined temp + humidity sensor."""
    print_header("Test 2: Combined Temperature + Humidity Sensor")
    
    topic = f"coldsense/{TEST_GATEWAY_ID}/{TEST_SITE_ID}/{TEST_ROOM_ID}/humidity_combo1"
    payload = {
        "temperature": 28.8,
        "humidity": 65.5,
        "temp_unit": "°C",
        "humidity_unit": "%",
        "sensor_id": "COMBO-001"
    }
    
    print_step(f"Publishing combined sensor reading")
    print_info(f"Topic: {topic}")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")
    
    publish_test_payload(broker, port, topic, payload, verbose)
    time.sleep(2)
    
    print_success("Test 2 complete. Check backend logs for 2 sensor readings (temp + humidity).")

def test_multiple_sensors(broker: str, port: int, verbose: bool = False):
    """Test 3: Multiple sensors in rapid succession."""
    print_header("Test 3: Multiple Sensors (Rapid Fire)")
    
    sensors = [
        ("temp1", {"value": 25.3, "unit": "°C", "sensor_id": "TEMP-001"}),
        ("humidity1", {"value": 72.1, "unit": "%", "sensor_id": "HUMID-001"}),
        ("pressure1", {"value": 1013.25, "unit": "hPa", "sensor_id": "PRESS-001"}),
        ("door1", {"value": "open", "sensor_id": "DOOR-001"}),
    ]
    
    print_step(f"Publishing {len(sensors)} sensors sequentially")
    
    for sensor_name, payload in sensors:
        topic = f"coldsense/{TEST_GATEWAY_ID}/{TEST_SITE_ID}/{TEST_ROOM_ID}/{sensor_name}"
        print_info(f"  [{sensor_name}] {json.dumps(payload)[:60]}")
        publish_test_payload(broker, port, topic, payload, verbose=False)
        time.sleep(1)
    
    print_success("Test 3 complete. All 4 sensors published.")

def test_multiple_gateways(broker: str, port: int, verbose: bool = False):
    """Test 4: Multiple gateways sending data."""
    print_header("Test 4: Multiple Gateways")
    
    gateways = ["gateway1", "gateway2"]
    sensors = ["temp1", "humidity1"]
    
    print_step(f"Publishing from {len(gateways)} gateways")
    
    for gw in gateways:
        for sensor in sensors:
            topic = f"coldsense/{gw}/{TEST_SITE_ID}/{TEST_ROOM_ID}/{sensor}"
            payload = {
                "value": 20.0 + len(gw),  # Slightly different values per gateway
                "unit": "°C" if "temp" in sensor else "%",
                "sensor_id": f"{sensor.upper()}-{gw.upper()}"
            }
            print_info(f"  [{gw}/{sensor}] value={payload['value']}")
            publish_test_payload(broker, port, topic, payload, verbose=False)
            time.sleep(0.5)
    
    print_success("Test 4 complete. Data from 2 gateways published.")

def test_timestamp_generation(broker: str, port: int, verbose: bool = False):
    """Test 5: Timestamp generation (backend should add timestamp)."""
    print_header("Test 5: Timestamp Generation (No timestamp in payload)")
    
    topic = f"coldsense/{TEST_GATEWAY_ID}/{TEST_SITE_ID}/{TEST_ROOM_ID}/temp_no_ts"
    payload = {
        "value": 29.5,
        "unit": "°C",
        "sensor_id": "TEMP-NO-TS"
        # Note: No "timestamp" field - backend should generate one
    }
    
    print_step(f"Publishing payload WITHOUT timestamp")
    print_info(f"Topic: {topic}")
    print_info(f"Payload: {json.dumps(payload, indent=2)}")
    print_warning("Backend should generate server timestamp")
    
    publish_test_payload(broker, port, topic, payload, verbose)
    time.sleep(2)
    
    print_success("Test 5 complete. Check backend logs - should show generated timestamp.")

def print_next_steps():
    """Print instructions for verification."""
    print_header("Next Steps for Verification")
    
    print_info("1. CHECK BACKEND LOGS")
    print_info("   docker logs coldsense-mqtt -f --tail=100")
    print_info("   Look for: ✓ Successfully processed sensor reading")
    print()
    
    print_info("2. QUERY SUPABASE - Sensor Readings")
    print_info(f"   SELECT * FROM sensor_readings")
    print_info(f"   WHERE recorded_at > now() - interval '5 minutes'")
    print_info(f"   ORDER BY recorded_at DESC LIMIT 20;")
    print()
    
    print_info("3. QUERY SUPABASE - Cold Storage Conditions")
    print_info(f"   SELECT * FROM cold_storage_conditions")
    print_info(f"   WHERE room_id = '{TEST_ROOM_ID}'")
    print_info(f"   ORDER BY recorded_at DESC LIMIT 10;")
    print()
    
    print_info("4. QUERY SUPABASE - Sensor Devices")
    print_info(f"   SELECT * FROM sensor_devices")
    print_info(f"   WHERE room_id = '{TEST_ROOM_ID}'")
    print_info(f"   ORDER BY last_seen DESC;")
    print()
    
    print_info("5. QUERY SUPABASE - Gateways")
    print_info(f"   SELECT * FROM gateways")
    print_info(f"   WHERE site_id = '{TEST_SITE_ID}'")
    print_info(f"   ORDER BY last_heartbeat DESC;")
    print()
    
    print_info("6. TEST FRONTEND")
    print_info(f"   Login → Select Site → View Dashboard")
    print_info(f"   Should see real-time temperature/humidity updates")

def main():
    parser = argparse.ArgumentParser(
        description="Local MQTT Subscriber Test Suite",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Run all tests against local broker
  python test_mqtt_subscriber_local.py
  
  # Run against remote broker with verbose output
  python test_mqtt_subscriber_local.py --broker 34.47.199.84 --port 1883 --verbose
  
  # Run only specific test
  python test_mqtt_subscriber_local.py --test single
  python test_mqtt_subscriber_local.py --test combined
  python test_mqtt_subscriber_local.py --test multiple
  python test_mqtt_subscriber_local.py --test gateways
  python test_mqtt_subscriber_local.py --test timestamp
        """
    )
    
    parser.add_argument("--broker", default=DEFAULT_BROKER, help=f"MQTT broker host (default: {DEFAULT_BROKER})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"MQTT broker port (default: {DEFAULT_PORT})")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--test", choices=["single", "combined", "multiple", "gateways", "timestamp", "all"],
                       default="all", help="Which test to run")
    parser.add_argument("--site-id", default=TEST_SITE_ID, help=f"Test site ID (default: {TEST_SITE_ID})")
    parser.add_argument("--room-id", default=TEST_ROOM_ID, help=f"Test room ID (default: {TEST_ROOM_ID})")
    parser.add_argument("--gateway-id", default=TEST_GATEWAY_ID, help=f"Test gateway ID (default: {TEST_GATEWAY_ID})")
    
    args = parser.parse_args()
    
    # Update globals
    global TEST_SITE_ID, TEST_ROOM_ID, TEST_GATEWAY_ID
    TEST_SITE_ID = args.site_id
    TEST_ROOM_ID = args.room_id
    TEST_GATEWAY_ID = args.gateway_id
    
    print_header("ColdSense MQTT Subscriber - Local Test Suite")
    print_info(f"Broker: {args.broker}:{args.port}")
    print_info(f"Site: {TEST_SITE_ID}, Room: {TEST_ROOM_ID}, Gateway: {TEST_GATEWAY_ID}")
    print_info(f"Verbose: {args.verbose}")
    
    # Step 1: Check broker connection
    if not test_broker_connection(args.broker, args.port):
        sys.exit(1)
    
    time.sleep(1)
    
    # Step 2: Run selected tests
    tests = {
        "single": test_single_sensor,
        "combined": test_combined_sensor,
        "multiple": test_multiple_sensors,
        "gateways": test_multiple_gateways,
        "timestamp": test_timestamp_generation,
    }
    
    if args.test == "all":
        for test_name, test_func in tests.items():
            try:
                test_func(args.broker, args.port, args.verbose)
                time.sleep(2)
            except Exception as e:
                print_error(f"Test {test_name} failed: {e}")
    else:
        test_func = tests[args.test]
        test_func(args.broker, args.port, args.verbose)
    
    # Step 3: Print next steps
    print_next_steps()
    
    print_header("Test Suite Complete")
    print_success("All test messages have been published.")
    print_info("Monitor backend logs and Supabase to verify data ingestion.")

if __name__ == "__main__":
    main()
