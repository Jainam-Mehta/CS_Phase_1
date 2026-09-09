import time
import json
import random
from datetime import datetime

import paho.mqtt.client as mqtt

# MQTT Configuration
BROKER = "localhost"
PORT = 1883

TOPIC = "coldsense/sensors"

# Create MQTT Client
client = mqtt.Client(client_id="ColdSense_Sensor_CS001")

client.connect(BROKER, PORT)

print("ColdSense Sensor Connected")

while True:

    payload = {

        "cold_storage_id": "CS001",

        "temperature_sensor1": round(random.uniform(3,4), 2),

        "temperature_sensor2": round(random.uniform(3,4), 2),

        "humidity": round(random.uniform(70, 90), 2),

        "energy": round(random.uniform(10, 18), 2),

        "timestamp": datetime.now().isoformat(),
        
        "door_sensor1": random.randint(0,1),

        "door_sensor2": random.randint(0,1)

    }

    client.publish(
        TOPIC,
        json.dumps(payload)
    )

    print(json.dumps(payload, indent=4))

    time.sleep(5)