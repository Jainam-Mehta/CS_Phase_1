"""
Sensor Data Generator for ColdSense AI
Generates realistic sensor readings with smooth transitions
"""
import random
from datetime import datetime, timedelta
from typing import Dict, Any
from config import Config

class SensorGenerator:
    """Generates realistic sensor data with smooth transitions"""
    
    def __init__(self):
        self.previous_readings: Dict[str, Dict[str, float]] = {}
    
    def generate_smooth_value(
        self, 
        room_id: str, 
        key: str, 
        min_val: float, 
        max_val: float, 
        change_rate: float
    ) -> float:
        """Generate a value that smoothly transitions from previous reading"""
        if room_id not in self.previous_readings:
            self.previous_readings[room_id] = {}
        
        previous = self.previous_readings[room_id].get(key)
        
        if previous is None:
            # First reading - random within range
            value = random.uniform(min_val, max_val)
        else:
            # Smooth transition from previous value
            change = random.uniform(-change_rate, change_rate)
            value = previous + change
            
            # Clamp to valid range
            value = max(min_val, min(max_val, value))
        
        self.previous_readings[room_id][key] = value
        return value
    
    def generate_internal_temperature(self, room_id: str) -> float:
        """Generate internal temperature (°C)"""
        return round(
            self.generate_smooth_value(
                room_id, 
                'internal_temp',
                Config.INTERNAL_TEMP_MIN,
                Config.INTERNAL_TEMP_MAX,
                Config.TEMP_CHANGE_RATE
            ),
            1
        )
    
    def generate_internal_humidity(self, room_id: str) -> int:
        """Generate internal humidity (%)"""
        return int(
            self.generate_smooth_value(
                room_id,
                'internal_humidity',
                Config.INTERNAL_HUMIDITY_MIN,
                Config.INTERNAL_HUMIDITY_MAX,
                Config.HUMIDITY_CHANGE_RATE
            )
        )
    
    def generate_ambient_temperature(self, room_id: str) -> float:
        """Generate ambient temperature (°C) - varies by time of day"""
        hour = datetime.now().hour
        
        # Adjust range based on time of day
        if 6 <= hour < 18:  # Daytime
            min_temp = Config.AMBIENT_TEMP_MAX - 5
            max_temp = Config.AMBIENT_TEMP_MAX
        else:  # Nighttime
            min_temp = Config.AMBIENT_TEMP_MIN
            max_temp = Config.AMBIENT_TEMP_MIN + 5
        
        return round(
            self.generate_smooth_value(
                room_id,
                'ambient_temp',
                min_temp,
                max_temp,
                Config.TEMP_CHANGE_RATE
            ),
            1
        )
    
    def generate_ambient_humidity(self, room_id: str) -> int:
        """Generate ambient humidity (%)"""
        return int(
            self.generate_smooth_value(
                room_id,
                'ambient_humidity',
                Config.AMBIENT_HUMIDITY_MIN,
                Config.AMBIENT_HUMIDITY_MAX,
                Config.HUMIDITY_CHANGE_RATE
            )
        )
    
    def generate_door_status(self, room_id: str) -> Dict[str, Any]:
        """Generate door status and analytics"""
        # Random chance of door being open
        is_open = random.random() < Config.DOOR_OPEN_PROBABILITY
        
        result = {
            'status': 'Open' if is_open else 'Closed',
            'open_duration': 0,
            'opens_today': 0,
            'last_open_time': None
        }
        
        if is_open:
            # Generate open duration
            result['open_duration'] = random.randint(
                Config.DOOR_OPEN_DURATION_MIN,
                Config.DOOR_OPEN_DURATION_MAX
            )
            result['opens_today'] = random.randint(1, 20)
            result['last_open_time'] = datetime.now().isoformat()
        
        return result
    
    def generate_energy_consumption(self, room_id: str) -> float:
        """Generate energy consumption (kWh/hour)"""
        return round(
            self.generate_smooth_value(
                room_id,
                'energy',
                Config.ENERGY_MIN,
                Config.ENERGY_MAX,
                0.2
            ),
            1
        )
    
    def generate_compressor_status(self) -> str:
        """Generate compressor status"""
        return random.choice(['Running', 'Idle'])
    
    def generate_fan_status(self) -> str:
        """Generate fan status"""
        return random.choice(['Running', 'Stopped'])
    
    def generate_battery_percentage(self, room_id: str) -> int:
        """Generate battery percentage (%)"""
        return int(
            self.generate_smooth_value(
                room_id,
                'battery',
                Config.BATTERY_MIN,
                Config.BATTERY_MAX,
                1.0
            )
        )
    
    def generate_solar_percentage(self, room_id: str) -> int:
        """Generate solar percentage (%)"""
        hour = datetime.now().hour
        
        # Solar only active during daytime
        if 6 <= hour < 18:
            min_solar = Config.SOLAR_MIN
            max_solar = Config.SOLAR_MAX
        else:
            min_solar = 0
            max_solar = 10  # Minimal at night
        
        return int(
            self.generate_smooth_value(
                room_id,
                'solar',
                min_solar,
                max_solar,
                2.0
            )
        )
    
    def generate_voltage(self, room_id: str) -> float:
        """Generate voltage (V)"""
        return round(
            self.generate_smooth_value(
                room_id,
                'voltage',
                Config.VOLTAGE_MIN,
                Config.VOLTAGE_MAX,
                1.0
            ),
            1
        )
    
    def generate_current(self, room_id: str) -> float:
        """Generate current (A)"""
        return round(
            self.generate_smooth_value(
                room_id,
                'current',
                Config.CURRENT_MIN,
                Config.CURRENT_MAX,
                0.5
            ),
            1
        )
    
    def generate_full_sensor_data(self, room_id: str) -> Dict[str, Any]:
        """Generate complete sensor data for a room"""
        door_data = self.generate_door_status(room_id)
        
        return {
            'internal_temperature': self.generate_internal_temperature(room_id),
            'internal_humidity': self.generate_internal_humidity(room_id),
            'ambient_temperature': self.generate_ambient_temperature(room_id),
            'ambient_humidity': self.generate_ambient_humidity(room_id),
            'door_status': door_data['status'],
            'door_open_duration': door_data['open_duration'],
            'door_opens_today': door_data['opens_today'],
            'door_last_open_time': door_data['last_open_time'],
            'energy_consumption_kwh': self.generate_energy_consumption(room_id),
            'compressor_status': self.generate_compressor_status(),
            'fan_status': self.generate_fan_status(),
            'battery_percentage': self.generate_battery_percentage(room_id),
            'solar_percentage': self.generate_solar_percentage(room_id),
            'voltage': self.generate_voltage(room_id),
            'current': self.generate_current(room_id),
            'last_updated': datetime.now().isoformat()
        }
