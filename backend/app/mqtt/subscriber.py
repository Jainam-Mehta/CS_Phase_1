import json
import paho.mqtt.client as mqtt

from app.config import MQTT_BROKER, MQTT_PORT, MQTT_TOPIC
from app.services.sensor_service import save_sensor_reading


def on_connect(client, userdata, flags, rc):
    print("Backend Connected to MQTT Broker")

    client.subscribe(MQTT_TOPIC)

    print(f"Subscribed to: {MQTT_TOPIC}")


def on_message(client, userdata, msg):

    payload = json.loads(msg.payload.decode())

    print("\nReceived Payload")

    print(payload)

    temp1 = payload["temperature_sensor1"]

    temp2 = payload["temperature_sensor2"]

    average = round((temp1 + temp2) / 2, 2)

    sensor_data = {

        "cold_storage_id": payload["cold_storage_id"],

        "temperature_sensor1": temp1,

        "temperature_sensor2": temp2,

        "temperature_avg": average,

        "humidity": payload["humidity"],

        "energy": payload.get("energy", 0),
        
        "door_sensor1": payload.get("door_sensor1", 0),

        "door_sensor2": payload.get("door_sensor2", 0)

    }

    save_sensor_reading(sensor_data)

    print("Saved to Supabase")


client = mqtt.Client(client_id="ColdSense_Backend")

client.on_connect = on_connect

client.on_message = on_message

client.connect(MQTT_BROKER, MQTT_PORT)

client.loop_forever()