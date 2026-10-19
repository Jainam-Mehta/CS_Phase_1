#!/usr/bin/env python3
"""
Standalone MQTT Subscriber Service - Runs 24/7
Subscribes to: cdsense/gw1/MHNKIGP01/S01/R01
Writes readings directly to Supabase cold_storage_conditions table
"""

import sys
import os

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.mqtt.simple_subscriber import start_simple_subscriber
import threading
import time

if __name__ == "__main__":
    print("=" * 60)
    print("ColdSense MQTT Subscriber Service (24/7)")
    print("=" * 60)
    
    # Start the subscriber
    start_simple_subscriber()
    
    # Keep the service running
    print("\n🚀 Service running. Press Ctrl+C to stop.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n⏹ Shutting down gracefully...")
        sys.exit(0)
