"""
ColdSense AI - Simulator Configuration
All configuration settings in one place
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration class for all simulator settings"""
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')

    # Update Intervals (seconds)
    ROOM_UPDATE_INTERVAL = 60

    # Temperature Range (°C)
    TEMPERATURE_MIN = 2.0
    TEMPERATURE_MAX = 8.0
    TEMPERATURE_CHANGE_RATE = 0.3  # Max change per update

    # Humidity Range (%)
    HUMIDITY_MIN = 80
    HUMIDITY_MAX = 90
    HUMIDITY_CHANGE_RATE = 2.0  # Max change per update

    # Ambient Temperature Range (°C)
    AMBIENT_TEMP_MIN = 24.0
    AMBIENT_TEMP_MAX = 36.0

    # Ambient Humidity Range (%)
    AMBIENT_HUMIDITY_MIN = 40
    AMBIENT_HUMIDITY_MAX = 80

    # Energy Consumption Range (kWh)
    ENERGY_MIN = 0.3
    ENERGY_MAX = 4.2

    # Solar Energy Range (kWh)
    SOLAR_MIN = 0.0
    SOLAR_MAX = 6.0

    # Door Settings
    DOOR_OPEN_PROBABILITY = 0.05  # 5% chance of door being open

    # Gas Ranges
    CO2_MIN = 350
    CO2_MAX = 900
    OXYGEN_MIN = 19
    OXYGEN_MAX = 21
    ETHYLENE_MIN = 0
    ETHYLENE_MAX = 5
    AMMONIA_MIN = 0
    AMMONIA_MAX = 50

    # Historical Data
    GENERATE_HISTORICAL_DATA = False
    HISTORICAL_DATA_HOURS = 24
