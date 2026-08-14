"""
ColdSense AI - Main Simulator Runner
Orchestrates sensor generation and database updates
Architecture: cold_storage_rooms → room_sensors → sensor_readings
"""
import time
import logging
from datetime import datetime
from config import Config
from sensor_generator import SensorGenerator
from supabase_client import SupabaseClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """Main simulator loop"""
    logger.info("=" * 50)
    logger.info("ColdSense AI Simulator Starting")
    logger.info("=" * 50)
    
    # Initialize components
    generator = SensorGenerator()
    client = SupabaseClient()
    
    # Get all rooms
    rooms = client.get_all_rooms()
    
    if not rooms:
        logger.error("No rooms found in database. Exiting.")
        return
    
    logger.info(f"Found {len(rooms)} rooms to simulate")
    
    # Main update loop
    logger.info(f"Starting live updates every {Config.ROOM_UPDATE_INTERVAL} seconds")
    logger.info("Press Ctrl+C to stop")
    logger.info("=" * 50)
    
    try:
        while True:
            logger.info(f"\n[{datetime.now().strftime('%H:%M:%S')}] Starting update cycle")
            
            # Refresh rooms (in case new rooms were added)
            rooms = client.get_all_rooms()
            
            if not rooms:
                logger.warning("No rooms found. Waiting...")
                time.sleep(Config.ROOM_UPDATE_INTERVAL)
                continue
            
            total_readings = 0
            
            # Update each room
            for room in rooms:
                room_id = room['id']
                room_name = room.get('room_name', 'Unknown')
                
                logger.info(f"  Processing {room_name}...")
                
                # Get sensors for this room from room_sensors
                sensors = client.get_room_sensors(room_id)
                
                if not sensors:
                    logger.warning(f"    No sensors configured for {room_name}")
                    logger.warning(f"    Run 'python setup_room_sensors.py' to configure sensors")
                    continue
                
                # Generate readings for each sensor
                for sensor in sensors:
                    room_sensor_id = sensor['id']
                    
                    # Determine sensor type from available fields
                    # Try sensor_type first, then sensor_label, then sensor_name
                    sensor_type = sensor.get('sensor_type') or sensor.get('sensor_label') or sensor.get('sensor_name', 'Unknown')
                    
                    # Generate reading
                    reading_data = generator.generate_reading(room_sensor_id, sensor_type)
                    
                    # Insert into sensor_readings
                    success = client.insert_sensor_reading(
                        room_sensor_id,
                        reading_data['reading_value'],
                        reading_data['unit']
                    )
                    
                    if success:
                        total_readings += 1
                        logger.debug(f"      ✓ {sensor_type}: {reading_data['reading_value']}{reading_data['unit']}")
                    else:
                        logger.error(f"      ✗ {sensor_type}: Failed to insert")
                
                logger.info(f"    ✓ Generated {len(sensors)} readings")
            
            logger.info(f"[{datetime.now().strftime('%H:%M:%S')}] Update cycle completed - {total_readings} total readings")
            
            # Wait for next update
            time.sleep(Config.ROOM_UPDATE_INTERVAL)
            
    except KeyboardInterrupt:
        logger.info("\n" + "=" * 50)
        logger.info("Simulator stopped by user")
        logger.info("=" * 50)
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise

if __name__ == "__main__":
    main()
