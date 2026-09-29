# 📨 MQTT Test Payloads for Multi-Room Architecture

## Test 1: Single Message with Multiple Sensors (14 sensors)

**Topic:**
```
coldsense/site-550e8400/room-3fa85f64
```

**Payload (JSON):**
```json
{
  "site_id": "550e8400-e29b-41d4-a716-446655440000",
  "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "timestamp": "2026-08-26T12:35:45Z",
  "sensors": [
    {
      "sensor_id": "TEMP-001",
      "sensor_type": "temperature",
      "value": 5.2,
      "unit": "°C"
    },
    {
      "sensor_id": "TEMP-002",
      "sensor_type": "temperature",
      "value": 4.9,
      "unit": "°C"
    },
    {
      "sensor_id": "TEMP-003",
      "sensor_type": "temperature",
      "value": 5.1,
      "unit": "°C"
    },
    {
      "sensor_id": "HUM-001",
      "sensor_type": "humidity",
      "value": 85.5,
      "unit": "%"
    },
    {
      "sensor_id": "HUM-002",
      "sensor_type": "humidity",
      "value": 86.2,
      "unit": "%"
    },
    {
      "sensor_id": "HUM-003",
      "sensor_type": "humidity",
      "value": 85.8,
      "unit": "%"
    },
    {
      "sensor_id": "SUCTION-001",
      "sensor_type": "suctionpressure",
      "value": 150.5,
      "unit": "kPa"
    },
    {
      "sensor_id": "DISCHARGE-001",
      "sensor_type": "dischargepressure",
      "value": 250.3,
      "unit": "kPa"
    },
    {
      "sensor_id": "DOOR-001",
      "sensor_type": "door",
      "value": "closed",
      "unit": ""
    },
    {
      "sensor_id": "COMPRESSOR-001",
      "sensor_type": "compressor",
      "value": "running",
      "unit": ""
    },
    {
      "sensor_id": "ENERGY-001",
      "sensor_type": "energy_consumption_kwh",
      "value": 15.5,
      "unit": "kWh"
    },
    {
      "sensor_id": "SOLAR-001",
      "sensor_type": "solar_percentage",
      "value": 75,
      "unit": "%"
    },
    {
      "sensor_id": "AMBIENT-TEMP-001",
      "sensor_type": "ambienttemperature",
      "value": 28.0,
      "unit": "°C"
    },
    {
      "sensor_id": "AMBIENT-HUM-001",
      "sensor_type": "ambienthumidity",
      "value": 65.0,
      "unit": "%"
    }
  ]
}
```

**Bash Command to Test:**
```bash
mosquitto_pub -h 34.47.199.84 -t "coldsense/site-550e8400/room-3fa85f64" \
  -m '{
    "site_id": "550e8400-e29b-41d4-a716-446655440000",
    "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp": "2026-08-26T12:35:45Z",
    "sensors": [
      {"sensor_id": "TEMP-001", "sensor_type": "temperature", "value": 5.2, "unit": "°C"},
      {"sensor_id": "TEMP-002", "sensor_type": "temperature", "value": 4.9, "unit": "°C"},
      {"sensor_id": "HUM-001", "sensor_type": "humidity", "value": 85.5, "unit": "%"},
      {"sensor_id": "DOOR-001", "sensor_type": "door", "value": "closed", "unit": ""},
      {"sensor_id": "ENERGY-001", "sensor_type": "energy_consumption_kwh", "value": 15.5, "unit": "kWh"}
    ]
  }'
```

---

## Test 2: Minimal Payload (3 sensors only)

**Topic:**
```
coldsense/site-550e8400/room-3fa85f64
```

**Payload:**
```json
{
  "site_id": "550e8400-e29b-41d4-a716-446655440000",
  "room_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "timestamp": "2026-08-26T12:35:45Z",
  "sensors": [
    {
      "sensor_id": "TEMP-001",
      "sensor_type": "temperature",
      "value": 5.2,
      "unit": "°C"
    },
    {
      "sensor_id": "HUM-001",
      "sensor_type": "humidity",
      "value": 85.5,
      "unit": "%"
    },
    {
      "sensor_id": "DOOR-001",
      "sensor_type": "door",
      "value": "closed",
      "unit": ""
    }
  ]
}
```

---

## How to Test on GCP VM

### 1. SSH into the VM
```bash
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c
```

### 2. Send test payload with mosquitto_pub
```bash
mosquitto_pub -h localhost -t "coldsense/site-550e8400/room-3fa85f64" \
  -m '{
    "site_id":"550e8400-e29b-41d4-a716-446655440000",
    "room_id":"3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp":"2026-08-26T12:35:45Z",
    "sensors":[
      {"sensor_id":"TEMP-001","sensor_type":"temperature","value":5.2,"unit":"°C"},
      {"sensor_id":"HUM-001","sensor_type":"humidity","value":85.5,"unit":"%"},
      {"sensor_id":"DOOR-001","sensor_type":"door","value":"closed","unit":""}
    ]
  }'
```

### 3. Check subscriber logs
```bash
docker logs coldsense-mqtt --tail=50
```

Expected output:
```
📨 MQTT message on topic: coldsense/site-550e8400/room-3fa85f64
✅ Processing 3 sensor(s) for site=site-550e8400 room=3fa85f64
📡 Sensor: id=TEMP-001 type=temperature value=5.2°C
📡 Sensor: id=HUM-001 type=humidity value=85.5%
📡 Sensor: id=DOOR-001 type=door value=closed
✓ Saved condition data for site=site-550e8400 room=3fa85f64 with 5 fields
```

### 4. Verify in Supabase
Query the cold_storage_conditions table:
```sql
SELECT * FROM public.cold_storage_conditions 
WHERE site_id = '550e8400-e29b-41d4-a716-446655440000'
  AND room_id = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
ORDER BY recorded_at DESC
LIMIT 1;
```

Should show:
```
id                    | site_id               | room_id               | temperature | humidity | door_status | recorded_at
uuid                  | 550e8400-e29b-41d4... | 3fa85f64-5717-4562... | 5.2         | 85.5     | closed      | 2026-08-26T12:35:45Z
```

---

## Key Points

✅ **Flexible**: Send 1, 3, 14, or any number of sensors per message
✅ **Efficient**: All data for a room in ONE MQTT message
✅ **Site + Room**: Both site_id and room_id in topic and payload
✅ **Sensor Types Supported**:
- `temperature` → temperature field
- `humidity` → humidity field
- `ambienttemperature` → ambient_temperature field
- `ambienthumidity` → ambient_humidity field
- `suctionpressure` → suction_pressure field
- `dischargepressure` → discharge_pressure field
- `door` → door_status field
- `compressor` → compressor_status field
- `energy_consumption_kwh` → energy_consumption_kwh field
- `solar_percentage` → solar_percentage field

✅ **Sensor Matching**:
- By `sensor_code` (primary match - must exist in sensor_devices table)
- By `sensor_type` (fallback - first matching type)

---

## Troubleshooting

**Issue**: "No sensors in payload"
- **Fix**: Ensure `sensors` array is not empty

**Issue**: "Missing site_id or room_id"
- **Fix**: Both must be in topic path: `coldsense/{site_id}/{room_id}`

**Issue**: "Invalid topic format"
- **Fix**: Topic must be exactly 3 parts: `coldsense/X/Y` (not 4 or 5)

**Issue**: "No sensor_device found"
- **Fix**: Sensor with that sensor_code/type doesn't exist in database
- **Action**: Create sensor via Owner Setup UI first

**Issue**: Subscriber keeps disconnecting (rc=7)
- **Fix**: Check MQTT broker is running: `docker ps | grep mqtt-broker`

---

## Integration with IoT Gateway

Configure your GCP IoT Gateway to:

**Publish Topic:**
```
coldsense/{site_id}/{room_id}
```

**Publish Payload:**
```json
{
  "site_id": "YOUR_SITE_UUID",
  "room_id": "YOUR_ROOM_UUID",
  "timestamp": "2026-08-26T12:35:45Z",
  "sensors": [
    {"sensor_id": "SENSOR_CODE", "sensor_type": "temperature", "value": VALUE, "unit": "UNIT"},
    ...
  ]
}
```

**MQTT Broker Details:**
- Host: `34.47.199.84` (GCP external IP)
- Port: `1883`
- QoS: 1 or 0
- No authentication required (currently)
