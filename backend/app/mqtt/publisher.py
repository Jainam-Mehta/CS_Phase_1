import json
import random
import time
import paho.mqtt.client as mqtt
from app.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC


def generate_sensor_data():
    """
    Generate dummy sensor data for testing.
    """
    return {
        "cold_storage_id": "cs-1",
        "temperature_sensor1": round(random.uniform(-5, 10), 2),
        "temperature_sensor2": round(random.uniform(-5, 10), 2),
        "humidity": round(random.uniform(50, 90), 2),
        "energy": round(random.uniform(10, 50), 2),
        "door_sensor1": random.choice([0, 1]),
        "door_sensor2": random.choice([0, 1])
    }


def on_connect(client, userdata, flags, rc):
    print(f"Publisher Connected to MQTT Broker with result code {rc}")
    print(f"Publishing to: {MQTT_TOPIC}")


def on_publish(client, userdata, mid):
    print(f"Message {mid} published successfully")


def main():
    client = mqtt.Client(client_id="ColdSense_Publisher")
    
    client.on_connect = on_connect
    client.on_publish = on_publish
    
    client.connect(MQTT_BROKER, MQTT_PORT)
    
    # Wait for connection
    time.sleep(2)
    
    print("Starting sensor data publisher...")
    print("Press Ctrl+C to stop")
    
    message_count = 0
    
    try:
        while True:
            sensor_data = generate_sensor_data()
            
            # Publish sensor data
            client.publish(MQTT_TOPIC, json.dumps(sensor_data))
            
            message_count += 1
            print(f"\nPublished message #{message_count}")
            print(f"Temperature: {sensor_data['temperature_sensor1']}°C, {sensor_data['temperature_sensor2']}°C")
            print(f"Humidity: {sensor_data['humidity']}%")
            print(f"Energy: {sensor_data['energy']} kWh")
            print(f"Door 1: {'Open' if sensor_data['door_sensor1'] else 'Closed'}")
            print(f"Door 2: {'Open' if sensor_data['door_sensor2'] else 'Closed'}")
            
            # Wait before next message
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\nStopping publisher...")
        client.disconnect()
        print("Disconnected from MQTT broker")


if __name__ == "__main__":
    main()