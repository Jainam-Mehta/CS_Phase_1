# ColdSense AI - Live Data Simulator

A realistic IoT sensor data simulator for ColdSense AI project demonstration purposes. Generates live sensor readings and updates Supabase every 60 seconds without requiring MQTT brokers or AWS infrastructure.

## Features

- **Realistic Sensor Data**: Generates smooth, realistic transitions for temperature, humidity, energy, and more
- **Real Agricultural Data**: Uses actual recommended storage conditions for products (Apple, Dragon Fruit, Mango, etc.)
- **Product Optimality**: Calculates storage optimality percentages based on current conditions
- **Historical Data**: Generates 24 hours of historical data for graph support
- **Door Analytics**: Tracks door opens, duration, and last open time
- **Energy Analytics**: Generates hourly, daily, and weekly energy consumption
- **Inventory Health**: Calculates freshness, shelf life remaining, and spoilage risk
- **Automatic Updates**: Runs every 60 seconds indefinitely
- **Zero External Dependencies**: No MQTT, AWS, or Docker required

## Project Structure

```
backend/simulators/
├── simulator.py              # Main simulator entry point
├── sensor_generator.py      # Generates realistic sensor readings
├── product_optimality.py   # Calculates product storage optimality
├── energy_generator.py      # Generates energy consumption data
├── door_generator.py        # Generates door event analytics
├── weather_generator.py     # Generates ambient weather conditions
├── config.py                # Configuration settings
├── requirements.txt         # Python dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Installation

### Prerequisites

- Python 3.8 or higher
- Supabase project with API access
- Existing database tables:
  - `cold_storage_rooms`
  - `cold_storage_conditions`
  - `batch_room_allocations`
  - `batches`
  - `products`
  - `facilities`

### Setup Steps

1. **Navigate to simulator directory**
   ```bash
   cd backend/simulators
   ```

2. **Create virtual environment** (recommended)
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your Supabase credentials
   # Get these from your Supabase project settings
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

## Running the Simulator

### Start the Simulator

```bash
python simulator.py
```

The simulator will:
1. Load all rooms, facilities, batches, and products from Supabase
2. Generate 24 hours of historical data
3. Start updating sensor data every 60 seconds
4. Continue running indefinitely until stopped

### Console Output

You'll see output like:
```
2024-01-15 08:45:00 - INFO - ColdSense Simulator initialized
2024-01-15 08:45:01 - INFO - Loading data from Supabase...
2024-01-15 08:45:02 - INFO - Loaded 5 rooms
2024-01-15 08:45:02 - INFO - Loaded 2 facilities
2024-01-15 08:45:02 - INFO - Loaded 10 batches
2024-01-15 08:45:02 - INFO - Loaded 15 products
2024-01-15 08:45:02 - INFO - Generating 24 hours of historical data...
2024-01-15 08:45:03 - INFO - Historical data generation completed
==================================================
Starting update cycle at 08:45:03
==================================================
Updating Room Room 1 (ID: xxx-xxx-xxx)...
  Temp: 2.5°C
  Humidity: 86%
  Door: Closed
  Energy: 3.4kWh
  Updated Successfully
Updating Room Room 2 (ID: xxx-xxx-xxx)...
  Temp: 2.8°C
  Humidity: 87%
  Door: Closed
  Energy: 3.2kWh
  Updated Successfully
==================================================
Update cycle completed at 08:45:04
==================================================
2024-01-15 08:45:04 - INFO - Simulator started. Updates every 60 seconds.
Press Ctrl+C to stop.
```

## Stopping the Simulator

Press `Ctrl+C` to stop the simulator gracefully.

## Sensor Data Generated

### Per Room Update

Each room generates:
- **Internal Temperature**: 1.0-15.0°C (smooth transitions)
- **Internal Humidity**: 70-95% (smooth transitions)
- **Ambient Temperature**: 25-40°C (varies by time of day)
- **Ambient Humidity**: 40-80% (varies by time of day)
- **Door Status**: Open/Closed (5% open probability)
- **Door Open Duration**: 5-60 seconds (when open)
- **Door Opens Today**: Random count (1-20)
- **Energy Consumption**: 2.0-5.0 kWh/hour
- **Compressor Status**: Running/Idle
- **Fan Status**: Running/Stopped
- **Battery Percentage**: 60-100%
- **Solar Percentage**: 0-100% (daytime only)
- **Voltage**: 220-240V
- **Current**: 10-20A
- **Last Updated**: Current timestamp

### Product Optimality

For each product in a room:
- **Optimal Temperature Range**: Real agricultural values
- **Current Temperature**: Live sensor reading
- **Temperature Optimality**: 0-100% based on optimal range
- **Optimal Humidity Range**: Real agricultural values
- **Current Humidity**: Live sensor reading
- **Humidity Optimality**: 0-100% based on optimal range
- **Overall Optimality**: Average of temp and humidity

### Supported Products

The simulator uses real agricultural storage conditions for:
- Apple (0-4°C, 90-95% humidity)
- Avocado (4-13°C, 85-90% humidity)
- Dragon Fruit (5-7°C, 85-95% humidity)
- Mango (10-13°C, 85-90% humidity)
- Banana (13-14°C, 90-95% humidity)
- Potato (7-10°C, 85-90% humidity)
- Tomato (10-15°C, 85-90% humidity)
- Onion (0-4°C, 65-70% humidity)
- Grapes (-1-2°C, 90-95% humidity)
- Orange (3-9°C, 85-90% humidity)
- Carrot (0-5°C, 90-95% humidity)
- Capsicum (7-10°C, 90-95% humidity)
- Milk (2-4°C, 85-90% humidity)

## Dashboard Compatibility

The simulator updates the exact fields consumed by your frontend:

### cold_storage_conditions Table
- `room_id`
- `temperature`
- `humidity`
- `ambient_temperature`
- `ambient_humidity`
- `door_status`
- `door_open_duration`
- `door_opens_today`
- `door_last_open_time`
- `energy_consumption_kwh`
- `compressor_status`
- `fan_status`
- `battery_percentage`
- `solar_percentage`
- `voltage`
- `current`
- `recorded_at`

### Graph Support
Historical data is generated for:
- Temperature (last 24 hours)
- Humidity (last 24 hours)
- Energy (hourly, daily, weekly)
- Door events (last 24 hours)

## Configuration

Edit `config.py` to customize:

```python
# Update frequency
UPDATE_INTERVAL_SECONDS = 60

# Historical data duration
HISTORICAL_DATA_HOURS = 24

# Sensor value ranges
INTERNAL_TEMP_MIN = 1.0
INTERNAL_TEMP_MAX = 15.0
# ... etc
```

## Troubleshooting

### "SUPABASE_URL and SUPABASE_KEY must be set"
- Ensure you've created a `.env` file
- Check that `.env` contains valid Supabase credentials
- Get credentials from Supabase Dashboard → Settings → API

### "Error loading database data"
- Verify Supabase tables exist
- Check Supabase API key has read/write permissions
- Ensure your Supabase project is active

### "No rooms found"
- Ensure `cold_storage_rooms` table has data
- Verify the table structure matches expectations
- Check that facilities and rooms are created in your database

### Simulator not updating frontend
- Check frontend is querying `cold_storage_conditions` table
- Verify frontend refreshes data every 60 seconds
- Check browser console for any API errors
- Ensure Supabase Row Level Security (RLS) allows reads

### Historical data not appearing in graphs
- Verify frontend queries use `recorded_at` for time-based filtering
- Check that frontend displays data in chronological order
- Ensure graph component handles the data format correctly

### Python errors on startup
- Ensure Python 3.8+ is installed: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`
- Check for conflicting packages: `pip list`

## Development

### Adding New Products

Edit `product_optimality.py` and add to `PRODUCT_STORAGE_CONDITIONS`:

```python
'NewProduct': {
    'optimal_temp_min': 0.0,
    'optimal_temp_max': 5.0,
    'optimal_humidity_min': 85,
    'optimal_humidity_max': 90,
    'shelf_life_days': 30,
    'storage_type': 'Cold Storage'
}
```

### Modifying Sensor Ranges

Edit `config.py` to adjust sensor value ranges:

```python
INTERNAL_TEMP_MIN = 0.0  # Adjust minimum temperature
INTERNAL_TEMP_MAX = 20.0  # Adjust maximum temperature
```

### Changing Update Frequency

Edit `config.py`:

```python
UPDATE_INTERVAL_SECONDS = 30  # Update every 30 seconds
```

## Notes

- This simulator is for demonstration purposes only
- Data is simulated and does not represent real sensor readings
- No connection to actual IoT hardware
- Supabase is updated directly (no MQTT broker)
- Runs indefinitely until manually stopped
- All database reads are dynamic (no hardcoded values)

## License

Internal project use only.
