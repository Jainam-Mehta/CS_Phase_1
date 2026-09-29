#!/usr/bin/env python3
"""
Subscribe to 'tum' topic on GCP MQTT Broker
Captures real sensor data (temperature + humidity) from your IoT sensor

Usage:
  python subscribe_to_tum.py

This will:
  1. Connect to GCP MQTT broker (34.47.199.84:1883)
  2. Subscribe to 'tum' topic
  3. Display all incoming sensor data in terminal
  4. Show raw JSON payloads
"""

import paho.mqtt.client as mqtt
import json
import sys
from datetime import datetime
from pathlib import Path
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# GCP MQTT Broker details
MQTT_BROKER = "34.47.199.84"  # GCP VM IP
MQTT_PORT = 1883
MQTT_TOPIC = "coldsense/#"  # Listen to all coldsense topics (your sensor will match this)

# Color codes for terminal output
class Color:
    GREEN = '\033[92m'
    BLUE = '\033[94m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

def on_connect(client, userdata, flags, rc):
    """Called when client connects to broker."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if rc == 0:
        print(f"{Color.GREEN}✓ Connected to MQTT Broker{Color.END}")
        print(f"{Color.CYAN}  Broker: {MQTT_BROKER}:{MQTT_PORT}{Color.END}")
        print(f"  Timestamp: {timestamp}")
        print(f"{Color.BLUE}  Subscribing to topic: '{MQTT_TOPIC}'{Color.END}")
        client.subscribe(MQTT_TOPIC, qos=1)
        print(f"{Color.GREEN}✓ Subscribed! Waiting for sensor data...{Color.END}\n")
    else:
        print(f"{Color.YELLOW}✗ Connection failed with code {rc}{Color.END}")
        sys.exit(1)

def on_disconnect(client, userdata, rc):
    """Called when client disconnects."""
    if rc != 0:
        print(f"{Color.YELLOW}⚠ Unexpected disconnection (rc={rc}). Reconnecting...{Color.END}")

def on_message(client, userdata, msg):
    """Called when message is received from topic."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    
    print(f"{Color.BOLD}{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}")
    print(f"{Color.GREEN}📨 DATA RECEIVED{Color.END} [{timestamp}]")
    print(f"{Color.CYAN}Topic: {msg.topic}{Color.END}")
    print(f"{Color.CYAN}QoS: {msg.qos}{Color.END}")
    
    try:
        # Try to parse as JSON
        payload = json.loads(msg.payload.decode())
        print(f"{Color.BLUE}Payload (JSON):{Color.END}")
        print(json.dumps(payload, indent=2))
        
        # Extract gateway_id and room_id from topic
        # Topic format: coldsense/gateway1/9c16285b-f8e9-416a-b758-d4fc72d8d37b/7f834e82-06f1-4150-8a16-f0451c0964fa/Door
        topic_parts = msg.topic.split('/')
        gateway_id = topic_parts[1] if len(topic_parts) > 1 else None
        room_id = topic_parts[3] if len(topic_parts) > 3 else None
        sensor_type = topic_parts[4] if len(topic_parts) > 4 else None
        
        # Show key values
        if isinstance(payload, dict):
            print(f"{Color.YELLOW}Extracted Values:{Color.END}")
            for key, value in payload.items():
                print(f"  • {key}: {Color.BOLD}{value}{Color.END}")
                
                # Skip metadata fields like PUBTOPIC, but save everything else
                if key.upper() in ['PUBTOPIC', 'TOPIC']:
                    print(f"{Color.YELLOW}  ⊘ Skipping metadata field{Color.END}")
                    continue
                
                # Convert to numeric if possible, otherwise keep as text
                numeric_value = None
                text_value = None
                
                if isinstance(value, (int, float)):
                    numeric_value = float(value)
                elif isinstance(value, str):
                    try:
                        numeric_value = float(value)
                    except (ValueError, TypeError):
                        text_value = value
                else:
                    text_value = str(value)
                
                # Insert reading into temp table
                try:
                    response = supabase.table('temp').insert({
                        'gateway_id': gateway_id,
                        'room_id': room_id,
                        'sensor_id': key,
                        'sensor_name': f"{sensor_type}_{key}",
                        'sensor_value': numeric_value,
                        'sensor_unit': 'raw',
                        'mqtt_topic': msg.topic,
                        'raw_json': payload
                    }).execute()
                    print(f"{Color.GREEN}  ✓ Saved to temp table{Color.END}")
                except Exception as e:
                    print(f"{Color.YELLOW}  ✗ Error saving to DB: {e}{Color.END}")
                    
    except json.JSONDecodeError:
        # Raw text payload
        raw_data = msg.payload.decode()
        print(f"{Color.BLUE}Payload (Raw Text):{Color.END}")
        print(f"  {raw_data}")
    
    print(f"{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.END}\n")

def main():
    """Main function - connect and subscribe."""
    print(f"{Color.BOLD}{Color.CYAN}")
    print("=" * 50)
    print("ColdSense MQTT Subscriber - 'tum' Topic Monitor")
    print("=" * 50)
    print(f"{Color.END}")
    
    # Create MQTT client (paho-mqtt 2.0+ requires callback_api_version)
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1, client_id="coldsense-tum-subscriber")
    
    # Set callbacks
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    
    # Set auto-reconnect
    client.reconnect_delay_set(min_delay=5, max_delay=30)
    
    try:
        # Connect to broker
        print(f"{Color.BLUE}Connecting to {MQTT_BROKER}:{MQTT_PORT}...{Color.END}")
        client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        
        # Start network loop (blocks here)
        client.loop_forever()
        
    except KeyboardInterrupt:
        print(f"\n{Color.YELLOW}⏹ Subscriber stopped by user{Color.END}")
    except ConnectionRefusedError:
        print(f"{Color.YELLOW}✗ Connection refused. Is MQTT broker running on {MQTT_BROKER}:{MQTT_PORT}?{Color.END}")
        sys.exit(1)
    except Exception as e:
        print(f"{Color.YELLOW}✗ Error: {e}{Color.END}")
        sys.exit(1)
    finally:
        client.disconnect()
        print(f"{Color.BLUE}Disconnected from MQTT broker{Color.END}")

if __name__ == "__main__":
    main()
