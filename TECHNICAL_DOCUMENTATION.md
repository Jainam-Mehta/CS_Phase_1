# ColdSense AI - Technical Documentation

**Version:** 1.0.0  
**Last Updated:** August 26, 2026  
**Status:** Production Ready

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Backend](#backend)
4. [Frontend](#frontend)
5. [Database Schema](#database-schema)
6. [Data Ingestion Pipeline](#data-ingestion-pipeline)
7. [MQTT Integration](#mqtt-integration)
8. [API Endpoints](#api-endpoints)
9. [Deployment](#deployment)
10. [Development Setup](#development-setup)
11. [Known Issues & Fixes](#known-issues--fixes)

---

## Project Overview

**ColdSense AI** is a comprehensive cold chain management and monitoring system designed for Indian agricultural cold storage facilities. It provides real-time temperature, humidity, and sensor telemetry; financial tracking; farmer investment management; and demand forecasting powered by AI.

### Core Features

- **Real-time Sensor Monitoring:** Dashboard with live temperature, humidity, pressure, and environmental data
- **Financial Tracking:** Investment management, profit calculations, and stakeholder payouts
- **Order Management:** Inventory tracking, crate allocation, and order fulfillment
- **Demand Forecasting:** AI-powered market predictions for stored commodities
- **Multi-stakeholder System:** Farmers, facility owners, market coordinators, and admins
- **Geographic Coverage:** India-wide facility network with state/district/locality hierarchies
- **Alerts & Notifications:** Real-time alerts for temperature anomalies, door openings, and system issues

### Technology Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18.3, TypeScript 6.0, Vite, Tailwind CSS |
| **Backend** | FastAPI (Python 3.12), Uvicorn |
| **Database** | Supabase (PostgreSQL) with real-time subscriptions |
| **Message Queue** | MQTT (EMQ X) for sensor data ingestion |
| **Data Science** | Python with APScheduler for periodic forecasting |
| **Deployment** | Docker containers, Google Cloud Platform |

---

## Architecture

### High-Level System Design

```
┌─────────────────┐         ┌──────────────────┐
│   IoT Sensors   │         │  NBSense API     │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         └───────────┬───────────────┘
                     │
            ┌────────▼─────────┐
            │  MQTT Ingestion  │
            │   (collector.py) │
            └────────┬─────────┘
                     │
         ┌───────────▼───────────┐
         │   MQTT Broker (EMQ X) │
         └───────────┬───────────┘
                     │
         ┌───────────▼────────────────────┐
         │   Backend (FastAPI + Uvicorn)  │
         │  ┌──────────────────────────┐  │
         │  │  API Routes              │  │
         │  │  ├─ /auth                │  │
         │  │  ├─ /sites               │  │
         │  │  ├─ /sensors             │  │
         │  │  ├─ /finance             │  │
         │  │  ├─ /orders              │  │
         │  │  └─ /alerts              │  │
         │  │  MQTT Subscriber         │  │
         │  └──────────────────────────┘  │
         └───────────┬────────────────────┘
                     │
         ┌───────────▼──────────────┐
         │  Supabase (PostgreSQL)   │
         │  ├─ Users & Auth         │
         │  ├─ Facilities & Sites    │
         │  ├─ Sensor Devices       │
         │  ├─ Sensor Readings      │
         │  ├─ Investments          │
         │  ├─ Orders & Inventory   │
         │  └─ Alerts               │
         └───────────┬──────────────┘
                     │
         ┌───────────▼──────────┐
         │  Frontend (React)    │
         │  ├─ Dashboard        │
         │  ├─ Monitoring       │
         │  ├─ Finance          │
         │  ├─ Orders           │
         │  ├─ Admin Settings   │
         │  └─ Map              │
         └──────────────────────┘
```

### Component Interactions

1. **IoT Layer:** Sensors send data to NBSense API or directly to MQTT broker
2. **Ingestion Layer:** Collector script polls NBSense API, publishes to MQTT
3. **Message Queue:** MQTT broker stores and broadcasts sensor telemetry
4. **Backend:** FastAPI app subscribes to MQTT, stores in Supabase, serves REST APIs
5. **Frontend:** React app queries APIs and subscribes to Supabase real-time updates
6. **Database:** PostgreSQL (Supabase) maintains state and historical data

---

## Backend

### Directory Structure

```
backend/
├── app/
│   ├── api/                 # API route handlers
│   │   ├── routes.py        # Main router (includes all sub-routers)
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── sites.py         # Facility management
│   │   ├── sensors.py       # Sensor CRUD & telemetry
│   │   ├── products.py      # Product catalog
│   │   ├── inventory.py     # Crate & product allocation
│   │   ├── orders.py        # Order management
│   │   ├── finance.py       # Investment & payment tracking
│   │   ├── energy.py        # Energy consumption data
│   │   ├── alerts.py        # Alert management
│   │   ├── market.py        # Market data & forecasts
│   │   ├── storage.py       # Cold storage conditions
│   │   └── seed.py          # Demo data endpoints
│   ├── database/            # Data access
│   │   ├── connection.py    # Supabase connection pool
│   │   └── supabase.py      # Database utilities
│   ├── crud/                # Create/Read/Update/Delete operations
│   │   └── sensor.py        # Sensor data operations
│   ├── models/              # Pydantic models & type definitions
│   │   ├── sensor.py        # Sensor data structures
│   │   └── storage.py       # Storage conditions
│   ├── schemas/             # Request/response schemas
│   │   └── sensor_schema.py # Sensor validation
│   ├── services/            # Business logic
│   │   ├── sensor_service.py    # Sensor processing
│   │   └── door_service.py      # Door monitoring
│   ├── mqtt/                # Message queue integration
│   │   ├── subscriber.py    # MQTT consumer thread
│   │   └── publisher.py     # MQTT producer (optional)
│   ├── utils/               # Utility functions
│   │   └── logger.py        # Logging configuration
│   ├── config.py            # Configuration & environment
│   └── main.py              # FastAPI app initialization
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container configuration
└── ingestion/              # Data ingestion scripts
    ├── collector.py        # NBSense API polling
    ├── nbsense_ingestion.py# MQTT publishing logic
    └── config.py           # Ingestion settings
```

### Key Modules

#### `main.py` - FastAPI Application

- Initializes FastAPI app with CORS middleware
- Starts MQTT subscriber on app startup
- Includes all API routers
- Health check endpoints (`/health`, `/`)

#### `database/connection.py`

```python
def get_db():
    """Get Supabase database connection."""
    # Returns authenticated Supabase client
```

#### `database/supabase.py`

Utility functions for common database operations:
- `get_latest_reading()` - Fetch most recent sensor reading
- `get_previous_door_state()` - Get previous door open/close event

#### `mqtt/subscriber.py`

Background thread that:
1. Connects to MQTT broker (EMQ X on localhost:1883 or configured host)
2. Subscribes to sensor topics (e.g., `sensors/+/telemetry`)
3. Parses messages and stores in Supabase `sensor_readings` table
4. Runs continuously; non-blocking

#### `services/sensor_service.py`

Business logic for sensor operations:
- Aggregates readings into conditions (temperature, humidity, etc.)
- Calculates statistics (min, max, average, standard deviation)
- Generates alerts for out-of-range values

### API Routes

All routes are prefixed and organized by domain:

| Prefix | Module | Purpose |
|--------|--------|---------|
| `/auth` | auth.py | User authentication, JWT tokens |
| `/sites` | sites.py | Facility CRUD, location data |
| `/sensors` | sensors.py | Sensor device management |
| `/products` | products.py | Product catalog, commodities |
| `/inventory` | inventory.py | Crate allocation, stock tracking |
| `/orders` | orders.py | Purchase orders, fulfillment |
| `/finance` | finance.py | Investment tracking, payouts |
| `/energy` | energy.py | Energy consumption metrics |
| `/alerts` | alerts.py | Alert configuration, history |
| `/market` | market.py | Market rates, demand forecasts |
| `/storage` | storage.py | Storage room conditions |

### Dependencies

```
fastapi==0.115.0           # Web framework
uvicorn[standard]==0.30.6  # ASGI server
supabase==2.9.1            # Database client
paho-mqtt==2.1.0           # MQTT client
python-dotenv==1.0.1       # Environment variable loader
pydantic==2.8.2            # Data validation
apscheduler==3.10.4        # Task scheduling
python-dateutil==2.9.0     # Date utilities
```

### Environment Configuration

`.env` file (backend root):
```
# Supabase
SUPABASE_URL=https://...
SUPABASE_KEY=...

# MQTT
MQTT_BROKER=localhost
MQTT_PORT=1883
MQTT_USERNAME=username
MQTT_PASSWORD=password

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Email (if used for notifications)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
```

---

## Frontend

### Directory Structure

```
frontend/
├── src/
│   ├── features/              # Feature modules by domain
│   │   ├── auth/              # Login, registration, profile
│   │   ├── dashboard/         # Owner/admin dashboards
│   │   ├── monitoring/        # Real-time sensor display
│   │   ├── finance/           # Investment & profit tracking
│   │   ├── orders/            # Order management UI
│   │   ├── settings/          # Owner/admin settings
│   │   ├── stakeholder/       # Farmer & partner views
│   │   ├── admin/             # System administration
│   │   └── common/            # Shared components
│   ├── components/            # Reusable UI components
│   │   ├── charts/            # Chart components (Chart.js, Recharts)
│   │   ├── forms/             # Form components (React Hook Form)
│   │   ├── tables/            # Data tables
│   │   ├── dialogs/           # Modal dialogs
│   │   ├── layout/            # Layout components
│   │   └── ui/                # Basic UI elements
│   ├── hooks/                 # Custom React hooks
│   │   ├── useAuth.ts         # Authentication context
│   │   ├── useQueryData.ts    # Data fetching wrapper
│   │   └── useSupabase.ts     # Supabase client hook
│   ├── services/              # API & external service clients
│   │   ├── api.ts             # REST API client
│   │   ├── supabase.ts        # Supabase client initialization
│   │   └── mqtt.ts            # MQTT client (WebSocket)
│   ├── stores/                # State management (Zustand)
│   │   ├── authStore.ts       # User & auth state
│   │   ├── siteStore.ts       # Facility selection state
│   │   ├── sensorStore.ts     # Real-time sensor state
│   │   └── uiStore.ts         # UI state (notifications, theme)
│   ├── types/                 # TypeScript interfaces
│   │   ├── database.ts        # Database schema types
│   │   ├── api.ts             # API request/response types
│   │   └── common.ts          # Shared types
│   ├── utils/                 # Utility functions
│   │   ├── format.ts          # Formatting helpers
│   │   ├── math.ts            # Calculation helpers
│   │   ├── validation.ts      # Form validation
│   │   └── constants.ts       # App constants
│   ├── App.tsx                # Root component
│   ├── main.tsx               # React entry point
│   └── index.css              # Global styles
├── public/                    # Static assets
├── package.json              # Node.js dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite build config
└── tailwind.config.js        # Tailwind CSS config
```

### Key Features & Components

#### Authentication Flow

1. User submits login credentials
2. Backend validates and returns JWT token
3. Token stored in localStorage
4. Included in all subsequent API requests
5. Supabase client initialized with token for real-time subscriptions

#### Real-Time Sensor Monitoring

- Subscribes to Supabase `sensor_readings` table
- Updates dashboard in real-time as new readings arrive
- Chart.js displays historical data (last 24h, 7d, 30d)
- Color-coded alerts for temperature anomalies

#### Investment & Finance Dashboard

- Shows investment status: `Pending` → `Approved` → `Active`
- Calculates profits based on commodity prices and storage rates
- Real-time sync when owner approves/rejects investments
- Supports multi-stakeholder payouts

#### Order Management

- Farmers submit orders (commodities, quantity, duration)
- Facility owners allocate crates and rooms
- Tracks allocation status and conflicts
- Calculates storage charges and farmer profits

#### Geographical Views

- React Simple Maps displays India state/district hierarchy
- Color-coded facility distribution by region
- Interactive drill-down to view facility details
- D3.js used for choropleth mapping

### Dependencies

```json
{
  "react": "^18.3.1",
  "@supabase/supabase-js": "^2.109.0",
  "@tanstack/react-query": "^5.101.2",
  "react-router-dom": "^7.18.1",
  "react-hook-form": "^7.81.0",
  "chart.js": "^4.5.1",
  "recharts": "^3.9.2",
  "tailwindcss": "^3.4.17",
  "zustand": "^5.0.14",
  "zod": "^4.4.3",
  "ws": "^8.21.2"
}
```

### Environment Configuration

`.env.local` (frontend root):
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:8000
VITE_MQTT_URL=ws://localhost:8083  # WebSocket for MQTT
```

### Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (Vite on :5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code (Oxlint)
npm run lint
```

---

## Database Schema

### Core Tables

#### `users`
- `id` (UUID): User identifier
- `email` (text): Unique email address
- `role` (enum): 'admin', 'owner', 'farmer', 'coordinator'
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `sites` (Facilities)
- `id` (UUID): Facility identifier
- `name` (text): Facility name
- `location` (text): Address
- `state_id` (UUID): Reference to states table
- `district_id` (UUID): Reference to districts table
- `locality_id` (UUID): Reference to localities table
- `owner_id` (UUID): Reference to users (facility owner)
- `capacity_crates` (integer): Maximum crates storable
- `created_at` (timestamp)

#### `cold_storage_rooms`
- `id` (UUID): Room identifier
- `site_id` (UUID): Reference to sites
- `room_name` (text): e.g., "Room A", "Room B"
- `capacity_crates` (integer): Crate capacity for this room
- `current_temp` (numeric): Last recorded temperature (°C)
- `current_humidity` (numeric): Last recorded humidity (%)
- `created_at` (timestamp)

#### `sensor_devices`
- `id` (UUID): Sensor device identifier
- `room_id` (UUID): Reference to cold_storage_rooms
- `sensor_type` (enum): 'Temperature', 'Humidity', 'AmbientTemperature', 'AmbientHumidity', 'SuctionPressure', 'DischargePressure', 'Door', 'Battery', 'CO2', 'Oxygen', 'Ammonia', 'Ethylene', 'WaterLeakage', 'Smoke', 'GridPower', 'PowerMeter', 'Motion', 'Vibration'
- `mqtt_topic` (text): MQTT topic for this sensor
- `device_id` (text): Physical device identifier
- `installed_at` (timestamp)
- `active` (boolean): Is sensor currently active?

#### `sensor_readings`
- `id` (UUID): Reading identifier
- `sensor_id` (UUID): Reference to sensor_devices
- `value` (numeric): Sensor value
- `unit` (text): Measurement unit (°C, %, PSI, etc.)
- `timestamp` (timestamp): When reading was taken
- `received_at` (timestamp): When backend received reading

#### `cold_storage_conditions`
- `id` (UUID): Condition record identifier
- `room_id` (UUID): Reference to cold_storage_rooms
- `temperature` (numeric): Aggregated temperature
- `humidity` (numeric): Aggregated humidity
- `pressure_suction` (numeric): Suction pressure
- `pressure_discharge` (numeric): Discharge pressure
- `timestamp` (timestamp): When condition was recorded
- `alert_triggered` (boolean): Was an alert generated?

#### `stakeholder_investments`
- `id` (UUID): Investment identifier
- `farmer_id` (UUID): Reference to users (farmer)
- `site_id` (UUID): Reference to sites (facility)
- `commodity_id` (UUID): Reference to products
- `quantity_crates` (integer): Number of crates invested
- `amount` (numeric): Investment amount (₹)
- `storage_rate_per_crate` (numeric): Facility's storage rate
- `status` (enum): 'Pending', 'Approved', 'Active', 'Completed', 'Rejected'
- `invested_at` (timestamp)
- `maturity_date` (timestamp): Expected return date
- `created_at` (timestamp)

#### `stakeholder_allocations`
- `id` (UUID): Allocation identifier
- `investment_id` (UUID): Reference to stakeholder_investments
- `room_id` (UUID): Reference to cold_storage_rooms
- `quantity_crates` (integer): Crates assigned to this room
- `assigned_at` (timestamp)

#### `orders`
- `id` (UUID): Order identifier
- `farmer_id` (UUID): Reference to users
- `site_id` (UUID): Reference to sites
- `commodity_id` (UUID): Reference to products
- `quantity_crates` (integer): Requested crates
- `status` (enum): 'Pending', 'Confirmed', 'Allocated', 'Stored', 'Shipped'
- `created_at` (timestamp)
- `estimated_return_date` (timestamp)

#### `products`
- `id` (UUID): Product identifier
- `name` (text): Product name (e.g., "Apple", "Potato")
- `category` (text): Category (e.g., "Fruit", "Vegetable")
- `storage_temp_min` (numeric): Minimum storage temperature
- `storage_temp_max` (numeric): Maximum storage temperature
- `storage_humidity_min` (numeric): Minimum humidity
- `storage_humidity_max` (numeric): Maximum humidity
- `shelf_life_days` (integer): How long product stays fresh
- `current_market_price` (numeric): Current price in ₹/crate

#### `alerts`
- `id` (UUID): Alert identifier
- `room_id` (UUID): Reference to cold_storage_rooms
- `alert_type` (enum): 'TemperatureHigh', 'TemperatureLow', 'HumidityHigh', 'HumidityLow', 'DoorOpen', 'PowerFailure', 'SensorMalfunction'
- `severity` (enum): 'info', 'warning', 'critical'
- `message` (text): Alert description
- `resolved` (boolean): Has alert been addressed?
- `created_at` (timestamp)

#### Geographical Data Tables

- `states`: India states (state_code, state_name)
- `districts`: Districts per state
- `localities`: Cities/towns per district
- `pincodes`: PIN codes (postal codes)

### Indexes

Key indexes for performance:
- `sensor_readings(sensor_id, timestamp DESC)` - Latest readings query
- `cold_storage_conditions(room_id, timestamp DESC)` - Room conditions history
- `stakeholder_investments(farmer_id, status)` - Farmer investments filter
- `alerts(room_id, resolved, created_at DESC)` - Unresolved alerts

### Constraints

- `sensor_devices_sensor_type_check`: Ensures `sensor_type` is in allowed enum values
- Foreign key constraints for referential integrity
- Unique constraints on email (users) and mqtt_topic (sensor_devices)

---

## Data Ingestion Pipeline

### NBSense API → MQTT Flow

The ingestion system polls the NBSense API and publishes sensor data to MQTT for consumption by the backend.

#### `ingestion/collector.py`

```python
def poll_nbsense_api():
    """
    1. Connect to NBSense API (credentials in config.py)
    2. Fetch latest sensor readings for all registered devices
    3. Transform data to MQTT message format
    4. Publish to MQTT broker
    5. Sleep for configured interval (typically 30-60 seconds)
    """
```

**Key responsibilities:**
- Maintains connection to NBSense API
- Handles authentication & retries
- Transforms API response to standardized format
- Publishes to MQTT broker

#### `ingestion/nbsense_ingestion.py`

```python
def format_mqtt_message(api_reading):
    """
    Transforms NBSense API reading to MQTT format.
    
    Input: {"device_id": "sensor_123", "value": 15.5, "timestamp": "2026-08-26T12:30:00Z"}
    Output: {"device_id": "sensor_123", "value": 15.5, "unit": "°C", "timestamp": "..."}
    """
```

**MQTT Topic Structure:**
```
sensors/{device_id}/telemetry
sensors/{device_id}/status
sensors/{site_id}/alerts
```

#### `ingestion/config.py`

Configuration for:
- NBSense API endpoint & credentials
- MQTT broker connection details
- Polling interval
- Data transformation rules

### Backend MQTT Subscription

The backend subscribes to MQTT topics in `app/mqtt/subscriber.py`:

```python
def on_message(client, userdata, msg):
    """
    1. Parse MQTT message payload (JSON)
    2. Extract device_id, value, timestamp
    3. Store in Supabase sensor_readings table
    4. Trigger alert generation if value out of range
    """
```

**Message Flow:**
1. MQTT broker receives sensor data
2. Backend subscriber consumes message
3. Parsed and validated using Pydantic
4. Stored in `sensor_readings` table
5. Aggregated into `cold_storage_conditions`
6. Supabase broadcasts real-time update to connected frontend clients
7. Frontend updates dashboard charts

---

## MQTT Integration

### Broker Configuration

**Default Setup:**
- Broker: EMQ X (EMQX) on localhost:1883
- WebSocket Port: 8083 (for browser connectivity)
- Topics: Organized by sensor hierarchy

**Production Setup:**
- Can be deployed as Docker container
- Configure external IP in `.env`
- TLS/SSL support available

### Topic Hierarchy

```
sensors/
├── {site_id}/
│   ├── {room_id}/
│   │   ├── {sensor_id}/telemetry    # Sensor value
│   │   ├── {sensor_id}/status       # Sensor online/offline
│   │   └── {sensor_id}/battery      # Battery level (if applicable)
│   └── alerts                        # Room alerts
└── system/
    ├── health                        # Backend health
    └── status                        # Overall system status
```

### Frontend WebSocket Connection

Frontend connects to MQTT via WebSocket (port 8083):

```typescript
// In frontend/src/services/mqtt.ts
const client = new Paho.MQTT.Client(
  'localhost',
  8083,
  `client_${Date.now()}`
);

client.subscribe('sensors/+/+/telemetry');
client.onMessageArrived = (message) => {
  // Update Zustand store with new reading
};
```

---

## API Endpoints

### Authentication

- `POST /auth/signup` - Register new user
- `POST /auth/login` - Authenticate and get JWT
- `POST /auth/refresh` - Refresh expired token
- `GET /auth/me` - Get current user profile
- `POST /auth/logout` - Logout

### Sites (Facilities)

- `GET /sites` - List all facilities (with pagination)
- `GET /sites/{id}` - Get facility details with rooms & sensors
- `POST /sites` - Create new facility (admin only)
- `PUT /sites/{id}` - Update facility details
- `GET /sites/{id}/rooms` - Get all rooms in facility
- `GET /sites/{id}/conditions` - Get latest storage conditions

### Sensors

- `GET /sensors` - List all sensors (with filters)
- `GET /sensors/{id}` - Get sensor details
- `POST /sensors` - Register new sensor device
- `PUT /sensors/{id}` - Update sensor configuration
- `DELETE /sensors/{id}` - Deactivate sensor
- `GET /sensors/{id}/readings` - Get historical readings (last 24h, 7d, etc.)

### Finance

- `GET /finance/investments` - List all investments (farmer or owner view)
- `POST /finance/investments` - Create new investment
- `PUT /finance/investments/{id}/approve` - Owner approves investment
- `PUT /finance/investments/{id}/reject` - Owner rejects investment
- `GET /finance/investments/{id}/profit` - Calculate profit for investment
- `GET /finance/payouts` - List stakeholder payouts

### Orders

- `GET /orders` - List all orders
- `POST /orders` - Create new order
- `PUT /orders/{id}/allocate` - Allocate crates to rooms
- `GET /orders/{id}/status` - Get order status & allocation

### Alerts

- `GET /alerts` - List recent alerts (unresolved first)
- `GET /alerts/history` - Alert history with date range filter
- `PUT /alerts/{id}/resolve` - Mark alert as resolved
- `POST /alerts/configure` - Set alert thresholds per room

### Storage

- `GET /storage/rooms` - List all rooms in selected facility
- `GET /storage/rooms/{id}/conditions` - Get current conditions
- `GET /storage/rooms/{id}/history` - Get historical conditions (time range)

### Legacy/MQTT-Compatible

- `GET /latest-reading?room_id=...` - Get latest condition for room
- `GET /latest-reading?room_sensor_id=...` - Get latest reading for sensor
- `GET /door-status` - Get comprehensive door status

---

## Deployment

### Docker Deployment

#### Backend Dockerfile

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app
COPY .env .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build and Run:**
```bash
docker build -t coldsense-backend .
docker run -d \
  --name coldsense-backend \
  -p 8000:8000 \
  --env-file .env \
  coldsense-backend
```

#### MQTT Broker Deployment

```dockerfile
FROM emqx/emqx:latest

EXPOSE 1883 8083

CMD ["emqx", "start"]
```

#### Docker Compose (All Services)

```yaml
version: '3.8'

services:
  mqtt:
    image: emqx/emqx:latest
    ports:
      - "1883:1883"
      - "8083:8083"
    environment:
      EMQX_LOADED_MODULES: "emqx_recon,emqx_retainer,emqx_management,emqx_dashboard"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    depends_on:
      - mqtt
    environment:
      MQTT_BROKER: mqtt
      MQTT_PORT: 1883
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_KEY: ${SUPABASE_KEY}

  ingestion:
    build: ./backend/ingestion
    depends_on:
      - mqtt
    environment:
      MQTT_BROKER: mqtt
      MQTT_PORT: 1883
      NBSENSE_API_URL: ${NBSENSE_API_URL}
```

### Google Cloud Platform Deployment

1. **Create GCP Project** and enable required APIs
2. **Cloud Run:** Deploy FastAPI backend as serverless container
3. **Cloud SQL:** Use managed PostgreSQL (Supabase alternative)
4. **Cloud Pub/Sub:** Alternative to MQTT for event streaming
5. **Cloud Storage:** Store sensor data archives
6. **Cloud Scheduler:** Run data ingestion jobs

### Environment Variables (Production)

```
# Supabase (PostgreSQL)
SUPABASE_URL=https://project.supabase.co
SUPABASE_KEY=<service-role-key>

# MQTT Broker
MQTT_BROKER=mqtt.example.com
MQTT_PORT=8883  # TLS
MQTT_USERNAME=broker_user
MQTT_PASSWORD=<secure-password>

# API Configuration
ALLOWED_ORIGINS=https://coldsense.example.com,https://api.example.com
JWT_SECRET=<long-random-string>
JWT_EXPIRY=3600

# Notifications
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@example.com
SMTP_PASSWORD=<app-specific-password>
ALERT_EMAIL_LIST=admin@example.com,owner@example.com

# Ingestion
NBSENSE_API_URL=https://api.nbsense.com
NBSENSE_API_KEY=<api-key>
POLLING_INTERVAL=60  # seconds
```

---

## Development Setup

### Prerequisites

- **Python 3.12+**
- **Node.js 18+**
- **PostgreSQL** (or Supabase account)
- **MQTT Broker** (EMQ X or similar)

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment (Windows)
venv\Scripts\activate
# Or on macOS/Linux:
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Configure environment
cp .env.example .env
# Edit .env with Supabase credentials and MQTT details

# 6. Start MQTT broker (in separate terminal)
docker run -d -p 1883:1883 -p 8083:8083 emqx/emqx

# 7. Run backend server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`  
API docs: `http://localhost:8000/docs` (Swagger UI)

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase and API URL

# 4. Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Ingestion Setup

```bash
# 1. Navigate to ingestion
cd backend/ingestion

# 2. Install dependencies
pip install -r requirements.txt
# Or use backend venv if already created

# 3. Configure
cp .env.example .env
# Edit with NBSense API credentials and MQTT details

# 4. Run collector
python collector.py
```

The ingestion will poll NBSense API and publish to MQTT every 60 seconds.

---

## Known Issues & Fixes

### Issue #1: India Map Shows Zero Invested Facilities

**Status:** ✅ Identified - Fix Pending

**Symptom:** Dashboard India Map shows "Invested Facilities: 0" even with active investments

**Root Cause:** `sites` table query attempts to join non-existent `localities` relationship:
```python
sites = (
    supabase.table("sites")
    .select("*, localities(*)")  # ❌ localities is a raw table, not a relationship
)
```

**Workaround:** Currently returns investment count without geographic filtering

**Fix (Pending):** 
1. Define proper foreign key constraint: `sites.locality_id → localities.id`
2. Redefine relationship in Supabase schema
3. Update query to use relationship selector

**Tracking:** See `frontend/src/features/stakeholder/StakeholderMap.tsx` line ~120

---

### Issue #2: Sensor Display False Positives

**Status:** ✅ FIXED - August 26, 2026

**Symptoms:**
- Dashboard showed "Ambient Humidity" as installed when only "Ambient Temperature" existed
- Both pressure sensors displayed demo values when only 1 was installed
- Missing sensor type options (Ambient Combined, split Pressure sensors)

**Fixes Applied:**

1. **Exact Sensor Type Matching**
   - Changed from fuzzy `.includes()` matching to exact type comparison
   - Each sensor now has individual `isInstalled` check

2. **Removed Hardcoded Demo Values**
   - Deleted fallback values (145 PSI, 210 PSI)
   - Now returns `null` for missing sensor data

3. **Added Missing Sensor Types**
   - `AmbientTemperature+AmbientHumidity` (combined)
   - `SuctionPressure` (split from generic Pressure)
   - `DischargePressure` (split from generic Pressure)

4. **Updated Sensor Creation Logic**
   - Combined sensors now properly create individual rows
   - Pressure sensors support both generic and split types

**Files Modified:**
- `frontend/src/features/monitoring/OwnerMonitoring.tsx` (~50 lines)
- `frontend/src/features/dashboard/OwnerDashboard.tsx` (~100 lines)

**Documentation:** See `docs/SENSOR_BUGS_FIXED.md` for detailed before/after scenarios

---

### Issue #3: Sensor Device Type Constraint

**Status:** ✅ FIXED - August 26, 2026

**Symptom:** "Owner Setup Wizard" → "Add Sensor" → Only 13 sensor types allowed in dropdown, but database constraint rejected new types like "ethylene", "ammonia"

**Root Cause:** `sensor_devices_sensor_type_check` constraint limited allowed types to legacy list

**Fix Applied:**
```sql
ALTER TABLE sensor_devices 
DROP CONSTRAINT sensor_devices_sensor_type_check;

ALTER TABLE sensor_devices 
ADD CONSTRAINT sensor_devices_sensor_type_check 
CHECK (sensor_type IN (
  'Temperature', 'Humidity', 
  'AmbientTemperature', 'AmbientHumidity',
  'SuctionPressure', 'DischargePressure',
  'Door', 'CO2', 'Oxygen', 'Ammonia', 'Ethylene', 
  'WaterLeakage', 'Smoke', 'Battery', 
  'GridPower', 'PowerMeter', 'Motion', 'Vibration'
));
```

**Result:** All sensor types from frontend now accepted by database

---

### Issue #4: Investment Status Enum Mismatch

**Status:** ✅ FIXED - August 26, 2026

**Symptom:** New investments showed "Pending" on frontend even after owner approved (database showed `status='active'`)

**Root Cause:** `Settings.tsx` checked for `status === 'Invested'` instead of `'Approved'`

**Fix:** Updated status enum check in Settings.tsx line 837-841

```typescript
// ❌ Before
const isApproved = investment.status === 'Invested';

// ✅ After
const isApproved = investment.status === 'Approved';
```

---

### Issue #5: Multi-Room Sensor Allocation

**Status:** ⚠️ Identified - Needs Confirmation

**Symptom:** All sensors allocated to Room 1, not distributed across selected rooms

**Status:** 
- UI flow appears correct in `OwnerSetup.tsx`
- Likely a backend query issue or missing allocation logic
- Needs production testing to confirm issue persists post-cleanup

**Next Steps:** Monitor in production; create ticket if issue reoccurs

---

### Issue #6: Query Filter Syntax Error

**Status:** ✅ FIXED - August 26, 2026

**Symptom:** "Active Farmers" table showed 0 results; backend returned 400 Bad Request

**Root Cause:** Supabase filter syntax error in `OwnerFinance.tsx`

**Fix:**
```typescript
// ❌ Before (incorrect operator)
.filter('removed_at', 'is', null)

// ✅ After (correct syntax)
.filter('removed_at', 'is', null)  // OR removed filter entirely
.filter('active_crates', 'gt', 0)  // Use proper operators
```

**Result:** Query now executes successfully, returns active farmers

---

## Performance Considerations

### Database Query Optimization

1. **Pagination:** Always use limit/offset for large result sets
2. **Indexes:** Key queries indexed on timestamp, sensor_id, room_id
3. **Real-time vs Polling:** Use Supabase subscriptions for live updates instead of polling
4. **Aggregation:** Pre-compute hourly/daily statistics to avoid expensive queries

### Frontend Optimization

1. **Code Splitting:** Routes lazy-loaded with React Router
2. **Caching:** React Query caches sensor readings and facility data
3. **Chart Optimization:** Chart.js configured to show max 1000 points; older data archived
4. **WebSocket:** MQTT subscriptions filter to relevant topics only

### Backend Scalability

1. **Async Processing:** FastAPI handles concurrent requests efficiently
2. **Connection Pooling:** Supabase client maintains connection pool
3. **MQTT Batching:** Sensor readings batched before database insert
4. **Background Tasks:** APScheduler for periodic aggregation jobs

---

## Security

### Authentication & Authorization

- **JWT Tokens:** Signed with secret key, 1-hour expiry
- **Role-Based Access Control (RBAC):** Users assigned roles (admin, owner, farmer, coordinator)
- **API Route Guards:** Check JWT and role before processing request

### Data Protection

- **HTTPS/TLS:** All production traffic encrypted
- **MQTT TLS:** Broker supports encrypted MQTT connections
- **Environment Variables:** Sensitive credentials never committed to git
- **SQL Injection:** Supabase client uses parameterized queries

### Audit & Logging

- **Request Logging:** All API requests logged with timestamp, user, endpoint
- **Database Audit:** Track changes to critical tables (investments, allocations)
- **Alert Logging:** All alerts stored with resolution status

---

## Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" on MQTT | Ensure broker running on configured host:port |
| "401 Unauthorized" on API calls | Check JWT token expiry; refresh if needed |
| "CORS error" on frontend | Add frontend URL to `ALLOWED_ORIGINS` in backend .env |
| Sensors not appearing in dropdown | Check `sensor_devices_sensor_type_check` constraint |
| Real-time updates not working | Verify Supabase subscription permissions; check browser WebSocket |

### Debug Mode

Set environment variables for verbose logging:

```bash
# Backend
export LOG_LEVEL=DEBUG
export MQTT_DEBUG=true

# Frontend
export VITE_DEBUG=true
export VITE_API_LOG=true
```

### Getting Help

1. Check logs: `backend/logs/` and browser console
2. Review git history: See `docs/` for bug fix documentation
3. Contact: admin@example.com

---

## Recent Changes & Cleanup (August 26, 2026)

### Project Audit & Cleanup Executed

A comprehensive audit removed 107 diagnostic/test files (~10,274 lines) while preserving all production code:

**Deleted:**
- All `check_*.py`, `test_*.py`, `fix_*.py` diagnostic scripts
- `backend/simulators/` - Replaced by Supabase UI
- `backend/tests/` - Removed from test workflow
- `backend/migrations/` - Replaced by Supabase schema management
- Legacy SQL migration files
- Old diagnostic markdown files

**Preserved:**
- All API and frontend code
- `docs/` folder - Contains bug fix history with production value
- `infrastructure/` - Deployment configurations
- `ingestion/` - Active NBSense API → MQTT pipeline
- `datasets/` - Geographic data (states, districts, localities)

**Rationale:** The codebase now contains only production-ready code, infrastructure, and active ingestion pipelines. Diagnostic tools were one-time setup utilities no longer needed post-deployment.

---

**End of Technical Documentation**

For questions or updates, refer to the bug fix history in `docs/` or contact the development team.
