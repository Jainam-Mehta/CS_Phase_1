#!/usr/bin/env python3
"""
SIMPLE MQTT READER - reads cdsense/gw1/MHNKIGP01/S01/R01 and sends to Supabase
NOTHING ELSE.
"""

import json
import sys
import os
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import MQTT_BROKER, MQTT_PORT
from app.database.supabase import supabase

# Your site and room IDs
SITE_ID = "36ed749d-7c72-4e93-9074-19cfebd9ea09"
ROOM_ID = "59e5a40d-1526-433a-add3-e7f5acea96bb"
TOPIC = "cdsense/gw1/MHNKIGP01/S01/R01"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"✓ Connected to {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(TOPIC)
        print(f"✓ Listening to: {TOPIC}")
    else:
        print(f"✗ Connection failed: {rc}")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"\n📨 Message received")
        
        devices = payload.get('device', [])
        
        for device in devices:
            slave_id = device.get('slave_id')
            data = device.get('data', {})
            
            for key, value in data.items():
                try:
                    val = float(value)
                    
                    # Normalize: if > 100, divide by 100
                    if val > 100:
                        val = val / 100.0
                    
                    if 'temp' in key.lower():
                        # Write temperature
                        supabase.table("cold_storage_conditions").insert({
                            "room_id": ROOM_ID,
                            "site_id": SITE_ID,
                            "temperature": val,
                            "recorded_at": datetime.now(timezone.utc).isoformat()
                        }).execute()
                        print(f"  ✅ Temp: {val}°C")
                    
                    elif 'hum' in key.lower():
                        # Write humidity
                        supabase.table("cold_storage_conditions").insert({
                            "room_id": ROOM_ID,
                            "site_id": SITE_ID,
                            "humidity": val,
                            "recorded_at": datetime.now(timezone.utc).isoformat()
                        }).execute()
                        print(f"  ✅ Humidity: {val}%")
                except Exception as e:
                    print(f"  ❌ Error: {e}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")

print("=" * 50)
print("SIMPLE MQTT READER")
print("=" * 50)
print(f"Broker: {MQTT_BROKER}:{MQTT_PORT}")
print(f"Topic: {TOPIC}")
print(f"Supabase: cold_storage_conditions")
print("=" * 50)

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message
client.connect(MQTT_BROKER, MQTT_PORT, 60)
client.loop_forever()
