from app.database.supabase import supabase
from app.services.door_service import process_door_state_change
from datetime import datetime
import random


def calculate_ambient_temperature():
    """
    Calculate ambient temperature based on system time.
    Day (6 AM - 6 PM): 29-34°C
    Night (6 PM - 6 AM): 24-29°C
    """
    current_hour = datetime.now().hour
    
    if 6 <= current_hour < 18:
        # Day time
        return random.uniform(29, 34)
    else:
        # Night time
        return random.uniform(24, 29)


def save_sensor_reading(sensor_data: dict):
    """
    Save processed sensor data into Supabase and process door events.
    Updated to support 2 temperature sensors + ambient, 2 humidity sensors + ambient.
    """

    # Process door state changes before saving
    if "door_sensor1" in sensor_data:
        process_door_state_change("door_sensor_1", sensor_data["door_sensor1"])
    
    if "door_sensor2" in sensor_data:
        process_door_state_change("door_sensor_2", sensor_data["door_sensor2"])

    # Add ambient temperature if not provided
    if "ambient_temperature" not in sensor_data:
        sensor_data["ambient_temperature"] = calculate_ambient_temperature()
    
    # Add ambient humidity if not provided (use average of sensors)
    if "ambient_humidity" not in sensor_data and "humidity_sensor1" in sensor_data and "humidity_sensor2" in sensor_data:
        sensor_data["ambient_humidity"] = (sensor_data["humidity_sensor1"] + sensor_data["humidity_sensor2"]) / 2

    response = (
        supabase
        .table("sensor_readings")
        .insert(sensor_data)
        .execute()
    )

    return response

from app.database.supabase import get_latest_reading


def latest_sensor_reading():
    """
    Returns the newest sensor reading.
    Updated to include all 2 temperature sensors + ambient, 2 humidity sensors + ambient.
    """
    reading = get_latest_reading()
    
    # Ensure we have ambient temperature
    if reading and "ambient_temperature" not in reading:
        reading["ambient_temperature"] = calculate_ambient_temperature()
    
    return reading