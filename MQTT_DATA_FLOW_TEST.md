# 🔍 MQTT Data Flow Testing - Step by Step

## Goal
Verify that:
1. ✅ IoT data arrives at MQTT broker (localhost:1883)
2. ✅ MQTT subscriber receives and processes data
3. ✅ Data is saved to Supabase `cold_storage_conditions` table
4. ✅ Sensor devices are updated with latest readings

**We're NOT testing frontend yet** - just backend data pipeline.

---

## Prerequisites

✅ GCP VM running (coldsense-production-vm)
✅ External IP: `34.47.199.84`
✅ Docker containers running on GCP VM:
  - coldsense-mqtt-broker (port 1883)
  - coldsense-backend
  - coldsense-mqtt (subscriber)
✅ Supabase project connected (vzoypfctadgyflzwodmp.supabase.co)

---

## Step 1: Verify Supabase Tables Exist

**Run in Supabase SQL Editor:**

```sql
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('cold_storage_conditions', 'sensor_devices', 'sites', 'cold_storage_rooms')
GROUP BY table_name
ORDER BY table_name;
```

**Expected Output:**
```
table_name                  | column_count
cold_storage_conditions     | ~15
sensor_devices              | ~12
sites                       | ~12
cold_storage_rooms          | ~10
```

If any table is missing → **STOP** and create it first.

---

## Step 2: Check Test Data Exists

**Run in Supabase SQL Editor:**

```sql
-- View all sites with rooms
SELECT 
  s.id as site_id,
  s.facility_name,
  COUNT(r.id) as num_rooms,
  STRING_AGG(r.id::text, ', ') as room_ids
FROM public.sites s
LEFT JOIN public.cold_storage_rooms r ON s.id = r.site_id
GROUP BY s.id, s.facility_name
LIMIT 5;
```

**Expected Output:**
```
site_id                              | facility_name        | num_rooms | room_ids
550e8400-e29b-41d4-a716-446655... | Test Multi-Room Site | 2         | 3fa85f64..., 7d123abc...
```

**If no sites exist:**
1. Go to frontend: http://localhost:5174/
2. Login as Owner
3. Create a test site with 2 rooms
4. Configure sensors for each room
5. Note the site_id and room_ids

---

## Step 3: Publish Test Data to MQTT

**SSH into GCP VM:**
```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
```

**Publish test message:**
```bash
# Get actual site and room UUIDs from Supabase first, then replace in this command

mosquitto_pub -h localhost \
  -t "coldsense/550e8400-e29b-41d4-a716-446655440000/3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -m '{
    "site_id": "550e8400-e29b-41d4-a716-446655440000",
    "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp": "2026-08-26T12:35:45Z",
    "sensors": [
      {"sensor_id": "TEMP-001", "sensor_type": "temperature", "value": 5.2, "unit": "°C"},
      {"sensor_id": "HUM-001", "sensor_type": "humidity", "value": 85.5, "unit": "%"},
      {"sensor_id": "DOOR-001", "sensor_type": "door", "value": "closed", "unit": ""}
    ]
  }'
```

**Expected:** Command completes with no error.

---

## Step 4: Check MQTT Subscriber Logs

**Still SSH'd into GCP VM:**
```bash
docker logs coldsense-mqtt --tail=50
```

**Look for these log lines:**
```
📨 MQTT message on topic: coldsense/550e8400-e29b-41d4.../3fa85f64-5717-4562...
✅ Processing 3 sensor(s) for site=550e8400-e29b-41d4... room=3fa85f64-5717-4562...
📡 Sensor: id=TEMP-001 type=temperature value=5.2°C
📡 Sensor: id=HUM-001 type=humidity value=85.5%
📡 Sensor: id=DOOR-001 type=door value=closed
✓ Saved condition data for site=550e8400-e29b-41d4... room=3fa85f64-5717-4562... with 5 fields
```

**If you DON'T see this:**
1. Check if subscriber is running: `docker ps | grep coldsense-mqtt`
2. If not running: `docker compose up -d coldsense-mqtt`
3. Wait 5 seconds and republish test message

**If you see errors:**
- "No sensor_device found" → Sensors don't exist in database (create them via frontend)
- "Missing site_id or room_id" → Topic format wrong (must be exactly 3 parts)
- "Invalid topic format" → Check topic path

---

## Step 5: Verify Data in Supabase

**Run in Supabase SQL Editor:**

```sql
SELECT 
  id,
  site_id,
  room_id,
  temperature,
  humidity,
  door_status,
  recorded_at,
  created_at
FROM public.cold_storage_conditions
WHERE site_id = '550e8400-e29b-41d4-a716-446655440000'
  AND room_id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
ORDER BY recorded_at DESC
LIMIT 1;
```

**Expected Output:**
```
id            | site_id                          | room_id                          | temperature | humidity | door_status | recorded_at         | created_at
uuid          | 550e8400-e29b-41d4-a716-4466... | 3fa85f64-5717-4562-b3fc-2c9... | 5.2         | 85.5     | closed      | 2026-08-26T12:35... | 2026-09-22T07:15...
```

✅ **SUCCESS!** Data made it to Supabase!

---

## Step 6: Verify Sensor Devices Updated

**Run in Supabase SQL Editor:**

```sql
SELECT 
  id,
  room_id,
  sensor_type,
  sensor_code,
  status,
  last_reading_value,
  last_reading_unit,
  last_seen
FROM public.sensor_devices
WHERE room_id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
ORDER BY last_seen DESC
LIMIT 3;
```

**Expected Output:**
```
id      | room_id                          | sensor_type | sensor_code | status | last_reading_value | last_reading_unit | last_seen
uuid... | 3fa85f64-5717-4562-b3fc-2c9... | temperature | TEMP-001    | Online | 5.2                | °C                | 2026-09-22T07:15...
uuid... | 3fa85f64-5717-4562-b3fc-2c9... | humidity    | HUM-001     | Online | 85.5               | %                 | 2026-09-22T07:15...
uuid... | 3fa85f64-5717-4562-b3fc-2c9... | door        | DOOR-001    | Online | closed             |                   | 2026-09-22T07:15...
```

✅ **SUCCESS!** Sensor devices updated with latest readings!

---

## Step 7: Send Multiple Updates

Repeat Step 3-6 with different values to simulate continuous data flow:

```bash
# Update 1
mosquitto_pub -h localhost \
  -t "coldsense/550e8400-e29b-41d4-a716-446655440000/3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -m '{"site_id": "550e8400-e29b-41d4-a716-446655440000", "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "timestamp": "2026-08-26T12:36:00Z", "sensors": [{"sensor_id": "TEMP-001", "sensor_type": "temperature", "value": 5.5, "unit": "°C"}, {"sensor_id": "HUM-001", "sensor_type": "humidity", "value": 84.0, "unit": "%"}]}'

# Update 2 (after 30 seconds)
mosquitto_pub -h localhost \
  -t "coldsense/550e8400-e29b-41d4-a716-446655440000/3fa85f64-5717-4562-b3fc-2c963f66afa6" \
  -m '{"site_id": "550e8400-e29b-41d4-a716-446655440000", "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6", "timestamp": "2026-08-26T12:36:30Z", "sensors": [{"sensor_id": "TEMP-001", "sensor_type": "temperature", "value": 4.8, "unit": "°C"}, {"sensor_id": "HUM-001", "sensor_type": "humidity", "value": 86.5, "unit": "%"}]}'
```

**Check Supabase after each update:**
```sql
SELECT recorded_at, temperature, humidity 
FROM public.cold_storage_conditions
WHERE room_id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
ORDER BY recorded_at DESC
LIMIT 3;
```

**Expected:** New rows appear with updated values.

---

## Checklist - Complete Flow

- [ ] Step 1: Supabase tables verified
- [ ] Step 2: Test data (site + rooms) exists
- [ ] Step 3: Test message published successfully
- [ ] Step 4: Subscriber logs show message received
- [ ] Step 5: Data appears in cold_storage_conditions table
- [ ] Step 6: Sensor devices updated with latest readings
- [ ] Step 7: Multiple updates work correctly

---

## If Any Step Fails

### ❌ Step 3: mosquitto_pub command fails
- **Issue**: mosquitto client not installed
- **Fix**: `sudo apt-get install mosquitto-clients`

### ❌ Step 4: No logs in subscriber
- **Issue**: Subscriber not running
- **Fix**: `docker compose up -d coldsense-mqtt` and wait 5 seconds

### ❌ Step 4: Logs show "⚠ No sensor_device found"
- **Issue**: Sensors don't exist in database
- **Fix**: 
  1. Login to frontend as Owner
  2. Create site → create rooms → configure sensors
  3. Then republish test message

### ❌ Step 5: No data in cold_storage_conditions
- **Issue**: Subscriber didn't save to database
- **Fix**: Check logs for errors, likely Supabase connection issue
- **Debug**: `docker logs coldsense-mqtt | grep -i error`

### ❌ Step 5: Site/room IDs don't match
- **Issue**: Using wrong UUIDs
- **Fix**: Get actual IDs from Supabase:
  ```sql
  SELECT id, facility_name FROM public.sites LIMIT 1;
  SELECT id, site_id, room_code FROM public.cold_storage_rooms LIMIT 1;
  ```

---

## Success Criteria

✅ MQTT message published to broker
✅ Subscriber receives message (logs show 📨)
✅ Data processed (logs show 📡 for each sensor)
✅ Data saved to Supabase (cold_storage_conditions table has new row)
✅ Sensor devices updated (last_seen timestamp recent)
✅ Multiple updates work (time-series data building up)

Once ALL steps pass → **MQTT pipeline is working end-to-end!** 🎉

Then we can:
1. Test with real IoT gateway
2. Monitor in frontend dashboard
3. Build alerts/notifications

---

## Commands Reference

**SSH to VM:**
```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
```

**Check containers running:**
```bash
docker ps
```

**View subscriber logs:**
```bash
docker logs coldsense-mqtt --tail=50 -f
```

**Publish test message:**
```bash
mosquitto_pub -h localhost -t "coldsense/SITE_UUID/ROOM_UUID" -m '{"site_id":"SITE_UUID","room_id":"ROOM_UUID","timestamp":"2026-08-26T12:35:45Z","sensors":[...]}'
```

**Get site/room IDs from Supabase:**
```sql
SELECT s.id, s.facility_name, r.id, r.room_code 
FROM sites s 
LEFT JOIN cold_storage_rooms r ON s.id = r.site_id 
LIMIT 5;
```
