"""
ColdSense AI - Room Sensors Setup Script
Populates room_sensors table from sensor_devices
"""
import requests
import logging
from typing import Dict, Any, List
from config import Config
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RoomSensorsSetup:
    """Populates room_sensors table from sensor_devices"""
    
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
    
    def get_rooms(self) -> List[Dict[str, Any]]:
        """Get all rooms from cold_storage_rooms"""
        try:
            rooms = self._request('cold_storage_rooms')
            logger.info(f"Found {len(rooms)} rooms")
            return rooms
        except Exception as e:
            logger.error(f"Error fetching rooms: {e}")
            return []
    
    def get_sensor_devices(self) -> List[Dict[str, Any]]:
        """Get all sensor devices"""
        try:
            devices = self._request('sensor_devices')
            logger.info(f"Found {len(devices)} sensor devices")
            return devices
        except Exception as e:
            logger.error(f"Error fetching sensor devices: {e}")
            return []
    
    def get_sensor_types(self) -> List[Dict[str, Any]]:
        """Get all sensor types"""
        try:
            types = self._request('sensor_types')
            logger.info(f"Found {len(types)} sensor types")
            return types
        except Exception as e:
            logger.error(f"Error fetching sensor types: {e}")
            return []
    
    def get_existing_room_sensors(self) -> List[Dict[str, Any]]:
        """Get existing room sensor mappings"""
        try:
            existing = self._request('room_sensors')
            logger.info(f"Found {len(existing)} existing room sensor mappings")
            return existing
        except Exception as e:
            logger.error(f"Error fetching existing room sensors: {e}")
            return []
    
    def get_rooms_with_sensors(self, existing_mappings: List[Dict[str, Any]]) -> set:
        """Get set of room IDs that already have sensors assigned"""
        return set(mapping['room_id'] for mapping in existing_mappings)
    
    def find_sensor_type_by_name(self, types: List[Dict[str, Any]], sensor_type_name: str) -> Dict[str, Any]:
        """Find sensor type by sensor_name (sensor_types.sensor_name)"""
        # sensor_types table has sensor_name column
        sensor_type = next((t for t in types if t['sensor_name'].lower() == sensor_type_name.lower()), None)
        if not sensor_type:
            # Try matching by category
            sensor_type = next((t for t in types if t.get('category', '').lower() == sensor_type_name.lower()), None)
        return sensor_type
    
    def setup_room_sensors(self):
        """Main setup function"""
        logger.info("=" * 50)
        logger.info("Room Sensors Setup Starting")
        logger.info("=" * 50)
        
        # Fetch all data
        rooms = self.get_rooms()
        devices = self.get_sensor_devices()
        types = self.get_sensor_types()
        existing_mappings = self.get_existing_room_sensors()
        
        if not rooms:
            logger.error("No rooms found. Exiting.")
            return
        
        if not devices:
            logger.error("No sensor devices found. Exiting.")
            return
        
        if not types:
            logger.error("No sensor types found. Exiting.")
            return
        
        # Get rooms that already have sensors
        rooms_with_sensors = self.get_rooms_with_sensors(existing_mappings)
        logger.info(f"Rooms already configured: {len(rooms_with_sensors)}")
        
        # Required sensor types for each room
        required_sensor_types = [
            'temperature',
            'humidity',
            'door',
            'energy',
            'voltage',
            'current',
            'battery',
            'solar'
        ]
        
        # Group devices by room
        devices_by_room = {}
        for device in devices:
            room_id = device.get('room_id')
            if room_id:
                if room_id not in devices_by_room:
                    devices_by_room[room_id] = []
                devices_by_room[room_id].append(device)
        
        # Setup sensors for each room
        rooms_configured = 0
        sensors_assigned = 0
        
        for room in rooms:
            room_id = room['id']
            room_name = room.get('room_name', 'Unknown')
            
            # Skip if room already has sensors
            if room_id in rooms_with_sensors:
                logger.info(f"Skipping {room_name} (already configured)")
                continue
            
            logger.info(f"Configuring sensors for {room_name}...")
            
            # Get devices for this room
            room_devices = devices_by_room.get(room_id, [])
            
            if not room_devices:
                logger.warning(f"  No sensor devices found for {room_name}")
                continue
            
            # Track used sensor types for this room
            used_sensor_types = set()
            
            # Assign each required sensor type
            for sensor_type_name in required_sensor_types:
                # Find sensor type ID
                sensor_type = self.find_sensor_type_by_name(types, sensor_type_name)
                
                if not sensor_type:
                    logger.warning(f"  ⚠ Sensor type '{sensor_type_name}' not found in sensor_types")
                    continue
                
                # Find a device of this type in the room
                device = next(
                    (d for d in room_devices 
                     if d.get('sensor_type', '').lower() == sensor_type_name.lower() 
                     and d['id'] not in used_sensor_types),
                    None
                )
                
                if device:
                    # Insert into room_sensors
                    mapping_data = {
                        'id': str(uuid.uuid4()),
                        'room_id': room_id,
                        'sensor_type_id': sensor_type['id'],
                        'sensor_label': device.get('sensor_name', f"{sensor_type_name} Sensor"),
                        'serial_number': device.get('serial_number', ''),
                        'manufacturer': device.get('manufacturer', 'Unknown'),
                        'installation_date': device.get('installation_date', None),
                        'calibration_due': device.get('last_calibration', None),
                        'firmware_version': device.get('firmware_version', '1.0.0'),
                        'mqtt_topic': device.get('mqtt_topic', ''),
                        'is_active': True
                    }
                    
                    try:
                        self._request('room_sensors', method='POST', data=mapping_data)
                        used_sensor_types.add(device['id'])
                        sensors_assigned += 1
                        logger.info(f"  ✓ Assigned {sensor_type_name} sensor (type: {sensor_type.get('sensor_name', 'Unknown')})")
                    except Exception as e:
                        logger.error(f"  ✗ Failed to assign {sensor_type_name} sensor: {e}")
                else:
                    logger.warning(f"  ⚠ No available device for {sensor_type_name} sensor")
            
            rooms_configured += 1
        
        logger.info("=" * 50)
        logger.info("Setup Complete")
        logger.info(f"Rooms configured: {rooms_configured}")
        logger.info(f"Sensors assigned: {sensors_assigned}")
        logger.info(f"Total room_sensors rows expected: {len(existing_mappings) + sensors_assigned}")
        logger.info("=" * 50)
        
        # Verify
        final_mappings = self.get_existing_room_sensors()
        logger.info(f"Final room_sensors count: {len(final_mappings)}")

def main():
    """Main entry point"""
    try:
        setup = RoomSensorsSetup()
        setup.setup_room_sensors()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise

if __name__ == "__main__":
    main()
