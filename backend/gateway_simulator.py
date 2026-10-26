"""
ColdSense Gateway Simulator
Simulates real gateway sending MQTT messages for latency testing.

This simulator:
1. Connects as a fake gateway to MQTT broker
2. Sends realistic sensor readings
3. Includes timestamps for latency measurement
4. Mimics real gateway behavior

Usage:
    python gateway_simulator.py --duration 300 --interval 10
    
This will simulate a gateway for 5 minutes, sending readings every 10 seconds.
"""

import paho.mqtt.client as mqtt
import time
import json
import random
import argparse
from datetime import datetime
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

class GatewaySimulator:
    def __init__(self, gateway_id="SIM-GW-001", locality_code="MHNKIGP01", 
                 site_code="S01", room_code="R01", broker_host="localhost", 
                 broker_port=1883, interval=10, duration=300):
        """
        Args:
            gateway_id: Gateway identifier
            locality_code: Locality code (e.g., MHNKIGP01)
            site_code: Site code (e.g., S01)
            room_code: Room code (e.g., R01)
            broker_host: MQTT broker host
            broker_port: MQTT broker port
            interval: Seconds between readings
            duration: Total simulation duration in seconds
        """
        self.gateway_id = gateway_id
        self.locality_code = locality_code
        self.site_code = site_code
        self.room_code = room_code
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.interval = interval
        self.duration = duration
        
        self.mqtt_client = None
        self.is_connected = False
        self.message_count = 0
        
        # Simulate sensor state
        self.base_temp = 4.0  # Ideal cold storage temp
        self.base_humidity = 85.0
        
    def on_connect(self, client, userdata, flags, rc):
        """MQTT connection callback"""
        if rc == 0:
            self.is_connected = True
            logger.info(f"✓ Connected to MQTT broker ({self.broker_host}:{self.broker_port})")
            logger.info(f"✓ Gateway ID: {self.gateway_id}")
            logger.info(f"✓ Topic: cdsense/gw/{self.gateway_id}/{self.locality_code}/{self.site_code}/{self.room_code}")
        else:
            logger.error(f"✗ Connection failed (rc={rc})")
    
    def on_disconnect(self, client, userdata, rc):
        """MQTT disconnection callback"""
        self.is_connected = False
        if rc != 0:
            logger.warning(f"⚠ Disconnected unexpectedly (rc={rc})")
    
    def setup_mqtt(self):
        """Connect to MQTT broker"""
        self.mqtt_client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION1,
            client_id=self.gateway_id
        )
        self.mqtt_client.on_connect = self.on_connect
        self.mqtt_client.on_disconnect = self.on_disconnect
        
        try:
            self.mqtt_client.connect(self.broker_host, self.broker_port, keepalive=60)
            self.mqtt_client.loop_start()
            time.sleep(2)  # Wait for connection
            
            if not self.is_connected:
                raise Exception("Failed to connect to MQTT broker")
                
        except Exception as e:
            logger.error(f"✗ Connection error: {e}")
            raise
    
    def generate_sensor_reading(self) -> dict:
        """Generate realistic sensor reading with some variation"""
        # Add small random variations to simulate real sensors
        temp_variation = random.gauss(0, 0.3)  # ±0.3°C variation
        humidity_variation = random.gauss(0, 1.0)  # ±1% variation
        
        temp = self.base_temp + temp_variation
        humidity = self.base_humidity + humidity_variation
        
        # Simulate multiple sensors (slave IDs 1, 2, 3)
        devices = []
        
        # Sensor 1 (Temperature/Humidity)
        devices.append({
            "id": 1,
            "slave_id": 1,
            "data": {
                "Temp1": f"{temp:.1f}",
                "Humidity1": f"{humidity:.1f}"
            }
        })
        
        # Sensor 2 (Temperature/Humidity)
        devices.append({
            "id": 2,
            "slave_id": 2,
            "data": {
                "Temp2": f"{temp - 0.5:.1f}",  # Slightly different
                "Hum2": f"{humidity + 0.5:.1f}"
            }
        })
        
        # Sensor 3 (Temperature/Humidity)
        devices.append({
            "id": 3,
            "slave_id": 3,
            "data": {
                "Temp3": f"{temp + 0.2:.1f}",
                "Humidity3": f"{humidity - 0.3:.1f}"
            }
        })
        
        # Occasionally include a voltage reading
        if random.random() < 0.3:  # 30% of messages
            devices.append({
                "id": 4,
                "slave_id": 4,
                "data": {
                    "voltage4": "230",
                    "currentN": "0.5"
                }
            })
        
        # Build payload matching real gateway format
        payload = {
            "TS": datetime.now().strftime("%y%m%d%H%M%S"),  # e.g., 261026143022
            "fver": 0.1,
            "SS": random.randint(-80, -60),  # Signal strength in dBm
            "device": devices,
            "DIGI": random.choice(["On", "Off"]),  # Door sensor
            "_latency_test_timestamp": time.time() * 1000  # For latency measurement
        }
        
        return payload
    
    def publish_reading(self, payload: dict):
        """Publish sensor reading via MQTT"""
        if not self.is_connected:
            logger.warning("✗ Not connected to broker, skipping publish")
            return
        
        topic = f"cdsense/gw/{self.gateway_id}/{self.locality_code}/{self.site_code}/{self.room_code}"
        
        try:
            self.mqtt_client.publish(topic, json.dumps(payload), qos=1)
            self.message_count += 1
            
            logger.info(f"[{self.message_count}] Published reading:")
            logger.info(f"    Topic: {topic}")
            logger.info(f"    Temp: {payload['device'][0]['data']['Temp1']}°C")
            logger.info(f"    Humidity: {payload['device'][0]['data']['Humidity1']}%")
            logger.info(f"    Signal: {payload['SS']} dBm")
            
        except Exception as e:
            logger.error(f"✗ Publish error: {e}")
    
    def run_simulation(self):
        """Run gateway simulation"""
        logger.info(f"\n{'='*70}")
        logger.info("ColdSense Gateway Simulator")
        logger.info(f"{'='*70}\n")
        
        logger.info(f"Configuration:")
        logger.info(f"  Gateway ID:    {self.gateway_id}")
        logger.info(f"  Locality:      {self.locality_code}")
        logger.info(f"  Site Code:     {self.site_code}")
        logger.info(f"  Room Code:     {self.room_code}")
        logger.info(f"  Interval:      {self.interval}s")
        logger.info(f"  Duration:      {self.duration}s ({self.duration/60:.1f} minutes)")
        logger.info(f"  Broker:        {self.broker_host}:{self.broker_port}\n")
        
        self.setup_mqtt()
        
        logger.info("Starting simulation. Press Ctrl+C to stop.\n")
        
        start_time = time.time()
        
        try:
            while True:
                elapsed = time.time() - start_time
                
                # Check if duration exceeded
                if self.duration and elapsed > self.duration:
                    logger.info(f"\n✓ Simulation complete ({self.message_count} messages sent)")
                    break
                
                # Generate and publish reading
                payload = self.generate_sensor_reading()
                self.publish_reading(payload)
                
                # Wait for next interval
                time.sleep(self.interval)
                
        except KeyboardInterrupt:
            logger.info(f"\n✓ Simulation stopped by user ({self.message_count} messages sent)")
        finally:
            self.mqtt_client.loop_stop()
            logger.info("✓ Disconnected from broker")
    
    def run_burst_test(self, num_messages=50):
        """Send burst of messages rapidly (for latency testing)"""
        logger.info(f"\n{'='*70}")
        logger.info("ColdSense Gateway - Burst Test (Latency)")
        logger.info(f"{'='*70}\n")
        
        logger.info(f"Sending {num_messages} messages rapidly...\n")
        
        self.setup_mqtt()
        
        try:
            for i in range(num_messages):
                payload = self.generate_sensor_reading()
                self.publish_reading(payload)
                time.sleep(0.5)  # 500ms between messages
                
            logger.info(f"\n✓ Burst test complete ({num_messages} messages sent)")
            
        except KeyboardInterrupt:
            logger.info(f"\n✓ Burst test stopped by user ({self.message_count} messages sent)")
        finally:
            self.mqtt_client.loop_stop()
            logger.info("✓ Disconnected from broker")


def main():
    parser = argparse.ArgumentParser(
        description="ColdSense Gateway Simulator"
    )
    parser.add_argument(
        "--gateway-id",
        default="SIM-GW-001",
        help="Gateway identifier (default: SIM-GW-001)"
    )
    parser.add_argument(
        "--locality",
        default="MHNKIGP01",
        help="Locality code (default: MHNKIGP01)"
    )
    parser.add_argument(
        "--site",
        default="S01",
        help="Site code (default: S01)"
    )
    parser.add_argument(
        "--room",
        default="R01",
        help="Room code (default: R01)"
    )
    parser.add_argument(
        "--broker",
        default="localhost",
        help="MQTT broker host (default: localhost)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=1883,
        help="MQTT broker port (default: 1883)"
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=10,
        help="Seconds between readings (default: 10)"
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=300,
        help="Simulation duration in seconds (default: 300 = 5 minutes)"
    )
    parser.add_argument(
        "--burst",
        type=int,
        default=None,
        help="Send N messages rapidly (for latency testing, ignores interval/duration)"
    )
    
    args = parser.parse_args()
    
    simulator = GatewaySimulator(
        gateway_id=args.gateway_id,
        locality_code=args.locality,
        site_code=args.site,
        room_code=args.room,
        broker_host=args.broker,
        broker_port=args.port,
        interval=args.interval,
        duration=args.duration
    )
    
    try:
        if args.burst:
            simulator.run_burst_test(num_messages=args.burst)
        else:
            simulator.run_simulation()
    except Exception as e:
        logger.error(f"Simulation failed: {e}", exc_info=True)


if __name__ == "__main__":
    main()
