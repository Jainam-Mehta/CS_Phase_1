"""
ColdSense AI - Sensor Data Generator
Generates realistic sensor values based on sensor type
No database code - pure data generation
"""
import random
import math
from datetime import datetime
from typing import Dict, Any
from config import Config

class SensorGenerator:
    """Generates realistic sensor data with smooth transitions"""
    
    def __init__(self):
        self.previous_readings: Dict[str, float] = {}
    
    def _generate_smooth_value(
        self, 
        sensor_key: str, 
        min_val: float, 
        max_val: float, 
        change_rate: float
    ) -> float:
        """Generate a value that smoothly transitions from previous reading"""
        previous = self.previous_readings.get(sensor_key)
        
        if previous is None:
            # First reading - random within range
            value = random.uniform(min_val, max_val)
        else:
            # Smooth transition from previous value
            change = random.uniform(-change_rate, change_rate)
            value = previous + change
            
            # Clamp to valid range
            value = max(min_val, min(max_val, value))
        
        self.previous_readings[sensor_key] = value
        return value
    
    def _generate_day_night_variation(self, base_value: float, min_val: float, max_val: float) -> float:
        """Generate value with day/night sinusoidal variation"""
        hour = datetime.now().hour
        
        # Sinusoidal variation based on time of day
        # Peak at 2 PM (14:00), minimum at 2 AM (02:00)
        normalized_hour = (hour - 14) / 12  # Normalize to -1 to 1
        variation = math.cos(normalized_hour * math.pi)  # -1 to 1
        
        # Apply variation
        range_val = max_val - min_val
        adjusted_value = base_value + (variation * range_val * 0.3)
        
        return max(min_val, min(max_val, adjusted_value))
    
    def generate_temperature(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate internal temperature (2.0-8.0°C)"""
        sensor_key = f"{room_sensor_id}_temp"
        value = round(
            self._generate_smooth_value(
                sensor_key,
                Config.TEMPERATURE_MIN,
                Config.TEMPERATURE_MAX,
                Config.TEMPERATURE_CHANGE_RATE
            ),
            1
        )
        return {
            'reading_value': value,
            'unit': '°C'
        }
    
    def generate_humidity(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate internal humidity (80-90%)"""
        sensor_key = f"{room_sensor_id}_humidity"
        value = int(
            self._generate_smooth_value(
                sensor_key,
                Config.HUMIDITY_MIN,
                Config.HUMIDITY_MAX,
                Config.HUMIDITY_CHANGE_RATE
            )
        )
        return {
            'reading_value': value,
            'unit': '%'
        }
    
    def generate_ambient_temperature(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate ambient temperature (24-36°C) with day/night variation"""
        sensor_key = f"{room_sensor_id}_ambient_temp"
        base_value = self._generate_smooth_value(
            sensor_key,
            Config.AMBIENT_TEMP_MIN,
            Config.AMBIENT_TEMP_MAX,
            Config.TEMPERATURE_CHANGE_RATE
        )
        value = round(
            self._generate_day_night_variation(
                base_value,
                Config.AMBIENT_TEMP_MIN,
                Config.AMBIENT_TEMP_MAX
            ),
            1
        )
        return {
            'reading_value': value,
            'unit': '°C'
        }
    
    def generate_ambient_humidity(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate ambient humidity (40-80%)"""
        sensor_key = f"{room_sensor_id}_ambient_humidity"
        value = int(
            self._generate_smooth_value(
                sensor_key,
                Config.AMBIENT_HUMIDITY_MIN,
                Config.AMBIENT_HUMIDITY_MAX,
                Config.HUMIDITY_CHANGE_RATE
            )
        )
        return {
            'reading_value': value,
            'unit': '%'
        }
    
    def generate_energy(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate energy consumption (0.3-4.2 kWh)"""
        sensor_key = f"{room_sensor_id}_energy"
        value = round(
            self._generate_smooth_value(
                sensor_key,
                Config.ENERGY_MIN,
                Config.ENERGY_MAX,
                0.2
            ),
            1
        )
        return {
            'reading_value': value,
            'unit': 'kWh'
        }
    
    def generate_solar_energy(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate solar energy (0-6 kWh, depends on time of day)"""
        hour = datetime.now().hour
        
        # Solar only active during daytime (6 AM - 6 PM)
        if 6 <= hour < 18:
            # Peak at noon
            hour_offset = abs(hour - 12) / 6  # 0 at noon, 1 at 6 AM/PM
            max_solar = Config.SOLAR_MAX * (1 - hour_offset * 0.5)
            min_solar = Config.SOLAR_MIN
            
            sensor_key = f"{room_sensor_id}_solar"
            value = round(
                self._generate_smooth_value(
                    sensor_key,
                    min_solar,
                    max_solar,
                    0.5
                ),
                1
            )
        else:
            value = 0.0
        
        return {
            'reading_value': value,
            'unit': 'kWh'
        }
    
    def generate_door(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate door status (0=closed, 1=open)"""
        is_open = random.random() < Config.DOOR_OPEN_PROBABILITY
        value = 1 if is_open else 0
        return {
            'reading_value': value,
            'unit': ''
        }
    
    def generate_co2(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate CO2 levels (350-900 ppm)"""
        sensor_key = f"{room_sensor_id}_co2"
        value = int(
            self._generate_smooth_value(
                sensor_key,
                Config.CO2_MIN,
                Config.CO2_MAX,
                10.0
            )
        )
        return {
            'reading_value': value,
            'unit': 'ppm'
        }
    
    def generate_oxygen(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate oxygen levels (19-21%)"""
        sensor_key = f"{room_sensor_id}_oxygen"
        value = round(
            self._generate_smooth_value(
                sensor_key,
                Config.OXYGEN_MIN,
                Config.OXYGEN_MAX,
                0.1
            ),
            1
        )
        return {
            'reading_value': value,
            'unit': '%'
        }
    
    def generate_ethylene(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate ethylene levels (0-5 ppm, very low normally)"""
        sensor_key = f"{room_sensor_id}_ethylene"
        # Mostly very low, occasional spikes
        if random.random() < 0.95:
            value = random.uniform(0, 0.5)
        else:
            value = random.uniform(0.5, Config.ETHYLENE_MAX)
        
        return {
            'reading_value': round(value, 2),
            'unit': 'ppm'
        }
    
    def generate_ammonia(self, room_sensor_id: str) -> Dict[str, Any]:
        """Generate ammonia levels (0-50 ppm, usually 0 with occasional spikes)"""
        sensor_key = f"{room_sensor_id}_ammonia"
        # Usually 0, occasional spikes
        if random.random() < 0.98:
            value = 0
        else:
            value = random.uniform(1, Config.AMMONIA_MAX)
        
        return {
            'reading_value': int(value),
            'unit': 'ppm'
        }
    
    def generate_reading(self, room_sensor_id: str, sensor_type: str) -> Dict[str, Any]:
        """Generate a reading based on sensor type"""
        sensor_type_lower = sensor_type.lower()
        
        if 'temperature' in sensor_type_lower and 'ambient' in sensor_type_lower:
            return self.generate_ambient_temperature(room_sensor_id)
        elif 'temperature' in sensor_type_lower:
            return self.generate_temperature(room_sensor_id)
        elif 'humidity' in sensor_type_lower and 'ambient' in sensor_type_lower:
            return self.generate_ambient_humidity(room_sensor_id)
        elif 'humidity' in sensor_type_lower:
            return self.generate_humidity(room_sensor_id)
        elif 'energy' in sensor_type_lower:
            return self.generate_energy(room_sensor_id)
        elif 'solar' in sensor_type_lower:
            return self.generate_solar_energy(room_sensor_id)
        elif 'door' in sensor_type_lower:
            return self.generate_door(room_sensor_id)
        elif 'co2' in sensor_type_lower or 'carbon' in sensor_type_lower:
            return self.generate_co2(room_sensor_id)
        elif 'oxygen' in sensor_type_lower or 'o2' in sensor_type_lower:
            return self.generate_oxygen(room_sensor_id)
        elif 'ethylene' in sensor_type_lower:
            return self.generate_ethylene(room_sensor_id)
        elif 'ammonia' in sensor_type_lower:
            return self.generate_ammonia(room_sensor_id)
        else:
            # Default: generate a random value
            sensor_key = f"{room_sensor_id}_{sensor_type}"
            value = self._generate_smooth_value(sensor_key, 0, 100, 1.0)
            return {
                'reading_value': round(value, 1),
                'unit': ''
            }
