"""
ColdSense AI - Supabase Client
Handles database operations for room_sensors and sensor_readings
"""
import requests
import logging
from datetime import datetime
from typing import Dict, Any, List
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SupabaseClient:
    """Handles all Supabase database operations"""
    
    def __init__(self):
        if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        
        self.base_url = Config.SUPABASE_URL
        self.api_key = Config.SUPABASE_KEY
        self.headers = {
            'apikey': self.api_key,
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def _request(self, table: str, method: str = 'GET', data: Dict = None, filters: Dict = None) -> Any:
        """Make a request to Supabase REST API"""
        url = f"{self.base_url}/rest/v1/{table}"
        params = {}
        
        if filters:
            for key, value in filters.items():
                if value is None:
                    params[key] = 'is.null'
                elif isinstance(value, str):
                    params[key] = f"eq.{value}"
                elif isinstance(value, list):
                    params[key] = f"in.({','.join(str(v) for v in value)})"
                else:
                    params[key] = f"eq.{value}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=self.headers, params=params)
            elif method == 'POST':
                response = requests.post(url, headers=self.headers, json=data)
            elif method == 'PATCH':
                response = requests.patch(url, headers=self.headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=self.headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Supabase request error: {e}")
            raise
    
    def get_all_rooms(self) -> List[Dict[str, Any]]:
        """Get all rooms from cold_storage_rooms table"""
        try:
            rooms = self._request('cold_storage_rooms')
            logger.info(f"Retrieved {len(rooms)} rooms from database")
            return rooms
        except Exception as e:
            logger.error(f"Error fetching rooms: {e}")
            return []
    
    def get_room_sensors(self, room_id: str) -> List[Dict[str, Any]]:
        """Get all sensors for a room from room_sensors table"""
        try:
            sensors = self._request('room_sensors', filters={'room_id': room_id})
            return sensors
        except Exception as e:
            logger.error(f"Error fetching room sensors: {e}")
            return []
    
    def insert_sensor_reading(self, room_sensor_id: str, reading_value: float, unit: str) -> bool:
        """Insert a sensor reading into sensor_readings table"""
        try:
            now = datetime.now().isoformat()
            reading_data = {
                'room_sensor_id': room_sensor_id,
                'reading_value': reading_value,
                'unit': unit,
                'recorded_at': now,
                'received_at': now,
                'quality': 'GOOD'
            }
            
            self._request('sensor_readings', method='POST', data=reading_data)
            return True
        except Exception as e:
            logger.error(f"Error inserting sensor reading: {e}")
            return False
