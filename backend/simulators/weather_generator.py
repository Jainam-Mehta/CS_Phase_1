"""
Weather Data Generator for ColdSense AI
Generates realistic ambient weather conditions
"""
import random
from datetime import datetime
from typing import Dict, Any
from config import Config

class WeatherGenerator:
    """Generates ambient weather data"""
    
    def __init__(self):
        self.previous_temp = None
        self.previous_humidity = None
    
    def generate_ambient_conditions(self, location: str = "default") -> Dict[str, Any]:
        """Generate ambient temperature and humidity based on time of day"""
        hour = datetime.now().hour
        
        # Temperature varies by time of day
        if 6 <= hour < 12:  # Morning
            temp_min = Config.AMBIENT_TEMP_MIN + 5
            temp_max = Config.AMBIENT_TEMP_MAX - 5
        elif 12 <= hour < 18:  # Afternoon
            temp_min = Config.AMBIENT_TEMP_MAX - 5
            temp_max = Config.AMBIENT_TEMP_MAX
        elif 18 <= hour < 22:  # Evening
            temp_min = Config.AMBIENT_TEMP_MIN + 3
            temp_max = Config.AMBIENT_TEMP_MAX - 3
        else:  # Night
            temp_min = Config.AMBIENT_TEMP_MIN
            temp_max = Config.AMBIENT_TEMP_MIN + 5
        
        # Smooth temperature transition
        if self.previous_temp is None:
            temp = random.uniform(temp_min, temp_max)
        else:
            change = random.uniform(-1.0, 1.0)
            temp = self.previous_temp + change
            temp = max(temp_min, min(temp_max, temp))
        
        self.previous_temp = temp
        
        # Humidity varies inversely with temperature
        if temp > (Config.AMBIENT_TEMP_MAX + Config.AMBIENT_TEMP_MIN) / 2:
            humidity_min = Config.AMBIENT_HUMIDITY_MIN
            humidity_max = Config.AMBIENT_HUMIDITY_MIN + 20
        else:
            humidity_min = Config.AMBIENT_HUMIDITY_MAX - 20
            humidity_max = Config.AMBIENT_HUMIDITY_MAX
        
        # Smooth humidity transition
        if self.previous_humidity is None:
            humidity = random.uniform(humidity_min, humidity_max)
        else:
            change = random.uniform(-3.0, 3.0)
            humidity = self.previous_humidity + change
            humidity = max(humidity_min, min(humidity_max, humidity))
        
        self.previous_humidity = int(humidity)
        
        return {
            'temperature': round(temp, 1),
            'humidity': int(humidity),
            'timestamp': datetime.now().isoformat()
        }
