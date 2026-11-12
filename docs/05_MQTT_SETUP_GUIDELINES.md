# SystmII - MQTT Setup Guidelines (GCP Implementation)

**Document Version:** 1.0  
**Last Updated:** October 26, 2026  
**Status:** Production Ready  
**Scope:** Complete MQTT setup from scratch on GCP  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Basic Setup](#phase-1-basic-setup)
4. [Phase 2: Security Implementation](#phase-2-security-implementation)
5. [Phase 3: Gateway Configuration](#phase-3-gateway-configuration)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting](#troubleshooting)
8. [Production Checklist](#production-checklist)

---

## Architecture Overview

### Current MQTT Stack

```
┌─────────────────────────────────────────────────────────┐
│                   Internet                              │
│                                                         │
│  Gateway (Field)          Gateway (Field)              │
│  GW001 (Nashik)           GW002 (Borivali)            │
│        │                         │                     │
│        └─────────────┬───────────┘                     │
│                      │                                 │
│             MQTT Publish (Port 1883)                   │
│                      │                                 │
│            35.200.159.76:1883 (GCP)                    │
└─────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
    ┌───▼────────┐         ┌───────▼────┐
    │ MQTT Broker│         │ Backend    │
    │(Mosquitto) │         │ Subscriber │
    │Port 1883   │◄────────│ (Docker)   │
    └───┬────────┘         └────────────┘
        │
    ┌───▼───────────┐
    │ PostgreSQL DB │
    │ Port 5432     │
    └───────────────┘
```

### Data Flow

```
Step 1: Gateway publishes MQTT message
Topic: cdsense/gw/GW001/MHNKIGP01/S01/R01
Payload: {TS, fver, SS, device[], DIGI}

Step 2: MQTT Broker receives & stores
Mosquitto (Docker container)
Port 1883

Step 3: Backend Subscriber listens
Python app (Docker container)
Subscribes to: cdsense/#

Step 4: Data processed & stored
PostgreSQL database (Docker container)
Tables: sensor_ingestion_raw, cold_storage_conditions

Step 5: Frontend queries via API
React app (Docker container)
Calls: /api/latest-reading
Displays: Real-time temperature/humidity
```

---

## Prerequisites

### What You Need

1. **GCP Project**
   - Project ID: `exalted-skein-505210-g0`
   - Region: `asia-south1-c` (Mumbai)
   - Static IP: `35.200.159.76`

2. **GCP VM (Already Running)**
   - Instance: `coldsense-production-vm`
   - Machine: `e2-medium` (2 vCPU, 1GB RAM)
   - OS: Ubuntu 20.04
   - Docker: Installed & running
   - Docker Compose: v2.x installed

3. **Gateway Information**
   - Gateway IP ranges (to whitelist in firewall)
   - Gateway firmware version
   - MQTT client library used (paho-mqtt, mosquitto-clients, etc.)
   - Current username/password (if any)

4. **Tools on Your Local Machine**
   - `gcloud` CLI (Google Cloud SDK)
   - `mosquitto-clients` package (for testing)
   - SSH key configured for GCP

### Verify Prerequisites

```bash
# Check gcloud is installed
gcloud --version

# Check you can SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0 \
  --command="docker --version"

# Expected output: Docker version 29.9.0, build f415da8
```

---

## Phase 1: Basic Setup

### Step 1.1: Verify MQTT Broker is Running

```bash
# SSH into GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# On the VM, check Docker containers
docker ps

# Expected output:
# coldsense-mqtt-broker    Up 30 minutes    0.0.0.0:1883->1883/tcp
```

### Step 1.2: Verify Broker Configuration

```bash
# SSH to VM (if not already)
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Check current Mosquitto config
docker exec coldsense-mqtt-broker cat /etc/mosquitto/mosquitto.conf

# Current config (UNSECURED):
# listener 1883
# allow_anonymous true     ← SECURITY GAP

# Current config (WEBSOCKET):
# listener 9001
# protocol websockets
# allow_anonymous true     ← SECURITY GAP
```

### Step 1.3: Verify Gateway Can Connect (Current)

```bash
# Test from your local machine
# Install mosquitto-clients if needed:
# Ubuntu: sudo apt-get install mosquitto-clients
# macOS: brew install mosquitto
# Windows: Download from https://mosquitto.org/download/

# Test anonymous connection
mosquitto_sub -h 35.200.159.76 -p 1883 -t "cdsense/#" -v

# Expected: Connection succeeds (no auth required)
# Wait 10-60 seconds for messages from gateway
# Expected output:
# cdsense/gw/GW001/MHNKIGP01/S01/R01 {"TS":"...", "Temp1":"25.5"}
```

### Step 1.4: Verify Backend is Receiving Data

```bash
# SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Check backend logs
docker logs coldsense-mqtt | tail -50

# Expected: Messages like "Processing MQTT message from cdsense/gw/GW001"
# Or errors like "Connection timeout" (means broker is not responding)
```

### Step 1.5: Verify Data in Database

```bash
# SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Connect to PostgreSQL
docker exec -it coldsense-postgres psql \
  -U coldsense_user \
  -d coldsense \
  -c "SELECT COUNT(*) FROM sensor_ingestion_raw LIMIT 5;"

# Expected: Shows count of records
# If 0: No data received yet (gateway offline?)
```

---

## Phase 2: Security Implementation

### Phase 2.1: Add Authentication (Username/Password)

#### Step 1: Create Password File

```bash
# SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Create password file with first user (gateway 1)
docker exec coldsense-mqtt-broker \
  mosquitto_passwd -c /etc/mosquitto/passwd gw001_user

# Prompt: Password:
# Enter: secure_password_gw001

# Add second gateway
docker exec coldsense-mqtt-broker \
  mosquitto_passwd /etc/mosquitto/passwd gw002_user

# Prompt: Password:
# Enter: secure_password_gw002

# Add backend subscriber user
docker exec coldsense-mqtt-broker \
  mosquitto_passwd /etc/mosquitto/passwd backend_user

# Prompt: Password:
# Enter: secure_password_backend

# Verify passwd file was created
docker exec coldsense-mqtt-broker \
  cat /etc/mosquitto/passwd

# Expected output:
# gw001_user:$7$101$...
# gw002_user:$7$101$...
# backend_user:$7$101$...
```

#### Step 2: Update Mosquitto Configuration

```bash
# SSH to GCP VM (if not already there)
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Create new Mosquitto config with auth enabled
docker exec coldsense-mqtt-broker bash -c 'cat > /etc/mosquitto/mosquitto.conf << EOF
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
protocol mqtt
persistence true
persistence_location /mosquitto/data/

listener 9001
protocol websockets
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF'

# Verify config was updated
docker exec coldsense-mqtt-broker \
  cat /etc/mosquitto/mosquitto.conf

# Expected: allow_anonymous false (both listeners)
```

#### Step 3: Restart MQTT Broker

```bash
# SSH to GCP VM (if not already there)
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Restart the MQTT broker
docker-compose -f /home/jainammehta250/CS_Project/infrastructure/docker-compose.yml \
  restart coldsense-mqtt-broker

# Wait 5 seconds
sleep 5

# Verify it's still running
docker ps | grep mqtt-broker

# Expected: Container status "Up X seconds"
```

#### Step 4: Test Authentication

```bash
# Test 1: Try connecting WITHOUT credentials (should FAIL)
mosquitto_sub -h 35.200.159.76 -p 1883 -t "cdsense/#" -v

# Expected Error:
# Connection refused - not authorised (4)
# OR: Connection timeout

# Test 2: Try connecting WITH valid credentials (should SUCCEED)
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "cdsense/gw/GW001/#" \
  -v

# Expected: Connected
# Wait 30 seconds, should see messages from gateway
# cdsense/gw/GW001/MHNKIGP01/S01/R01 {"TS":"..."}

# Test 3: Try with WRONG password (should FAIL)
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P wrong_password \
  -t "cdsense/#" \
  -v

# Expected Error:
# Connection refused - not authorised (4)
```

### Phase 2.2: Update Backend to Use Credentials

#### Step 1: Update docker-compose.yml

```bash
# On your LOCAL machine (not GCP VM)
# Open file: infrastructure/docker-compose.yml

# Find the "mqtt-subscriber" section and update:
mqtt-subscriber:
  image: asia-south1-docker.pkg.dev/.../backend:latest
  container_name: coldsense-mqtt
  restart: always
  command: python -m app.mqtt.subscriber
  environment:
    DATABASE_URL: postgresql://coldsense_user:coldsense_secure_password_2026@postgres:5432/coldsense
    MQTT_BROKER: mqtt-broker
    MQTT_PORT: 1883
    MQTT_USERNAME: backend_user          ← ADD THIS
    MQTT_PASSWORD: secure_password_backend  ← ADD THIS
    MQTT_TOPIC: cdsense/#
    LOG_LEVEL: INFO
  depends_on:
    postgres:
      condition: service_healthy
    mqtt-broker:
      condition: service_started
  networks:
    - coldsense-network
```

#### Step 2: Update Backend Code to Use Credentials

```python
# File: backend/app/mqtt/subscriber.py

import paho.mqtt.client as mqtt
import os

MQTT_BROKER = os.getenv('MQTT_BROKER', 'mqtt-broker')
MQTT_PORT = int(os.getenv('MQTT_PORT', 1883))
MQTT_USERNAME = os.getenv('MQTT_USERNAME')  ← GET FROM ENV
MQTT_PASSWORD = os.getenv('MQTT_PASSWORD')  ← GET FROM ENV
MQTT_TOPIC = os.getenv('MQTT_TOPIC', 'cdsense/#')

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"Connected to MQTT broker {MQTT_BROKER}")
        client.subscribe(MQTT_TOPIC)
    else:
        print(f"Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    print(f"Received: {msg.topic}")
    # Process message...

client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Set username and password
if MQTT_USERNAME and MQTT_PASSWORD:
    client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
client.loop_forever()
```

#### Step 3: Deploy Updated Code

```bash
# On your LOCAL machine
cd /path/to/CS_Project

# Commit changes
git add infrastructure/docker-compose.yml backend/app/mqtt/subscriber.py
git commit -m "feat: add MQTT authentication to backend subscriber"
git push origin main

# Copy updated docker-compose to GCP
gcloud compute scp infrastructure/docker-compose.yml \
  jainammehta250@coldsense-production-vm:/home/jainammehta250/CS_Project/infrastructure/ \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Rebuild backend image
cd /home/jainammehta250/CS_Project/backend
docker build -t asia-south1-docker.pkg.dev/.../backend:latest .
docker push asia-south1-docker.pkg.dev/.../backend:latest

# Restart services
cd /home/jainammehta250/CS_Project/infrastructure
docker-compose restart coldsense-mqtt

# Verify
docker logs coldsense-mqtt | tail -20
# Expected: Connected to MQTT broker successfully
```

### Phase 2.3: Restrict Firewall to Known Gateway IPs

#### Step 1: Document Gateway IP Ranges

```
Gateway Locations:
┌─────────────────────────────────────────────┐
│ Location      │ IP Range        │ ISP       │
├─────────────────────────────────────────────┤
│ Nashik        │ 203.124.156.0/24 │ Jio      │
│ Borivali      │ 210.102.234.0/24 │ Airtel   │
│ Local Testing │ 203.0.113.0/24   │ Private  │
└─────────────────────────────────────────────┘

Note: Get exact IP ranges from your ISP or gateway operator
Use: nslookup <gateway-domain> to find current IP
```

#### Step 2: Create Firewall Rules

```bash
# On your LOCAL machine (or GCP VM)
# Set variables
NASHIK_IP="203.124.156.0/24"
BORIVALI_IP="210.102.234.0/24"
LOCAL_IP="203.0.113.0/24"

# Create rule for Nashik gateway
gcloud compute firewall-rules create \
  allow-mqtt-nashik \
  --allow=tcp:1883 \
  --source-ranges=$NASHIK_IP \
  --target-tags=mqtt-server \
  --project=exalted-skein-505210-g0 \
  --description="Allow MQTT from Nashik gateway"

# Create rule for Borivali gateway
gcloud compute firewall-rules create \
  allow-mqtt-borivali \
  --allow=tcp:1883 \
  --source-ranges=$BORIVALI_IP \
  --target-tags=mqtt-server \
  --project=exalted-skein-505210-g0 \
  --description="Allow MQTT from Borivali gateway"

# Create rule for local testing
gcloud compute firewall-rules create \
  allow-mqtt-local \
  --allow=tcp:1883 \
  --source-ranges=$LOCAL_IP \
  --target-tags=mqtt-server \
  --project=exalted-skein-505210-g0 \
  --description="Allow MQTT from local testing"

# Verify rules were created
gcloud compute firewall-rules list \
  --filter="name~mqtt" \
  --project=exalted-skein-505210-g0
```

#### Step 3: Tag the VM

```bash
# Add mqtt-server tag to VM
gcloud compute instances add-tags \
  coldsense-production-vm \
  --tags=mqtt-server \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Verify tag was added
gcloud compute instances describe \
  coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0 \
  --format="get(tags.items)"

# Expected: mqtt-server
```

#### Step 4: Delete Old Open Rule

```bash
# Delete the open rule that allows 0.0.0.0/0
gcloud compute firewall-rules delete \
  allow-mqtt \
  --project=exalted-skein-505210-g0 \
  --quiet

# Verify it's gone
gcloud compute firewall-rules list \
  --project=exalted-skein-505210-g0 | grep "allow-mqtt"

# Expected: Only the new restricted rules show up
```

#### Step 5: Test Firewall

```bash
# Test 1: Try connecting from ALLOWED IP (should succeed)
# (You must be on one of the whitelisted IPs)
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "cdsense/gw/GW001/#" \
  -v

# Expected: Connected

# Test 2: Try connecting from BLOCKED IP (should fail)
# (From different IP outside the whitelist)
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "cdsense/#" \
  -v

# Expected Error:
# Connection timeout (firewall blocking)
```

---

## Phase 3: Gateway Configuration

### Step 3.1: Identify Gateway Type

Determine what type of gateway you have:

```
Type 1: Arduino/Raspberry Pi (Custom Firmware)
├─ Has: Serial interface, firmware config file
├─ Update method: Via serial console or SD card
└─ Config file: Usually JSON or INI format

Type 2: Commercial MQTT Device
├─ Has: Web UI dashboard
├─ Update method: Via web browser
└─ Config: MQTT settings in web interface

Type 3: IoT Platform Device (e.g., AWS IoT, Azure IoT)
├─ Has: API or cloud console
├─ Update method: Via cloud platform
└─ Config: Connection strings in cloud

Type 4: Linux Device with MQTT Client
├─ Has: SSH access, command line
├─ Update method: SSH commands
└─ Config: Environment variables or config file
```

### Step 3.2: Update Gateway Configuration

#### Option A: Arduino/Raspberry Pi with Custom Firmware

```cpp
// File: gateway_firmware/config.h

#define MQTT_BROKER "35.200.159.76"
#define MQTT_PORT 1883
#define MQTT_USERNAME "gw001_user"
#define MQTT_PASSWORD "secure_password_gw001"
#define MQTT_TOPIC "cdsense/gw/GW001/MHNKIGP01/S01/R01"

// Using PubSubClient library
#include <PubSubClient.h>

WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  client.setServer(MQTT_BROKER, MQTT_PORT);
  
  // Set credentials
  client.setUsernamePassword(MQTT_USERNAME, MQTT_PASSWORD);
}

void connectToMQTT() {
  if (!client.connected()) {
    if (client.connect("GW001")) {
      Serial.println("Connected to MQTT");
    } else {
      Serial.print("Failed, rc=");
      Serial.println(client.state());
    }
  }
}

void loop() {
  connectToMQTT();
  
  // Send sensor data
  int temp = readTemperature();
  int humidity = readHumidity();
  
  String payload = "{\"TS\":\"261026143022\",\"Temp1\":\"" + String(temp) + "\",\"Humidity1\":\"" + String(humidity) + "\"}";
  client.publish(MQTT_TOPIC, payload.c_str());
  
  delay(60000); // Every 60 seconds
}
```

#### Option B: Web UI Configuration

```
Steps:
1. Open web browser
2. Navigate to: http://[gateway-ip]:8080
3. Go to: Settings > MQTT Configuration
4. Fill in:
   ├─ Broker Address: 35.200.159.76
   ├─ Port: 1883
   ├─ Username: gw001_user
   ├─ Password: secure_password_gw001
   ├─ Topic: cdsense/gw/GW001/MHNKIGP01/S01/R01
   └─ QoS: 1 (At least once delivery)
5. Click: Save & Restart
6. Check: LED indicator shows "Connected"
```

#### Option C: SSH/Command Line

```bash
# SSH to gateway device
ssh root@203.124.156.50

# Edit config file
nano /etc/mqtt_config.json

# Update content:
{
  "mqtt_broker": "35.200.159.76",
  "mqtt_port": 1883,
  "mqtt_username": "gw001_user",
  "mqtt_password": "secure_password_gw001",
  "mqtt_topic": "cdsense/gw/GW001/MHNKIGP01/S01/R01"
}

# Save (Ctrl+O, Enter, Ctrl+X)

# Restart MQTT client service
systemctl restart mqtt-client

# Verify connection
systemctl status mqtt-client
journalctl -n 50 -f -u mqtt-client
# Expected: "Connected to broker 35.200.159.76"
```

### Step 3.3: Verify Gateway Connection

```bash
# From GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Monitor MQTT logs
docker logs -f coldsense-mqtt-broker | grep -i "connect\|error"

# Expected output (in real-time):
# 1635248722 New connection from 203.124.156.50:45231.
# 1635248722 Client GW001 connected.
# 1635248723 Client GW001 PUBLISH cdsense/gw/GW001/MHNKIGP01/S01/R01

# Check if data is being received
docker exec coldsense-postgres psql \
  -U coldsense_user \
  -d coldsense \
  -c "SELECT COUNT(*), MAX(recorded_at) FROM sensor_ingestion_raw WHERE recorded_at > NOW() - INTERVAL '5 minutes';"

# Expected: Shows count > 0 and recent timestamp
```

---

## Testing & Verification

### Test 1: Basic Connectivity

```bash
# Test if MQTT broker is accessible
mosquitto_sub -h 35.200.159.76 -p 1883 -t "test/topic" -v

# If auth enabled:
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "test/topic" \
  -v

# Expected: Connection succeeds, waits for messages
# (Ctrl+C to exit)
```

### Test 2: Message Publishing

```bash
# Terminal 1: Subscribe to topic
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "cdsense/test" \
  -v

# Terminal 2: Publish message
mosquitto_pub -h 35.200.159.76 -p 1883 \
  -u gw001_user \
  -P secure_password_gw001 \
  -t "cdsense/test" \
  -m '{"temperature": 25.5, "humidity": 65}'

# Expected (Terminal 1):
# cdsense/test {"temperature": 25.5, "humidity": 65}
```

### Test 3: Gateway Data Flow

```bash
# Monitor real-time data from gateway
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u backend_user \
  -P secure_password_backend \
  -t "cdsense/gw/+/+/+/+" \
  -v

# Expected output (every 10-60 seconds):
# cdsense/gw/GW001/MHNKIGP01/S01/R01 {"TS":"261026143022","fver":0.1,"SS":-75,"device":[{"id":1,"data":{"Temp1":"25.5"}}],"DIGI":"Off"}
```

### Test 4: Database Ingestion

```bash
# SSH to GCP VM
gcloud compute ssh jainammehta250@coldsense-production-vm \
  --zone=asia-south1-c \
  --project=exalted-skein-505210-g0

# Query recent data
docker exec coldsense-postgres psql \
  -U coldsense_user \
  -d coldsense << EOF
SELECT 
  locality_code,
  temperature,
  humidity,
  recorded_at
FROM cold_storage_conditions
ORDER BY recorded_at DESC
LIMIT 10;
EOF

# Expected output:
# locality_code | temperature | humidity |       recorded_at
# ─────────────┼──────────────┼──────────┼──────────────────────
# MHNKIGP01    |         25.5 |     65.0 | 2026-10-26 14:30:22
# MHNKIGP01    |         25.4 |     64.9 | 2026-10-26 14:29:22
```

### Test 5: Frontend Display

```bash
# Open browser
http://35.200.159.76:3000

# Expected:
# ├─ Login page loads
# ├─ After login: Dashboard shows real-time data
# ├─ Temperature/Humidity charts updating
# └─ Latest reading timestamp changing every 60 seconds
```

---

## Troubleshooting

### Issue 1: Gateway Cannot Connect

**Symptom:**
```
mosquitto_sub: Connection timeout
```

**Causes & Solutions:**

```bash
# Cause 1: Firewall blocking
Solution: Check GCP firewall rules
gcloud compute firewall-rules list --project=exalted-skein-505210-g0

# Cause 2: MQTT broker not running
Solution: Check container status
docker ps | grep mqtt-broker
docker logs coldsense-mqtt-broker

# Cause 3: Wrong broker IP/port in gateway
Solution: Verify gateway config
# Gateway should connect to: 35.200.159.76:1883
# Check: echo $MQTT_BROKER (on gateway)

# Cause 4: Wrong username/password
Solution: Test with known-good credentials
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u backend_user \
  -P secure_password_backend \
  -t "test"
```

### Issue 2: Authentication Failed

**Symptom:**
```
Connection refused - not authorised (4)
```

**Causes & Solutions:**

```bash
# Cause 1: Username doesn't exist
Solution: List all users
docker exec coldsense-mqtt-broker \
  cat /etc/mosquitto/passwd

# Cause 2: Password incorrect
Solution: Reset password
docker exec coldsense-mqtt-broker \
  mosquitto_passwd -c /etc/mosquitto/passwd gw001_user
# Enter new password

# Cause 3: Broker config has allow_anonymous true
Solution: Update config
docker exec coldsense-mqtt-broker bash -c '
cat > /etc/mosquitto/mosquitto.conf << EOF
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
EOF
'
docker-compose restart coldsense-mqtt-broker
```

### Issue 3: No Data in Database

**Symptom:**
```
SELECT COUNT(*) FROM sensor_ingestion_raw;
count: 0
```

**Causes & Solutions:**

```bash
# Cause 1: Gateway not sending data
Solution: Monitor MQTT topic
mosquitto_sub -h 35.200.159.76 -p 1883 \
  -u backend_user \
  -P secure_password_backend \
  -t "cdsense/#" \
  -v

# Cause 2: Backend subscriber not running
Solution: Check logs
docker logs coldsense-mqtt
# Look for: "Connected to MQTT broker"
# If not connected: Check MQTT_BROKER env variable

# Cause 3: Backend cannot write to database
Solution: Check database connection
docker exec coldsense-postgres psql \
  -U coldsense_user \
  -d coldsense \
  -c "\dt"
# Should show: sensor_ingestion_raw table exists
```

### Issue 4: High Latency

**Symptom:**
```
Data takes 30+ seconds to appear on dashboard
```

**Causes & Solutions:**

```bash
# Cause 1: Polling interval too long (5 seconds)
Solution: Current frontend polls every 5 seconds
To reduce: Implement WebSocket instead
# This is planned for Phase 2

# Cause 2: Database queries slow
Solution: Check query performance
docker exec coldsense-postgres psql \
  -U coldsense_user \
  -d coldsense \
  -c "EXPLAIN ANALYZE SELECT * FROM cold_storage_conditions ORDER BY recorded_at DESC LIMIT 1;"

# Cause 3: Network latency (GCP region far)
Solution: Currently in asia-south1 (Mumbai)
Latency breakdown: 300-500ms typical
- Gateway to broker: 20ms
- MQTT processing: 50ms
- DB write: 20ms
- API response: 50ms
- Frontend render: 150ms
```

---

## Production Checklist

Before going live, verify all items:

### Security Checklist
- [ ] MQTT broker requires authentication (allow_anonymous = false)
- [ ] All gateway users have unique usernames
- [ ] All passwords are strong (12+ chars, mix of upper/lower/numbers)
- [ ] Firewall restricts to known gateway IPs only
- [ ] Old open firewall rule deleted
- [ ] Backend subscriber has separate credentials
- [ ] Passwords stored securely (not in git)
- [ ] No test/demo users in production

### Performance Checklist
- [ ] MQTT broker responds < 100ms to connection
- [ ] Backend subscriber connects successfully
- [ ] Data appears in database within 5 seconds
- [ ] Frontend updates within 10 seconds
- [ ] No "unhealthy" containers (docker ps)
- [ ] CPU usage < 50% (gcloud compute instances describe)
- [ ] Memory usage < 70% (docker stats)

### Configuration Checklist
- [ ] MQTT broker port: 1883 ✓
- [ ] Backend connects to: mqtt-broker (not external IP)
- [ ] Database credentials: Correct in docker-compose.yml
- [ ] Frontend API URL: Correct (http://backend:8000)
- [ ] All environment variables set correctly
- [ ] docker-compose.yml version field removed (optional warning)

### Testing Checklist
- [ ] Test 1: Basic connectivity passes ✓
- [ ] Test 2: Message publishing works ✓
- [ ] Test 3: Gateway data flowing ✓
- [ ] Test 4: Database records increasing ✓
- [ ] Test 5: Frontend displays real-time data ✓

### Documentation Checklist
- [ ] Gateway config documented (IP, username, password)
- [ ] Firewall rules documented (IP ranges)
- [ ] User credentials stored in secure location
- [ ] MQTT topic structure documented
- [ ] Troubleshooting guide available

### Monitoring Checklist
- [ ] Logs enabled on MQTT broker
- [ ] GCP Cloud Ops monitoring configured
- [ ] Alerts set up for failures
- [ ] Daily health check script created
- [ ] Backup procedure documented

---

## Next Steps (Phase 3: Advanced Security)

After Phase 1-2 are production-ready:

```
Week 3 (Advanced Security):
├─ Add TLS 1.2 encryption (port 8883)
├─ Implement ACL (Access Control Lists)
├─ Enable comprehensive audit logging
├─ Set up monitoring & alerts
└─ Perform security audit

Week 4 (Compliance):
├─ Privacy impact assessment
├─ Data retention policy
├─ Incident response plan
└─ Compliance sign-off
```

---

## References

- [Mosquitto Documentation](https://mosquitto.org/documentation/)
- [MQTT 3.1.1 Specification](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/)
- [paho-mqtt Python Library](https://github.com/eclipse/paho.mqtt.python)
- [GCP Firewall Rules](https://cloud.google.com/vpc/docs/firewalls)

---

**Document Created:** October 26, 2026  
**Status:** Production Ready for Phase 1 & 2  
**Next Review:** December 26, 2026  

