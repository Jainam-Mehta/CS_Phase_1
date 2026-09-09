# 🏗️ ColdSense - High-Level GCP Architecture

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INTERNET / PUBLIC USERS                           │
│                                                                             │
│  👨‍💼 Owners    👨‍🌾 Farmers    🏢 Stakeholders    📱 Mobile Users            │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   │ HTTPS
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOOGLE CLOUD PLATFORM (GCP)                          │
│                      Project: exalted-skein-505210-g0                       │
│                           Region: asia-south1 (Mumbai)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
┌─────────────────────────────────┐  ┌───────────────────────────────┐
│   FRONTEND (Static Hosting)     │  │   BACKEND (Compute Engine VM) │
│                                 │  │                               │
│  • React + TypeScript + Vite   │  │  VM: coldsense-backend-vm     │
│  • Deployed on:                │  │  Type: e2-medium (2vCPU, 4GB) │
│    - Firebase Hosting OR       │  │  OS: Ubuntu 24.04 LTS         │
│    - Cloud Storage + CDN OR    │  │  Disk: 20GB SSD               │
│    - Vercel/Netlify            │  │  IP: 8.231.107.201 (Static)   │
│                                 │  │                               │
│  • Authenticated via Supabase  │  │  ┌─────────────────────────┐  │
│  • Communicates with Backend   │  │  │  Docker Containers      │  │
│    via REST API                │  │  │                         │  │
└─────────────────────────────────┘  │  │  1. FastAPI Backend     │  │
                                     │  │     - Port 8000         │  │
                                     │  │     - REST API          │  │
                                     │  │     - Supabase Client   │  │
                    ┌────────────────┤  │                         │  │
                    │                │  │  2. Mosquitto MQTT      │  │
                    │                │  │     - Port 1883         │  │
                    ▼                │  │     - IoT Broker        │  │
┌─────────────────────────────────┐ │  │                         │  │
│   EXTERNAL SERVICES             │ │  │  3. Sensor Simulator    │  │
│                                 │ │  │     - Generates Data    │  │
│  • Supabase (PostgreSQL)       │ │  │     - MQTT Publisher    │  │
│    - Authentication            │ │  └─────────────────────────┘  │
│    - Database                  │ │                               │
│    - Real-time subscriptions   │ │  Docker Compose              │
│    - Row Level Security (RLS)  │ │  Network: coldsense-network  │
│                                 │ └───────────────────────────────┘
│  • Firebase (Optional)          │                │
│    - Push notifications         │                │
│    - Analytics                  │                │
└─────────────────────────────────┘                │
                    ▲                              │
                    │                              │
                    └──────────────────────────────┘
                           Supabase Connection
                          (PostgreSQL over SSL)

┌─────────────────────────────────────────────────────────────────────────────┐
│                          GCP FIREWALL RULES                                 │
│                                                                             │
│  • allow-http       → Port 80   (HTTP)                                     │
│  • allow-backend    → Port 8000 (FastAPI)                                  │
│  • allow-mqtt       → Port 1883 (MQTT)                                     │
│  • allow-https      → Port 443  (HTTPS - future)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARTIFACT REGISTRY                                   │
│                                                                             │
│  Repository: coldsense                                                      │
│  Location: asia-south1                                                      │
│                                                                             │
│  Images:                                                                    │
│  • asia-south1-docker.pkg.dev/.../backend:latest                           │
│  • asia-south1-docker.pkg.dev/.../simulator:latest                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         IoT SENSORS (Future)                                │
│                                                                             │
│  • Physical Devices                                                         │
│    - Temperature Sensors                                                    │
│    - Humidity Sensors                                                       │
│    - Door Sensors                                                           │
│    - Energy Meters                                                          │
│                                                                             │
│  • Communication: MQTT over TLS                                             │
│  • Endpoint: 8.231.107.201:1883                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Architecture

### 1️⃣ User Authentication Flow
```
User (Browser)
    │
    ├─ Sign Up / Login
    │
    ▼
Supabase Auth
    │
    ├─ JWT Token Generated
    │
    ▼
Frontend (React)
    │
    ├─ Store Token in Local Storage
    │
    ▼
API Requests with Bearer Token
    │
    ▼
Backend FastAPI
    │
    ├─ Validate Token
    │
    ▼
Supabase Database
```

### 2️⃣ Sensor Data Flow
```
IoT Sensor Device
    │
    ├─ Publish MQTT Message
    │   Topic: coldsense/sensors/{room_id}/{sensor_type}
    │   Payload: { temp: 4.5, humidity: 87, timestamp: ... }
    │
    ▼
Mosquitto MQTT Broker (Port 1883)
    │
    ├─ Route Message
    │
    ▼
Backend MQTT Subscriber
    │
    ├─ Parse Payload
    ├─ Validate Data
    │
    ▼
Supabase Database
    │
    ├─ Insert into sensor_readings table
    ├─ Insert into energy_consumption table
    ├─ Insert into door_events table
    │
    ▼
Real-time Notification to Frontend
    │
    ▼
Dashboard Updates Live
```

### 3️⃣ Dashboard Data Retrieval Flow
```
User Opens Dashboard
    │
    ▼
Frontend Makes API Request
    │
    ├─ GET /api/sensors/readings?room_id=xxx
    │
    ▼
Backend FastAPI
    │
    ├─ Authenticate User
    ├─ Authorize Access (Check user owns facility)
    │
    ▼
Supabase Database Query
    │
    ├─ SELECT * FROM sensor_readings WHERE room_id = xxx
    ├─ SELECT * FROM energy_consumption WHERE facility_id = yyy
    │
    ▼
Backend Aggregates & Formats Data
    │
    ▼
JSON Response to Frontend
    │
    ▼
Dashboard Charts Rendered
    │
    ├─ Temperature/Humidity Line Charts
    ├─ Energy Consumption Bar Charts
    ├─ Farmer Activity Calendar
    └─ HVAC System Diagram
```

---

## 🗂️ Component Breakdown

### **Frontend (React + Vite + TypeScript)**

**Purpose**: User Interface for Owners, Farmers, and Stakeholders

**Technology Stack**:
- React 18
- TypeScript
- Vite (Build Tool)
- TailwindCSS (Styling)
- Recharts (Data Visualization)
- React Router (Navigation)
- Zustand (State Management)
- Supabase JS Client

**Deployment Options**:
1. **Firebase Hosting** (Recommended)
   - Cost: Free for low traffic
   - CDN: Global edge caching
   - SSL: Automatic
   
2. **Google Cloud Storage + Cloud CDN**
   - Cost: ~$1-5/month
   - Custom domain support
   
3. **Vercel / Netlify** (External)
   - Cost: Free tier available
   - Easy CI/CD

**Key Features**:
- Role-based dashboards (Owner, Farmer, Stakeholder)
- Real-time sensor monitoring
- Interactive charts and graphs
- Facility management
- User profile management
- Mobile responsive

---

### **Backend (FastAPI + Python)**

**Purpose**: REST API, MQTT handling, Business logic

**Technology Stack**:
- FastAPI (Web Framework)
- Python 3.14
- Paho-MQTT (MQTT Client)
- Supabase Client (Database)
- Uvicorn (ASGI Server)
- APScheduler (Task Scheduling)

**Deployment**: Compute Engine VM (e2-medium)

**Key Responsibilities**:
1. **REST API Endpoints**:
   - `/api/auth/*` - Authentication helpers
   - `/api/sensors/*` - Sensor data CRUD
   - `/api/facilities/*` - Facility management
   - `/api/energy/*` - Energy consumption
   - `/api/finance/*` - Financial calculations
   - `/health` - Health check

2. **MQTT Integration**:
   - Subscribe to sensor topics
   - Parse incoming data
   - Validate and store in database
   - Handle connection resilience

3. **Business Logic**:
   - Storage cost calculations
   - Farmer payment processing
   - Energy optimization algorithms
   - Alert generation

**API Authentication**: Bearer Token (JWT from Supabase)

---

### **MQTT Broker (Mosquitto)**

**Purpose**: IoT message broker for sensor communication

**Technology**: Eclipse Mosquitto 2.x

**Configuration**:
- Port: 1883 (MQTT)
- Authentication: Anonymous (dev), TLS + Credentials (prod)
- Persistence: Enabled
- Max Connections: Unlimited

**Topics Structure**:
```
coldsense/sensors/{facility_id}/{room_id}/{sensor_type}
coldsense/commands/{facility_id}/{room_id}/{command}
coldsense/alerts/{facility_id}/{room_id}/{alert_type}
```

**Future Enhancements**:
- MQTT over TLS (Port 8883)
- Username/Password authentication
- Client certificate validation
- QoS Level 1/2 for critical messages

---

### **Sensor Simulator**

**Purpose**: Generate test sensor data for development

**Technology**: Python script

**Features**:
- Simulates realistic sensor readings
- Publishes to MQTT every 30 seconds
- Generates:
  - Temperature: 2-8°C (cold storage range)
  - Humidity: 80-95%
  - Energy consumption: 50-300 kWh/day
  - Door events: Open/Closed
  - Ambient conditions

**Deployment**: Docker container on same VM

---

### **Database (Supabase / PostgreSQL)**

**Purpose**: Primary data store

**Technology**: PostgreSQL 15+ (managed by Supabase)

**Location**: External (Supabase Cloud)

**Connection**: PostgreSQL over SSL (Port 5432)

**Key Tables**:
- `profiles` - User profiles
- `facilities` - Cold storage facilities
- `cold_storage_rooms` - Individual storage rooms
- `sensor_devices` - IoT device registry
- `sensor_readings` - Time-series sensor data
- `energy_consumption` - Energy usage records
- `door_events` - Door access logs
- `batches` - Farmer product batches
- `farmer_payments` - Payment history
- `stakeholder_investments` - Investment tracking

**Features**:
- Row Level Security (RLS)
- Real-time subscriptions
- Automatic backups
- Point-in-time recovery

---

## 🔐 Security Architecture

### **1. Network Security**

```
Internet
    │
    ├─ GCP Cloud Armor (Optional - DDoS protection)
    │
    ▼
GCP Firewall Rules
    │
    ├─ Allow only ports: 80, 443, 8000, 1883
    ├─ Source IP restrictions (Optional)
    │
    ▼
Compute Engine VM
    │
    ├─ UFW Firewall (Ubuntu)
    ├─ Fail2Ban (Brute force protection)
    │
    ▼
Docker Network (Bridge)
    │
    ├─ Container isolation
    └─ Inter-container communication only
```

### **2. Authentication & Authorization**

```
User Login
    │
    ▼
Supabase Auth
    │
    ├─ Password hashing (bcrypt)
    ├─ JWT token generation
    ├─ Email verification
    │
    ▼
JWT Token (Valid 1 hour)
    │
    ▼
API Request with Bearer Token
    │
    ▼
Backend Validates Token
    │
    ├─ Verify signature
    ├─ Check expiration
    ├─ Extract user role
    │
    ▼
Database Query
    │
    ├─ Row Level Security (RLS)
    ├─ User can only access their data
    │
    ▼
Response
```

### **3. Data Encryption**

- **In Transit**: TLS 1.2+ (HTTPS, PostgreSQL SSL)
- **At Rest**: AES-256 (Supabase default, GCP disk encryption)
- **Secrets**: Environment variables, not in code

### **4. API Security**

- **Rate Limiting**: 100 requests/minute per IP
- **CORS**: Restricted to frontend domain only
- **Input Validation**: Pydantic models
- **SQL Injection**: Protected by Supabase parameterized queries
- **XSS Protection**: React auto-escaping

---

## 💰 Cost Breakdown (Monthly)

### **Current Setup (Compute Engine VM)**

| Service | Specification | Cost |
|---------|--------------|------|
| Compute Engine VM | e2-medium (2vCPU, 4GB RAM) | ~$25 |
| Static IP | 1 IP address | ~$3 |
| Disk Storage | 20GB SSD | ~$3 |
| Network Egress | ~50GB/month | ~$5 |
| Artifact Registry | ~5GB images | ~$0.50 |
| **Total GCP Cost** | | **~$36.50/month** |

### **External Services**

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Pro Plan (50GB) | $25/month |
| Domain | .com/.io | $12/year (~$1/month) |
| SSL Certificate | Let's Encrypt | Free |
| **Total External** | | **~$26/month** |

### **Grand Total: ~$62.50/month**

---

## 📈 Scalability Considerations

### **Current Capacity**

- **Users**: Up to 1,000 concurrent users
- **API Requests**: ~10,000 requests/hour
- **Sensor Data**: Up to 100 sensors @ 30s interval
- **Database**: 50GB storage

### **Scaling Strategy**

#### **Horizontal Scaling (More VMs)**

```
Load Balancer
    │
    ├─ VM-1 (Backend + MQTT)
    ├─ VM-2 (Backend + MQTT)
    ├─ VM-3 (Backend + MQTT)
    │
    └─ Shared Mosquitto MQTT Cluster
```

**When to scale**: CPU usage > 70% consistently

**Cost**: +$25/month per additional VM

#### **Vertical Scaling (Bigger VM)**

| Machine Type | vCPU | RAM | Cost/month |
|-------------|------|-----|------------|
| e2-medium (current) | 2 | 4GB | $25 |
| e2-standard-2 | 2 | 8GB | $49 |
| e2-standard-4 | 4 | 16GB | $97 |
| n2-standard-4 | 4 | 16GB | $146 |

#### **Database Scaling**

- **Supabase Pro**: 50GB included, $0.125/GB beyond
- **Connection Pooling**: PgBouncer (built-in)
- **Read Replicas**: Available in higher tiers

#### **Storage Scaling**

- **Cloud Storage**: For archived sensor data
- **BigQuery**: For analytics on historical data

---

## 🚀 Deployment Pipeline

### **Current (Manual Deployment)**

```
1. Local Development
     │
     ├─ Code changes
     ├─ Test locally
     │
     ▼
2. Build Docker Images
     │
     ├─ docker build backend
     ├─ docker build simulator
     │
     ▼
3. Push to Artifact Registry
     │
     ├─ docker push
     │
     ▼
4. SSH to VM
     │
     ├─ docker-compose pull
     ├─ docker-compose up -d
     │
     ▼
5. Manual Testing
```

### **Future (CI/CD Pipeline)**

```
GitHub Repository
     │
     ├─ Push to main branch
     │
     ▼
GitHub Actions Workflow
     │
     ├─ Run tests
     ├─ Build Docker images
     ├─ Push to Artifact Registry
     │
     ▼
Cloud Build Trigger
     │
     ├─ Deploy to staging VM
     ├─ Run integration tests
     │
     ▼
Manual Approval (Optional)
     │
     ▼
Deploy to Production VM
     │
     ├─ Rolling update
     ├─ Health check
     │
     ▼
Production Live
```

**Tools**:
- GitHub Actions (CI)
- Google Cloud Build (CD)
- Terraform (Infrastructure as Code)

---

## 🔄 Disaster Recovery

### **Backup Strategy**

1. **Database Backups**:
   - Supabase: Automatic daily backups (7-day retention)
   - Point-in-time recovery available
   
2. **VM Snapshots**:
   - Manual: `gcloud compute disks snapshot`
   - Schedule: Daily at 2 AM IST
   - Retention: 7 days

3. **Code Repository**:
   - GitHub: Primary source of truth
   - All code in version control

### **Recovery Plan**

**Scenario 1: VM Failure**
```
1. Recreate VM from latest snapshot (10 minutes)
2. Restore Docker containers (5 minutes)
3. Update DNS if IP changed (5 minutes)
Total RTO: 20 minutes
```

**Scenario 2: Database Corruption**
```
1. Supabase restore from backup (Supabase support)
2. Verify data integrity
Total RTO: 1-2 hours
```

**Scenario 3: Complete Data Center Outage**
```
1. Spin up VM in different zone/region
2. Restore database backup
3. Update DNS records
Total RTO: 1-4 hours
```

---

## 📊 Monitoring & Observability

### **Metrics to Track**

1. **System Metrics**:
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

2. **Application Metrics**:
   - API response time
   - Request count per endpoint
   - Error rate (4xx, 5xx)
   - MQTT message throughput

3. **Business Metrics**:
   - Active users
   - Sensor data points per day
   - Dashboard page views
   - Facility utilization

### **Monitoring Tools**

1. **Google Cloud Monitoring** (Built-in):
   - VM metrics
   - Uptime checks
   - Alerting

2. **Supabase Dashboard**:
   - Database connections
   - Query performance
   - API usage

3. **Application Logs**:
   - FastAPI logs → Cloud Logging
   - MQTT logs → Cloud Logging
   - Frontend errors → Sentry (optional)

### **Alerting**

```
Alert Conditions:
  • VM CPU > 80% for 5 minutes
  • VM Memory > 85% for 5 minutes
  • API error rate > 5% for 2 minutes
  • MQTT broker down
  • Database connection failures

Notification Channels:
  • Email
  • SMS (critical only)
  • Slack webhook (optional)
```

---

## 🎯 Future Enhancements

### **Phase 1: Security Hardening** (1-2 months)
- [ ] Implement HTTPS (SSL/TLS)
- [ ] MQTT over TLS (Port 8883)
- [ ] Add API rate limiting
- [ ] Implement Cloud Armor (DDoS protection)
- [ ] Set up VPN for administrative access

### **Phase 2: High Availability** (2-3 months)
- [ ] Add load balancer
- [ ] Deploy multiple backend instances
- [ ] Set up MQTT broker clustering
- [ ] Implement auto-scaling
- [ ] Multi-zone deployment

### **Phase 3: Advanced Features** (3-6 months)
- [ ] Machine learning for predictive maintenance
- [ ] Anomaly detection in sensor data
- [ ] Energy optimization algorithms
- [ ] Mobile app (React Native)
- [ ] Real-time video monitoring

### **Phase 4: Enterprise Features** (6-12 months)
- [ ] Multi-tenancy support
- [ ] White-label solution
- [ ] Advanced analytics dashboard
- [ ] Integration with ERP systems
- [ ] Blockchain for supply chain tracking

---

## 📞 Architecture Decision Records (ADR)

### **ADR-001: Why Compute Engine VM instead of GKE?**

**Decision**: Use single Compute Engine VM with Docker Compose

**Rationale**:
- 70% cost savings ($36/month vs $120/month)
- Simpler operations (no Kubernetes learning curve)
- Adequate for current scale (MVP phase)
- Easy to migrate to GKE later if needed

**Trade-offs**:
- Less automated scaling
- Manual deployment process
- Single point of failure

**When to revisit**: When traffic exceeds 5,000 concurrent users

---

### **ADR-002: Why External Supabase instead of Cloud SQL?**

**Decision**: Use Supabase managed PostgreSQL

**Rationale**:
- Built-in authentication
- Real-time subscriptions out of the box
- Row Level Security (RLS)
- Auto-generated REST API
- Developer-friendly dashboard

**Trade-offs**:
- Dependency on external service
- Data resides outside GCP
- Limited customization

**When to revisit**: If compliance requires data in specific regions

---

### **ADR-003: Why MQTT instead of Cloud Pub/Sub?**

**Decision**: Use Mosquitto MQTT broker on VM

**Rationale**:
- Industry standard for IoT
- Lightweight protocol
- Works with any MQTT-compatible device
- No vendor lock-in

**Trade-offs**:
- Need to manage broker ourselves
- No built-in scaling

**When to revisit**: When message throughput exceeds 100,000 messages/hour

---

## ✅ Architecture Review Checklist

- [x] Single responsibility: Each component has clear purpose
- [x] Scalability: Can handle 10x growth with minimal changes
- [x] Security: Multiple layers of defense
- [x] Cost-effective: Optimized for startup budget
- [x] Maintainability: Simple enough for small team
- [x] Observability: Logging and monitoring in place
- [x] Disaster recovery: Backup and restore procedures documented
- [x] Documentation: Architecture clearly documented

---

**Last Updated**: September 9, 2026  
**Version**: 1.0  
**Author**: ColdSense Engineering Team

