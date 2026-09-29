# 🔌 MQTT Multi-Room Migration Guide
## Update MQTT Architecture for site_id + room_id Structure

---

## Current State
- **Topic Format**: `coldsense/{room_id}/{sensor_type}/{sensor_index}`
- **Limitation**: No site-level hierarchy, only room-level
- **Database**: Uses only `room_id` in cold_storage_conditions table

---

## New Architecture (Multi-Room)

### Topic Structure
**Old (Single-level):**
```
coldsense/room-uuid-123/temperature/1
```

**New (Two-level with site):**
```
coldsense/{site_id}/{room_id}/{sensor_type}/{sensor_index}
```

**Example with real IDs:**
```
coldsense/site-550e8400/room-abc123/temperature/1
coldsense/site-550e8400/room-abc123/humidity/2
coldsense/site-550e8400/room-xyz789/temperature/1
```

---

## Payload Format

### Existing Flat Payload (Simulator currently uses this)
```json
{
  "room_id": "room-uuid-123",
  "temperature": 4.2,
  "humidity": 85.0,
  "door_status": "open"
}
```

### New Flat Payload (With site_id)
```json
{
  "site_id": "site-550e8400",
  "room_id": "room-abc123",
  "temperature": 4.2,
  "humidity": 85.0,
  "ambient_temperature": 28.0,
  "door_status": "open",
  "energy_consumption_kwh": 15.5
}
```

### Per-Sensor Payload (From IoT Gateway)
```json
{
  "site_id": "site-550e8400",
  "room_id": "room-abc123",
  "value": 4.2,
  "unit": "°C",
  "timestamp": "2026-08-26T12:30:00Z"
}
```

---

## Code Changes Required

### 1. MQTT Subscriber (`backend/app/mqtt/subscriber.py`)

**Current Topic Parsing (Line ~44-45):**
```python
# OLD: 4-part topic
# coldsense / {room_id} / {sensor_type} / {sensor_index}
room_id = parts[1]
sensor_type = parts[2]
sensor_index = parts[3]
```

**New Topic Parsing:**
```python
# NEW: 5-part topic (with site_id)
# coldsense / {site_id} / {room_id} / {sensor_type} / {sensor_index}
if len(parts) == 5 and parts[0] == "coldsense":
    site_id = parts[1]
    room_id = parts[2]
    sensor_type = parts[3]
    sensor_index = parts[4]
elif len(parts) == 4 and parts[0] == "coldsense":
    # BACKWARD COMPAT: Old 4-part format (no site_id)
    # Requires room_id to be embedded in payload
    site_id = payload.get("site_id")  # Must be in payload now
    room_id = parts[1]
    sensor_type = parts[2]
    sensor_index = parts[3]
```

**Update Condition Dict (Line ~80-90):**
```python
# OLD
condition: dict = {"room_id": room_id}

# NEW
condition: dict = {"site_id": site_id, "room_id": room_id}
```

### 2. Sensor Service (`backend/app/services/sensor_service.py`)

**Update save_cold_storage_condition():**
```python
def save_cold_storage_condition(condition: dict) -> dict | None:
    """
    Upsert a row into `cold_storage_conditions`.
    
    Required fields:
        site_id  uuid  — FK to sites.id
        room_id  uuid  — FK to cold_storage_rooms.id
    """
    if not condition.get("site_id"):
        logger.warning("save_cold_storage_condition: missing site_id, skipping")
        return None
    
    if not condition.get("room_id"):
        logger.warning("save_cold_storage_condition: missing room_id, skipping")
        return None
    
    site_id = condition["site_id"]
    room_id = condition["room_id"]
    
    data = {
        "site_id": site_id,
        "room_id": room_id,
        "recorded_at": condition.get("recorded_at", datetime.now(timezone.utc).isoformat()),
    }
    
    # ... rest of logic ...
```

### 3. Database Schema Updates

**Add site_id to cold_storage_conditions table:**
```sql
ALTER TABLE public.cold_storage_conditions
ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Add index for faster queries
CREATE INDEX idx_conditions_site_id ON public.cold_storage_conditions(site_id);
CREATE INDEX idx_conditions_site_room ON public.cold_storage_conditions(site_id, room_id);
```

**Add site_id to sensor_devices table:**
```sql
ALTER TABLE public.sensor_devices
ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- For traceability
CREATE INDEX idx_sensors_site_room ON public.sensor_devices(site_id, room_id);
```

### 4. Publisher Updates (`backend/app/mqtt/publisher.py`)

**Current Publisher (Test only):**
```python
# OLD
MQTT_TOPIC = "coldsense/sensors"
payload = {
    "cold_storage_id": "cs-1",
    "temperature_sensor1": 4.2,
    ...
}
```

**New Publisher (For simulator/test):**
```python
# NEW
def publish_sensor_data(site_id: str, room_id: str):
    topic = f"coldsense/{site_id}/{room_id}/temperature/1"
    payload = {
        "site_id": site_id,
        "room_id": room_id,
        "value": 4.2,
        "unit": "°C",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    client.publish(topic, json.dumps(payload))
```

### 5. Simulator Updates (`backend/simulators/sensor_generator.py`)

**Current Simulator:**
```python
# OLD: Publishes to flat topic with room_id only
topic = f"coldsense/facility-{facility_id}"
```

**New Simulator:**
```python
# NEW: Publishes to hierarchical topic with site_id + room_id
topic = f"coldsense/{site_id}/{room_id}/temperature/1"

payload = {
    "site_id": site_id,
    "room_id": room_id,
    "value": generate_temperature(),
    "unit": "°C",
    "timestamp": datetime.now(timezone.utc).isoformat()
}
```

---

## GCP IoT Gateway Integration

### Expected Payload Format (From Real Sensors)
Your IoT gateway will send messages like:
```json
{
  "site_id": "550e8400-e29b-41d4-a716-446655440000",
  "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "sensor_type": "temperature",
  "value": 5.2,
  "unit": "°C",
  "timestamp": "2026-08-26T12:35:45Z"
}
```

### Topic Mapping for Gateway
Configure your GCP IoT Gateway to publish to:
```
coldsense/{site_id}/{room_id}/{sensor_type}/{sensor_index}
```

**Example topics:**
- `coldsense/site-550e8400/room-abc123/temperature/1`
- `coldsense/site-550e8400/room-abc123/humidity/1`
- `coldsense/site-550e8400/room-xyz789/door/1`

The MQTT subscriber will automatically parse these and store in the database.

---

## Migration Steps

### Phase 1: Database Schema (Run on Supabase)
```sql
-- Add site_id columns
ALTER TABLE public.cold_storage_conditions
ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE public.sensor_devices
ADD COLUMN site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_conditions_site_room ON public.cold_storage_conditions(site_id, room_id);
CREATE INDEX idx_sensors_site_room ON public.sensor_devices(site_id, room_id);

-- Backfill site_id from room relationships
UPDATE public.cold_storage_conditions csc
SET site_id = csr.site_id
FROM public.cold_storage_rooms csr
WHERE csc.room_id = csr.id;

UPDATE public.sensor_devices sd
SET site_id = csr.site_id
FROM public.cold_storage_rooms csr
WHERE sd.room_id = csr.id;
```

### Phase 2: Backend Code Changes
1. Update `backend/app/mqtt/subscriber.py` (topic parsing + site_id handling)
2. Update `backend/app/services/sensor_service.py` (save functions)
3. Update publisher/simulator to use new topic format

### Phase 3: Testing
1. Start MQTT broker: `docker compose up -d mqtt-broker`
2. Start subscriber: `python -m app.mqtt.subscriber`
3. Publish test message:
   ```bash
   mosquitto_pub -h localhost -t "coldsense/site-123/room-456/temperature/1" \
     -m '{"site_id":"site-123","room_id":"room-456","value":4.5,"unit":"°C"}'
   ```
4. Verify in Supabase: Check `cold_storage_conditions` table for new row

### Phase 4: IoT Gateway Configuration
1. Note the external IP of your GCP VM
2. Configure IoT gateway to publish to: `mqtt://{VM_EXTERNAL_IP}:1883`
3. Set MQTT topics to: `coldsense/{site_id}/{room_id}/{sensor_type}/{sensor_index}`
4. Test with a single sensor first

---

## Backward Compatibility

The updated subscriber will support **both old and new topic formats**:

```python
# NEW: 5-part with site_id
coldsense/site-123/room-456/temperature/1  ✅

# OLD: 4-part without site_id (requires site_id in payload)
coldsense/room-456/temperature/1           ✅ (if payload has site_id)

# Legacy flat (still supported)
coldsense/sensors                          ✅ (if payload has site_id + room_id)
```

This allows gradual migration—old sensors can keep publishing until replaced.

---

## Database Schema (Updated)

### cold_storage_conditions table
```
id                        uuid (PK)
site_id                   uuid (FK → sites.id)  [NEW]
room_id                   uuid (FK → cold_storage_rooms.id)
temperature               numeric
humidity                  numeric
ambient_temperature       numeric
ambient_humidity          numeric
door_status              text
energy_consumption_kwh   numeric
recorded_at              timestamp
created_at               timestamp

Indexes:
- (site_id, room_id)  [NEW - for dashboard queries per room]
```

### sensor_devices table
```
id                        uuid (PK)
site_id                   uuid (FK → sites.id)  [NEW]
room_id                   uuid (FK → cold_storage_rooms.id)
sensor_type              text
sensor_code              text (UNIQUE per room)
status                   text
last_reading_value       numeric  [NEW - for last value cache]
last_reading_unit        text     [NEW]
last_seen                timestamp [NEW]
created_at               timestamp

Indexes:
- (site_id, room_id, sensor_type)  [NEW]
```

---

## Testing Configuration

### Local Testing (Before IoT Gateway)
Use the simulator with site_id:
```bash
cd backend/simulators
python sensor_generator.py \
  --num-sites 1 \
  --num-rooms 2 \
  --mqtt-broker mqtt-broker \
  --mqtt-port 1883
```

### Production Testing (With IoT Gateway)
1. Configure IoT gateway to send to: `mqtt://{GCP_VM_EXTERNAL_IP}:1883/coldsense/#`
2. Monitor subscriber logs: `docker logs coldsense-mqtt -f`
3. Verify data in Supabase: Query `cold_storage_conditions` table
4. Check frontend: Open FarmerInventory → Monitoring tab → see live sensor data

---

## Troubleshooting

### Issue: "Missing site_id" in logs
- **Cause**: Payload doesn't include site_id
- **Fix**: Ensure IoT gateway payload includes site_id field
- **Example**: `{"site_id":"xyz","room_id":"abc","value":4.5}`

### Issue: MQTT not connecting (rc=7)
- **Cause**: MQTT broker unreachable from subscriber container
- **Fix**: Verify broker is running: `docker ps | grep mqtt-broker`
- **Fix**: Check network: `docker exec coldsense-mqtt ping mqtt-broker`

### Issue: Cold storage conditions not appearing
- **Cause**: Subscriber running but not processing messages
- **Fix**: Check logs: `docker logs coldsense-mqtt --tail=50`
- **Fix**: Publish test message: `mosquitto_pub -h localhost -t "coldsense/s1/r1/temp/1" -m '{"value":5}'`

### Issue: Site/room mismatch errors
- **Cause**: site_id or room_id doesn't exist in database
- **Fix**: Verify IDs exist: Query Supabase `sites` and `cold_storage_rooms` tables
- **Fix**: Use actual UUIDs from test data

---

## Next Steps

1. **Update subscriber.py** - Add site_id parsing
2. **Update sensor_service.py** - Add site_id to conditions
3. **Run database migration** - Add site_id columns
4. **Test with simulator** - Verify new format works
5. **Configure IoT gateway** - Point to GCP VM external IP
6. **Monitor in real-time** - Check frontend dashboard for live data

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `backend/app/mqtt/subscriber.py` | Add 5-part topic parsing, site_id handling | HIGH |
| `backend/app/services/sensor_service.py` | Update save functions to include site_id | HIGH |
| `backend/app/mqtt/publisher.py` | Update test publisher (optional) | MEDIUM |
| `backend/simulators/sensor_generator.py` | Update simulator for new format | MEDIUM |
| Database (Supabase) | Run migration SQL | HIGH |
| `infrastructure/docker-compose.yml` | No changes needed | N/A |

---

## Questions for Your Team

1. **IoT Gateway Format**: Will it publish per-sensor or flat payload?
   - Per-sensor: `coldsense/{site_id}/{room_id}/temperature/1` with `{"value":5}`
   - Flat: `coldsense/{site_id}/{room_id}` with `{"temperature":5,"humidity":85}`

2. **Real Sensor Naming**: How are sensors physically labeled?
   - By room + type? (e.g., "Room1-Temp1", "Room1-Humidity1")
   - By code? (e.g., "SENS-001", "SENS-002")
   - By MAC address?

3. **Frequency**: How often do sensors publish?
   - Every 30 seconds?
   - Every 1 minute?
   - On-demand?

4. **Fallback**: If site_id not in payload, should we infer from room?
   - Current logic: Require explicit site_id
   - Alternative: Query DB for site_id from room_id

These answers will help optimize the subscriber logic! 🚀
