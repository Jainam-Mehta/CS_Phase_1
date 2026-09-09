"""
ColdSense AI - Live Data Simulator
Generates realistic IoT sensor data and updates Supabase every 60 seconds
"""
import time
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List
from apscheduler.schedulers.background import BackgroundScheduler

from config import Config
from sensor_generator import SensorGenerator
from product_optimality import ProductOptimalityCalculator
from energy_generator import EnergyGenerator
from door_generator import DoorGenerator
from weather_generator import WeatherGenerator
from market_price_generator import MarketPriceGenerator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ColdSenseSimulator:
    """Main simulator class for ColdSense AI"""
    
    def __init__(self):
        # Initialize Supabase client using requests
        if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        
        self.supabase_url = Config.SUPABASE_URL
        self.supabase_key = Config.SUPABASE_KEY
        self.headers = {
            'apikey': self.supabase_key,
            'Authorization': f'Bearer {self.supabase_key}',
            'Content-Type': 'application/json'
        }
        
        # Initialize generators
        self.sensor_generator = SensorGenerator()
        self.product_calculator = ProductOptimalityCalculator()
        self.energy_generator = EnergyGenerator()
        self.door_generator = DoorGenerator()
        self.weather_generator = WeatherGenerator()
        self.market_generator = MarketPriceGenerator()
        
        # Cache for database data
        self.rooms_cache: List[Dict[str, Any]] = []
        self.facilities_cache: List[Dict[str, Any]] = []
        self.batches_cache: List[Dict[str, Any]] = []
        self.products_cache: List[Dict[str, Any]] = []
        
        # Scheduler
        self.scheduler = BackgroundScheduler()
        
        logger.info("ColdSense Simulator initialized")
    
    def _supabase_request(self, table: str, method: str = 'GET', data: Dict = None, filters: Dict = None) -> Dict:
        """Make a request to Supabase REST API"""
        url = f"{self.supabase_url}/rest/v1/{table}"
        params = {}
        
        if filters:
            for key, value in filters.items():
                if isinstance(value, str):
                    params[key] = f"eq.{value}"
                elif isinstance(value, list):
                    params[key] = f"in.({','.join(str(v) for v in value)})"
                else:
                    params[key] = f"eq.{value}"
        
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
    
    def load_database_data(self):
        """Load all necessary data from Supabase"""
        logger.info("Loading data from Supabase...")
        
        try:
            # Load rooms
            rooms_response = self._supabase_request('cold_storage_rooms')
            self.rooms_cache = rooms_response
            logger.info(f"Loaded {len(self.rooms_cache)} rooms")
            
            # Load facilities
            facilities_response = self._supabase_request('facilities')
            self.facilities_cache = facilities_response
            logger.info(f"Loaded {len(self.facilities_cache)} facilities")
            
            # Load batches
            batches_response = self._supabase_request('batches')
            self.batches_cache = batches_response
            logger.info(f"Loaded {len(self.batches_cache)} batches")
            
            # Load products
            products_response = self._supabase_request('products')
            self.products_cache = products_response
            logger.info(f"Loaded {len(self.products_cache)} products")
            
        except Exception as e:
            logger.error(f"Error loading database data: {e}")
            raise
    
    def get_products_in_room(self, room_id: str) -> List[str]:
        """Get list of product names stored in a room"""
        try:
            # Get batch allocations for this room
            allocations_response = self._supabase_request(
                'batch_room_allocations',
                filters={'room_id': room_id, 'removed_at': 'null'}
            )
            
            if not allocations_response:
                return []
            
            product_ids = [a['batch_id'] for a in allocations_response]
            
            # Get batch details to find product IDs
            batch_ids = []
            for batch in self.batches_cache:
                if batch['id'] in product_ids:
                    batch_ids.append(batch['product_id'])
            
            # Get product names
            products_in_room = []
            for product in self.products_cache:
                if product['id'] in batch_ids:
                    products_in_room.append(product['name'])
            
            return products_in_room
        except Exception as e:
            logger.debug(f"Error getting products in room: {e}")
            return []
    
    def update_room_conditions(self, room: Dict[str, Any]):
        """Update sensor data for a single room"""
        room_id = room['id']
        room_name = room.get('room_name', 'Unknown')
        
        logger.info(f"Updating Room {room_name} (ID: {room_id})...")
        
        # Generate sensor data
        sensor_data = self.sensor_generator.generate_full_sensor_data(room_id)
        
        # Get products in room
        products_in_room = self.get_products_in_room(room_id)
        
        # Calculate product optimality if products exist
        optimality_data = []
        if products_in_room:
            optimality_data = self.product_calculator.calculate_product_optimality_for_room(
                sensor_data['internal_temperature'],
                sensor_data['internal_humidity'],
                products_in_room
            )
        
        # Generate energy data
        base_energy = sensor_data['energy_consumption_kwh']
        hourly_energy = self.energy_generator.generate_hourly_energy(room_id, base_energy)
        daily_energy = self.energy_generator.generate_daily_energy(room_id)
        weekly_energy = self.energy_generator.generate_weekly_energy(room_id)
        
        # Generate door analytics
        door_analytics = self.door_generator.get_door_analytics(room_id)
        
        # Prepare update data for cold_storage_conditions table
        conditions_data = {
            'room_id': room_id,
            'temperature': sensor_data['internal_temperature'],
            'humidity': sensor_data['internal_humidity'],
            'ambient_temperature': sensor_data['ambient_temperature'],
            'ambient_humidity': sensor_data['ambient_humidity'],
            'door_status': sensor_data['door_status'],
            'door_open_duration': sensor_data['door_open_duration'],
            'door_opens_today': door_analytics['opens_today'],
            'door_last_open_time': door_analytics['last_open_time'],
            'energy_consumption_kwh': sensor_data['energy_consumption_kwh'],
            'compressor_status': sensor_data['compressor_status'],
            'fan_status': sensor_data['fan_status'],
            'battery_percentage': sensor_data['battery_percentage'],
            'solar_percentage': sensor_data['solar_percentage'],
            'voltage': sensor_data['voltage'],
            'current': sensor_data['current'],
            'recorded_at': datetime.now().isoformat()
        }
        
        # Update or insert into cold_storage_conditions
        try:
            # Check if record exists
            existing = self._supabase_request(
                'cold_storage_conditions',
                filters={'room_id': room_id}
            )
            
            if existing:
                # Update existing record (most recent)
                existing[0].update(conditions_data)
                self._supabase_request(
                    'cold_storage_conditions',
                    method='PATCH',
                    data=conditions_data,
                    filters={'id': existing[0]['id']}
                )
            else:
                # Insert new record
                self._supabase_request(
                    'cold_storage_conditions',
                    method='POST',
                    data=conditions_data
                )
            
            logger.info(f"  Temp: {sensor_data['internal_temperature']}°C")
            logger.info(f"  Humidity: {sensor_data['internal_humidity']}%")
            logger.info(f"  Door: {sensor_data['door_status']}")
            logger.info(f"  Energy: {sensor_data['energy_consumption_kwh']}kWh")
            logger.info(f"  Updated Successfully")
            
        except Exception as e:
            logger.error(f"  Error updating conditions: {e}")
        
        # Update energy history in separate table if it exists
        try:
            energy_history_data = {
                'room_id': room_id,
                'hourly_energy_kwh': hourly_energy,
                'daily_energy_kwh': daily_energy,
                'weekly_energy_kwh': weekly_energy,
                'recorded_at': datetime.now().isoformat()
            }
            
            # Try to insert into energy_history table (may not exist yet)
            self._supabase_request(
                'energy_history',
                method='POST',
                data=energy_history_data
            )
        except Exception as e:
            # Table might not exist, log but don't fail
            logger.debug(f"Energy history table not available: {e}")
    
    def update_all_rooms(self):
        """Update sensor data for all rooms"""
        logger.info("=" * 50)
        logger.info(f"Starting update cycle at {datetime.now().strftime('%H:%M:%S')}")
        logger.info("=" * 50)
        
        # Reload data from database (in case of changes)
        self.load_database_data()
        
        # Update each room
        for room in self.rooms_cache:
            try:
                self.update_room_conditions(room)
            except Exception as e:
                logger.error(f"Error updating room {room.get('room_name', 'Unknown')}: {e}")
        
        logger.info("=" * 50)
        logger.info(f"Update cycle completed at {datetime.now().strftime('%H:%M:%S')}")
        logger.info("=" * 50)
    
    def update_market_prices(self):
        """Update market prices for all products (runs once daily)"""
        logger.info("=" * 50)
        logger.info(f"Updating market prices at {datetime.now().strftime('%H:%M:%S')}")
        logger.info("=" * 50)
        
        try:
            # Get all unique products from database
            unique_products = list(set([p['name'] for p in self.products_cache]))
            
            if not unique_products:
                logger.warning("No products found in database")
                return
            
            # Generate prices for all products across major states
            price_records = self.market_generator.generate_prices_for_all_states(unique_products)
            
            logger.info(f"Generated {len(price_records)} price records")
            
            # Insert prices into database via backend API
            # We need to map product names to product IDs first
            product_name_to_id = {p['name']: p['id'] for p in self.products_cache}
            
            successful_inserts = 0
            failed_inserts = 0
            
            for record in price_records:
                product_name = record['product_name']
                product_id = product_name_to_id.get(product_name)
                
                if not product_id:
                    logger.debug(f"Product {product_name} not found in database, skipping")
                    failed_inserts += 1
                    continue
                
                # Prepare data for market_prices table
                market_price_data = {
                    'product_id': product_id,
                    'state': record['state'],
                    'city': record['city'],
                    'market_name': record['market_name'],
                    'price_per_kg': record['price_per_kg'],
                    'recorded_at': record['recorded_at'],
                    'source': record['source'],
                    'created_at': datetime.now().isoformat()
                }
                
                try:
                    # Insert into market_prices table
                    self._supabase_request(
                        'market_prices',
                        method='POST',
                        data=market_price_data
                    )
                    successful_inserts += 1
                except Exception as e:
                    # Log error but continue with other records
                    logger.debug(f"Error inserting price for {product_name}: {e}")
                    failed_inserts += 1
            
            logger.info(f"Market prices updated: {successful_inserts} successful, {failed_inserts} failed")
            
            # Log a sample of prices
            sample_products = unique_products[:3]
            for product in sample_products:
                summary = self.market_generator.get_daily_price_summary(product)
                logger.info(f"  {product}: ₹{summary['min']}-{summary['max']}/kg (avg: ₹{summary['avg']})")
            
        except Exception as e:
            logger.error(f"Error updating market prices: {e}")
        
        logger.info("=" * 50)
    
    def generate_historical_data(self):
        """Generate 24 hours of historical data for all rooms"""
        logger.info("Generating 24 hours of historical data...")
        
        for room in self.rooms_cache:
            room_id = room['id']
            
            for hour in range(Config.HISTORICAL_DATA_HOURS):
                timestamp = datetime.now() - timedelta(hours=Config.HISTORICAL_DATA_HOURS - hour)
                
                # Generate sensor data for this historical timestamp
                sensor_data = self.sensor_generator.generate_full_sensor_data(room_id)
                
                historical_data = {
                    'room_id': room_id,
                    'temperature': sensor_data['internal_temperature'],
                    'humidity': sensor_data['internal_humidity'],
                    'energy_consumption_kwh': sensor_data['energy_consumption_kwh'],
                    'recorded_at': timestamp.isoformat()
                }
                
                try:
                    self._supabase_request(
                        'cold_storage_conditions',
                        method='POST',
                        data=historical_data
                    )
                except Exception as e:
                    logger.debug(f"Error inserting historical data: {e}")
        
        logger.info("Historical data generation completed")
    
    def start(self):
        """Start the simulator"""
        logger.info("Starting ColdSense Simulator...")
        
        # Load initial data
        self.load_database_data()
        
        # Generate historical data
        self.generate_historical_data()
        
        # Schedule periodic updates
        self.scheduler.add_job(
            self.update_all_rooms,
            'interval',
            seconds=Config.UPDATE_INTERVAL_SECONDS,
            id='update_all_rooms'
        )
        
        # Schedule market price updates (once daily at 6 AM IST)
        self.scheduler.add_job(
            self.update_market_prices,
            'cron',
            hour=6,
            minute=0,
            id='update_market_prices'
        )
        
        # Start scheduler
        self.scheduler.start()
        
        # Run initial update for sensors
        self.update_all_rooms()
        
        # Run initial market price update
        self.update_market_prices()
        
        logger.info(f"Simulator started.")
        logger.info(f"  - Sensor updates: Every {Config.UPDATE_INTERVAL_SECONDS} seconds")
        logger.info(f"  - Market prices: Daily at 6:00 AM IST")
        logger.info("Press Ctrl+C to stop.")
    
    def stop(self):
        """Stop the simulator"""
        logger.info("Stopping simulator...")
        self.scheduler.shutdown()
        logger.info("Simulator stopped.")


def main():
    """Main entry point"""
    try:
        simulator = ColdSenseSimulator()
        simulator.start()
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
        simulator.stop()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        raise


if __name__ == "__main__":
    main()
