# ColdSense AI - Live Data Simulator

A clean, modular IoT sensor data simulator that matches your production Supabase schema exactly.

## Architecture

```
cold_storage_rooms
        │
        ▼
room_sensors
        │
        ▼
sensor_readings
```

## Project Structure

```
simulator/
├── config.py              # Configuration settings
├── sensor_generator.py    # Sensor data generation (no DB code)
├── supabase_client.py     # Database operations (no generation code)
├── main.py                # Main runner orchestrator
├── setup_room_sensors.py  # One-time setup script
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Installation

1. **Navigate to simulator directory**
   ```bash
   cd simulator
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your SUPABASE_URL and SUPABASE_KEY
   ```

## Initial Setup (One-Time)

Before running the simulator for the first time, populate the `room_sensors` table:

```bash
python setup_room_sensors.py
```

This script will:
- Read all rooms from `cold_storage_rooms`
- Read all sensor devices from `sensor_devices`
- Read all sensor types from `sensor_types`
- Automatically populate `room_sensors` for each room
- Each room gets: Temperature, Humidity, Door, Energy, Voltage, Current, Battery, Solar sensors
- Skip rooms that already have sensors configured (idempotent)

After running this, `SELECT COUNT(*) FROM room_sensors` should return approximately `rooms × 8` rows.

## Running

```bash
python main.py
```

The simulator will:
1. Read all rooms from `cold_storage_rooms`
2. For each room, read sensors from `room_sensors`
3. Generate a value for each sensor based on its type
4. Insert one row into `sensor_readings` for every sensor
5. Continue every 60 seconds

## Sensor Generation Rules

| Sensor Type | Range | Notes |
|------------|-------|-------|
| Temperature | 2.0-8.0°C | Small random drift every minute |
| Humidity | 80-90% | - |
| Ambient Temperature | 24-36°C | Day/night sinusoidal variation |
| Ambient Humidity | 40-80% | - |
| Energy | 0.3-4.2 kWh | - |
| Solar Energy | 0-6 kWh | Depends on time of day |
| Door | 0/1 | 0=closed, 1=open (occasional opens) |
| CO2 | 350-900 ppm | - |
| Oxygen | 19-21% | - |
| Ethylene | 0-5 ppm | Usually very low |
| Ammonia | 0-50 ppm | Usually 0 with occasional spikes |

## Insert Format

Every insert into `sensor_readings`:

```json
{
  "room_sensor_id": "<sensor_id>",
  "reading_value": 2.7,
  "unit": "°C",
  "recorded_at": "2026-08-05T12:30:00Z",
  "received_at": "2026-08-05T12:30:00Z",
  "quality": "GOOD"
}
```

## Configuration

Edit `config.py` to customize:

```python
# Update interval (seconds)
ROOM_UPDATE_INTERVAL = 60

# Temperature range (°C)
TEMPERATURE_MIN = 2.0
TEMPERATURE_MAX = 8.0

# Humidity range (%)
HUMIDITY_MIN = 80
HUMIDITY_MAX = 90
```

## Console Output

```
==================================================
ColdSense AI Simulator Starting
==================================================
Retrieved 27 rooms from database
Found 27 rooms to simulate
Starting live updates every 60 seconds
Press Ctrl+C to stop
==================================================

[08:45:00] Starting update cycle
  Processing Room 1...
    ✓ Generated 8 readings
  Processing Room 2...
    ✓ Generated 8 readings
[08:45:01] Update cycle completed - 216 total readings
```

## Verification

After the simulator runs for a few minutes, verify:

```sql
SELECT
    room_sensor_id,
    COUNT(*)
FROM sensor_readings
GROUP BY room_sensor_id
LIMIT 10;
```

Every configured sensor should be accumulating readings every minute.

## Stopping

Press `Ctrl+C` to stop the simulator gracefully.

## Troubleshooting

### "No sensors configured for Room X"
- Run `python setup_room_sensors.py` to populate `room_sensors`
- Verify `room_sensors` table has data

### Database errors
- Verify Supabase API key has read/write permissions
- Check table structure matches expectations

## Notes

- Uses only existing production schema
- No fake tables created
- Room-centric architecture
- Quality field always "GOOD" (no failure simulation)
- Matches real IoT architecture for future MQTT integration
