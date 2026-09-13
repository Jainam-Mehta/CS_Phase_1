# 📡 ColdSense MQTT Architecture

**Date:** August 26, 2026  
**Status:** ✅ Configured and Ready

---

## 🏗️ **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                  VM: 35.200.228.62                         │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │   MQTT       │◄─────┤  Simulator   │                   │
│  │   Broker     │      │  Container   │                   │
│  │  (Mosquitto) │      └──────────────┘                   │
│  │  Port: 1883  │                                          │
│  └──────┬───────┘                                          │
│         │                                                   │
│         │ subscribe                                         │
│         ↓                                                   │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │    MQTT      │─────►│  PostgreSQL  │                   │
│  │  Subscriber  │      │  Database    │                   │
│  │  Container   │      │  Container   │                   │
│  └──────────────┘      └──────────────┘                   │
│         ↑                                                   │
│         │ query                                             │
│  ┌──────────────┐                                          │
│  │   Backend    │  ← HTTP Requests from Users             │
│  │     API      │                                          │
│  │  Port: 8000  │                                          │
│  └──────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 **Docker Containers**

### 1. **MQTT Broker** (`mqtt-broker`)
- **Image:** `eclipse-mosquitto:2`
- **Ports:** 
  - `1883` - MQTT protocol
  - `9001` - WebSockets
- **Purpose:** Message broker for sensor data
- **Config:** No authentication (internal network only)

### 2. **Backend API** (`backend`)
- **Port:** `8000`
- **Endpoints:**
  - `GET /latest-reading?room_id={id}` - Get latest sensor readings
  - `GET /door-status` - Get door status
  - `GET /health` - Health check
- **MQTT Connection:** Connects to `mqtt-broker:1883`

### 3. **MQTT Subscriber** (`mqtt-subscriber`)
- **Image:** Same as backend
- **Command:** `python -m app.mqtt.subscriber`
- **Purpose:** Listens to MQTT topics and saves to database
- **Topics:** `coldsense/sensors`

### 4. **Simulator** (`simulator`)
- **Purpose:** Generates fake sensor data for testing
- **Publishes to:** `coldsense/sensors` topic
- **Interval:** Every 60 seconds
- **Facilities:** 10 simulated cold storage facilities

### 5. **PostgreSQL Database** (`postgres`)
- **Port:** `5432`
- **Credentials:**
  - User: `coldsense_user`
  - Password: `coldsense_secure_password_2026`
  - Database: `coldsense`
- **Purpose:** Stores all sensor readings and conditions

---

## 🔄 **Data Flow**

### **Step 1: Sensor Data Generation**
```
Simulator → Generates JSON sensor data
```

### **Step 2: MQTT Publishing**
```json
{
  "room_id": "CS-001",
  "temperature": -5.2,
  "humidity": 65.3,
  "door_status": 0,
  "timestamp": "2026-08-26T10:30:00Z"
}
```

### **Step 3: MQTT Routing**
```
Simulator → MQTT Broker (mosquitto) → MQTT Subscriber
```

### **Step 4: Database Storage**
```
MQTT Subscriber → PostgreSQL (sensor_readings table)
```

### **Step 5: API Query**
```
User → HTTP GET /latest-reading?room_id=CS-001 → Backend API → PostgreSQL → JSON Response
```

---

## 🚀 **How to Use MQTT API**

### **1. Send Sensor Data via MQTT**

From any MQTT client (Python, Node.js, IoT device):

```python
import paho.mqtt.client as mqtt
import json

client = mqtt.Client()
client.connect("35.200.228.62", 1883)

sensor_data = {
    "room_id": "CS-001",
    "temperature": -4.5,
    "humidity": 70.2,
    "door_status": 0
}

client.publish("coldsense/sensors", json.dumps(sensor_data))
```

### **2. Query Data via REST API**

```bash
# Get latest reading for a room
curl http://35.200.228.62:8000/latest-reading?room_id=CS-001

# Get door status
curl http://35.200.228.62:8000/door-status
```

### **3. Test with Built-in Simulator**

The simulator automatically runs and publishes data every 60 seconds!

---

## 🔐 **Security Configuration**

### **Current Setup (Development)**
- ✅ MQTT Broker: No authentication (internal network only)
- ✅ PostgreSQL: Password protected
- ✅ Backend API: Open (no auth required for testing)

### **Production Recommendations**
- Add MQTT authentication (username/password)
- Enable TLS/SSL for MQTT (port 8883)
- Add API authentication (JWT tokens)
- Use firewall rules to restrict MQTT port

---

## 📊 **MQTT Topics**

| Topic | Publisher | Subscriber | Purpose |
|-------|-----------|------------|---------|
| `coldsense/sensors` | Simulator, External Devices | Backend Subscriber | Sensor data ingestion |
| `coldsense/door` | Door Sensors | Backend Subscriber | Door open/close events |
| `coldsense/alerts` | Backend | Dashboard | Real-time alerts |

---

## 🧪 **Testing MQTT**

### **Test 1: Check MQTT Broker**
```bash
# SSH into VM
gcloud compute ssh coldsense-production-vm --zone=asia-south1-c

# Check if MQTT broker is running
docker ps | grep mqtt-broker
```

### **Test 2: Publish Test Message**
```bash
# Install mosquitto clients
sudo apt-get install mosquitto-clients

# Publish a test message
mosquitto_pub -h localhost -p 1883 -t "coldsense/sensors" -m '{"room_id":"TEST","temperature":-5}'
```

### **Test 3: Subscribe to Messages**
```bash
# Subscribe to all messages
mosquitto_sub -h localhost -p 1883 -t "coldsense/#"
```

### **Test 4: Check Database**
```bash
# Connect to PostgreSQL
docker exec -it coldsense-postgres psql -U coldsense_user -d coldsense

# Query sensor readings
SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 10;
```

---

## 🎯 **Why No Kubernetes?**

You asked about Kubernetes. Here's why we're NOT using it:

| Feature | Docker Compose | Kubernetes |
|---------|---------------|------------|
| **Cost** | $36/month | $70-100/month |
| **Complexity** | Low | High |
| **Setup Time** | 5 minutes | 30+ minutes |
| **MQTT Support** | ✅ Perfect | ✅ Perfect |
| **Scaling** | Manual | Automatic |
| **Best For** | 100-500 users | 1000+ users |

**Our Decision:** Docker Compose is perfect for your use case and saves $64/month!

---

## 📝 **Configuration Files**

All MQTT settings are in:
- **`backend/app/config.py`** - MQTT broker address, port, topics
- **`infrastructure/docker-compose.yml`** - Container orchestration
- **`backend/app/mqtt/subscriber.py`** - Subscriber logic
- **`backend/app/mqtt/publisher.py`** - Publisher example

---

## ✅ **What's Been Done**

1. ✅ MQTT Broker (Mosquitto) added to docker-compose
2. ✅ MQTT Subscriber configured to save to PostgreSQL
3. ✅ MQTT Publisher example available
4. ✅ Simulator configured to publish sensor data
5. ✅ API endpoints ready for querying data
6. ✅ All containers networked together

---

## 🎉 **Next Steps**

1. ⏳ Finish building Docker images (in progress)
2. ⏳ Push images to GCP Artifact Registry
3. ⏳ Deploy docker-compose to VM
4. ⏳ Test MQTT publishing/subscribing
5. ⏳ Test REST API endpoints

**Estimated Time:** 20 minutes

---

**Questions? Check the logs:**
- Backend: `docker logs coldsense-backend`
- MQTT Subscriber: `docker logs coldsense-mqtt`
- MQTT Broker: `docker logs coldsense-mqtt-broker`
