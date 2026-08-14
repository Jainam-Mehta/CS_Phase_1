from app.services.sensor_service import save_sensor_reading

data = {
    "cold_storage_id": "CS001",
    "temperature_sensor1": 2.3,
    "temperature_sensor2": 2.5,
    "temperature_avg": 2.4,
    "humidity": 84.1,
    "energy": 12.8
}

response = save_sensor_reading(data)

print(response)