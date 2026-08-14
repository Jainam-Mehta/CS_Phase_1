"""
Configuration for ColdSense AI Data Simulator
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Simulator Configuration"""
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')
    
    # Simulation Settings
    UPDATE_INTERVAL_SECONDS = 60  # Update every 60 seconds
    HISTORICAL_DATA_HOURS = 24  # Generate 24 hours of historical data
    
    # Sensor Value Ranges (Realistic cold storage ranges)
    INTERNAL_TEMP_MIN = 1.0  # °C
    INTERNAL_TEMP_MAX = 15.0  # °C
    INTERNAL_HUMIDITY_MIN = 70  # %
    INTERNAL_HUMIDITY_MAX = 95  # %
    
    AMBIENT_TEMP_MIN = 25.0  # °C
    AMBIENT_TEMP_MAX = 40.0  # °C
    AMBIENT_HUMIDITY_MIN = 40  # %
    AMBIENT_HUMIDITY_MAX = 80  # %
    
    # Energy Consumption (kWh/hour)
    ENERGY_MIN = 2.0
    ENERGY_MAX = 5.0
    
    # Battery & Solar (%)
    BATTERY_MIN = 60
    BATTERY_MAX = 100
    SOLAR_MIN = 0
    SOLAR_MAX = 100
    
    # Voltage (V) & Current (A)
    VOLTAGE_MIN = 220
    VOLTAGE_MAX = 240
    CURRENT_MIN = 10
    CURRENT_MAX = 20
    
    # Door Analytics
    DOOR_OPEN_PROBABILITY = 0.05  # 5% chance of door being open
    DOOR_OPEN_DURATION_MIN = 5  # seconds
    DOOR_OPEN_DURATION_MAX = 60  # seconds
    
    # Temperature Change Rate (for smooth transitions)
    TEMP_CHANGE_RATE = 0.3  # Max change per update
    HUMIDITY_CHANGE_RATE = 2.0  # Max change per update
