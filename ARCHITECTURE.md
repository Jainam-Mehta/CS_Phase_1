# ColdSense AI - Complete Technical Stack & Architecture

## Executive Summary

ColdSense AI is a full-stack cold storage management platform that enables owners to monitor, manage, and monetize cold storage facilities while helping farmers optimize produce storage and distribution. The system integrates real-time IoT sensor monitoring, business logic, and multi-role access control.

---

## 1. TECHNOLOGY STACK OVERVIEW

### 1.1 Frontend Stack

**Framework & Build Tools:**
- **React 18.3.1** - UI library for building interactive user interfaces
  - Component-based architecture with hooks
  - Virtual DOM for efficient rendering
  - Used for: All user-facing pages (login, dashboard, inventory, orders, etc.)

- **TypeScript ~6.0.2** - Type-safe JavaScript superset
  - Catches errors at compile-time
  - Provides IDE autocomplete and refactoring support
  - Enforces type contracts across the application

- **Vite 8.1.1** - Next-generation build tool
  - Lightning-fast development server with HMR (Hot Module Replacement)
  - Fast production builds with code splitting
  - Replaces Webpack, 10-100x faster than traditional bundlers

- **React Router v7.18.1** - Client-side routing
  - Manages navigation between pages (/dashboard, /inventory, /settings, etc.)
  - Lazy loading of components for performance
  - Query parameters for stateful navigation

**State Management:**
- **Zustand 5.0.14** - Lightweight state management library
  - Manages global application state (auth user, selected facility, notifications)
  - Replaces Redux with simpler API and smaller bundle size
  - Key stores: `useAuthStore`, `useSiteStore`, `useFarmerStore`

**Data Fetching & Caching:**
- **@tanstack/react-query 5.101.2** - Server state management
  - Handles API calls with automatic caching
  - Background synchronization and stale-while-revalidate pattern
  - Reduces network requests and improves perceived performance

**UI & Styling:**
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
  - Generates CSS from HTML class names
  - Ensures consistent spacing, colors, typography across app
  - Reduces CSS bundle size and eliminates unused styles
  - Used for all layouts: flexbox, grids, responsive design

- **Lucide React 1.24.0** - Icon library
  - 1500+ clean SVG icons for UI elements
  - Used for: buttons, status indicators, navigation icons
  - Lightweight and tree-shakeable

- **Framer Motion 12.42.2** - Animation library
  - Smooth transitions and animations
  - Used for: modal open/close, page transitions, hover effects
  - GPU-accelerated for performance

**Data Visualization:**
- **Recharts 3.9.2** - React charting library
  - Line charts (revenue trends, energy consumption)
  - Bar charts (financial comparison, monthly trends)
  - Pie charts (expense breakdown)
  - Lightweight SVG-based charts

- **Chart.js 4.5.1** - Alternative charting library
- **react-chartjs-2 5.3.1** - React wrapper for Chart.js

**Geospatial Visualization:**
- **D3 (D3-geo, D3-scale, D3-scale-chromatic)** - Data visualization
  - Geospatial projections for mapping
  - Color scales for data representation
  
- **react-simple-maps 3.0.0** - Simple SVG map wrapper
  - Used for: Facility location mapping, geographic visualization

**Form Handling:**
- **React Hook Form 7.81.0** - Performant form management
  - Minimal re-renders during form input
  - Easy validation and error handling
  - Used for: login forms, inventory forms, facility setup

- **@hookform/resolvers 5.4.0** - Validation resolver integration
- **Zod 4.4.3** - TypeScript-first schema validation
  - Runtime type checking for form data
  - Ensures data matches expected schema

**API Communication:**
- **@supabase/supabase-js 2.109.0** - Supabase client
  - Real-time database subscriptions
  - Authentication (login, signup, session management)
  - File storage operations
  - Replaces traditional REST API calls for database operations

**Real-time Communication:**
- **WebSocket (ws 8.21.2)** - WebSocket client library
  - Real-time sensor data updates from IoT devices
  - Live notifications
  - Used for MQTT-like messaging from backend

**PDF Generation:**
- **jspdf 2.5.2** - Client-side PDF generation
  - Generate financial reports, batch documentation as PDF
  - User downloads reports without server involvement

**Utilities:**
- **clsx & tailwind-merge** - CSS class merging utilities
- **prop-types 15.8.1** - Runtime type checking (legacy)
- **dotenv 17.4.2** - Environment variable loading

---

### 1.2 Backend Stack

**Web Framework:**
- **FastAPI 0.115.0** - Modern Python web framework
  - Built on Starlette (ASGI framework)
  - Automatic API documentation (Swagger UI, ReDoc)
  - Type hints for request/response validation with Pydantic
  - Async/await support for high performance
  - Used for: All REST API endpoints

- **Uvicorn[standard] 0.30.6** - ASGI server
  - Runs FastAPI application
  - Handles async HTTP requests
  - Production-grade performance

**Database ORM & Access:**
- **Supabase 2.9.1** - Python client for Supabase
  - Connects to PostgreSQL database
  - Query builder for database operations
  - Authentication token management
  - Automatically installs: httpx, postgrest, realtime, storage3, supafunc

**Data Validation:**
- **Pydantic 2.8.2** - Data validation using Python type hints
  - Validates request payloads before processing
  - Generates error messages for invalid data
  - Used for: Request schemas, response models

- **pydantic-settings 2.4.0** - Environment variable management
  - Type-safe configuration from .env files
  - Validation of config values

- **email-validator 2.2.0** - Email validation
  - Ensures valid email addresses during signup

**Message Queue & Sensors:**
- **paho-mqtt 2.1.0** - MQTT client library
  - Connects to MQTT broker (localhost:1883)
  - Subscribes to sensor data topics (coldsense/sensors/...)
  - Publishes control commands to devices
  - Used for: Real-time sensor telemetry, door open/close events

**Task Scheduling:**
- **APScheduler 3.10.4** - Advanced Python scheduler
  - Schedule background jobs (data cleanup, report generation)
  - Cron-like scheduling support
  - Used by simulators: sensor_generator, door_generator, weather_generator

**Utilities:**
- **python-dotenv 1.0.1** - Load environment variables from .env
  - Configuration management
  
- **python-dateutil 2.9.0** - Date/time utilities
  - Timezone handling
  - Date arithmetic for expiry date calculations

---

### 1.3 Database (Supabase / PostgreSQL)

**Core Tables:**

1. **auth.users** (Managed by Supabase)
   - Stores authentication credentials
   - Firebase Auth compatible
   - Fields: id (UUID), email, encrypted_password, email_confirmed_at

2. **profiles** - User profile information
   - Fields: id (SERIAL), auth_user_id (UUID FK), first_name, last_name, role (owner/farmer/stakeholder), company_name
   - Foreign key to auth.users
   - Used for: Role-based access control, user identification

3. **facilities** - Cold storage facilities
   - Fields: id (UUID), facility_name, location, owner_profile_id (SERIAL FK), capacity_kg, current_utilization_kg, total_capacity_kg
   - Represents a physical location with cold storage rooms
   - One owner can have multiple facilities

4. **cold_storage_rooms** - Individual storage rooms within facilities
   - Fields: id (UUID), facility_id (UUID FK), room_name, capacity_kg, current_utilization_kg, storage_rate_per_kg_month (DECIMAL)
   - Each facility has multiple rooms
   - Dynamic pricing per room

5. **batches** - Produce batches created by farmers
   - Fields: id (UUID), batch_code, farmer_id (SERIAL FK), product_id (UUID FK), harvest_date, expiry_date, initial_quantity_kg, remaining_quantity_kg, quality_grade
   - Tracks each shipment of produce from a farmer
   - Links to products and farmers

6. **batch_room_allocations** - Mapping between batches and storage rooms
   - Fields: id (UUID), batch_id (UUID FK), room_id (UUID FK), quantity_kg, assigned_at, removed_at
   - Soft delete pattern using removed_at
   - Tracks which batch is stored in which room

7. **products** - Product catalog
   - Fields: id (UUID), name, shelf_life_days, optimal_temperature_min, optimal_temperature_max, optimal_humidity_min, optimal_humidity_max
   - Reference data: apples, tomatoes, potatoes, bananas, etc.
   - 13 products pre-loaded

8. **farmer_room_access** - Access control between farmers and rooms
   - Fields: id (UUID), farmer_id (SERIAL FK), room_id (UUID FK), status (Pending/Approved/Rejected/Revoked), price_per_crate, requested_at, approved_at, approved_by
   - Owner must approve before farmer can use room
   - Implements access control workflow

9. **sales** - Record of completed sales/orders
   - Fields: id (UUID), batch_id (UUID FK), quantity_kg, selling_price, buyer, sold_at
   - Tracks revenue from sold produce
   - Farmer receives revenue when batch is sold

10. **expenses** - Operating costs
    - Fields: id (UUID), facility_id/room_id (FK), category (energy/maintenance/parts), amount, description, created_at
    - Used for: Profit calculation, cost analysis

11. **cold_storage_conditions** - Real-time sensor readings
    - Fields: id (UUID), room_id (UUID FK), temperature, humidity, door_status, timestamp
    - Stores latest HVAC and environmental data
    - Updated in real-time from MQTT sensors

12. **sensor_devices** - IoT sensor registry
    - Fields: id (UUID), room_id (UUID FK), sensor_type (Temperature/Humidity/Door/Ammonia), sensor_name, status, last_reading_value, last_seen
    - Tracks all IoT sensors in each room
    - Status: active/offline/maintenance

13. **energy_consumption** - Energy tracking
    - Fields: id (UUID), facility_id (UUID FK), energy_kwh, solar_percentage, timestamp
    - Tracks solar vs grid power usage
    - Used for: Energy charts, sustainability metrics

14. **facility_maintenance** - Maintenance tasks
    - Fields: id (UUID), facility_id (UUID FK), issue_type, description, priority, frequency_days, status
    - Defines maintenance schedules

15. **farmer_products** - Mapping between farmers and products they can store
    - Fields: farmer_id (SERIAL FK), product_id (UUID FK)
    - Farmers select which products they can store during onboarding

16. **stakeholder_investments** - Investment records
    - Fields: id (UUID), owner_company_id, stakeholder_id, investment_amount, share_percentage, active
    - Tracks investor participation in facility ownership

---

### 1.4 Infrastructure & Deployment

**Backend Hosting:**
- **Docker** - Containerization
  - Dockerfile: Multi-stage build for FastAPI app
  - Ensures consistent environment across development/production
  - Used for: Local development, production deployment

- **Uvicorn Server** - ASGI server
  - Runs on `localhost:8000` (development)
  - Handles HTTP requests asynchronously

**Frontend Hosting:**
- **Vercel** - Serverless deployment platform
  - Git-based deployment (push to GitHub → auto-deploy)
  - Global CDN for static assets
  - Environment variables managed in Vercel dashboard
  - Build command: `cd frontend && npm run build`

- **GitHub Pages** - Alternative static hosting option

**Database Hosting:**
- **Supabase Cloud** - Managed PostgreSQL database
  - URL: `https://vzoypfctadgyflzwodmp.supabase.co`
  - Automatic backups
  - Real-time subscriptions (WebSocket)
  - Built-in authentication system

**IoT & Sensors:**
- **MQTT Broker** - Message queue protocol
  - Hostname: `localhost` or `mqtt.example.com` (production)
  - Port: `1883` (standard MQTT port)
  - Topic: `coldsense/sensors/#`
  - Used for: Sensor data transmission from IoT devices

- **Sensor Hardware** (Assumed)
  - Temperature sensors
  - Humidity sensors
  - Door open/close sensors
  - Ammonia level sensors
  - Power sensors (solar, grid)
  - Compressor monitoring

---

## 2. ARCHITECTURE & DATA FLOW

### 2.1 Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER LAYER (Browser)                          │
│  ┌──────────────┬──────────────┬──────────────┐                 │
│  │ Farmer UI    │ Owner UI      │ Stakeholder  │                 │
│  │ (React)      │ (React)       │ Dashboard    │                 │
│  └──────────────┴──────────────┴──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                         ↓↑ HTTPS + WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                          │
│  React (TSX) + Tailwind + Zustand + React Query                 │
│  ├─ pages/        (Dashboard, Inventory, Orders, Finance)       │
│  ├─ components/   (UI components, charts, tables)               │
│  ├─ stores/       (Auth, Site, Farmer state)                    │
│  ├─ hooks/        (Custom React hooks)                          │
│  └─ utils/        (Helper functions, converters)                │
└─────────────────────────────────────────────────────────────────┘
                         ↓↑ REST + Real-time
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY & BACKEND                         │
│  FastAPI (Python) + Uvicorn                                     │
│  ├─ /api/auth/        (Login, Signup, Session)                  │
│  ├─ /api/inventory/   (Batch creation, listing)                 │
│  ├─ /api/orders/      (Sales transactions)                      │
│  ├─ /api/finance/     (Revenue, expenses, profit)               │
│  ├─ /api/facilities/  (Room management, setup)                  │
│  ├─ /api/sensors/     (Sensor data, telemetry)                  │
│  ├─ /api/approvals/   (Farmer access requests)                  │
│  └─ /api/energy/      (Power consumption tracking)              │
└─────────────────────────────────────────────────────────────────┘
          ↓↑ SQL Queries    ↓↑ MQTT    ↓↑ Real-time Sub
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│  Supabase    │      │ MQTT Broker  │      │ WebSocket    │
│ PostgreSQL   │      │ (Sensors)    │      │ (Live Data)  │
│              │      │              │      │              │
│ • Profiles   │      │ • Temperature│      │ • Conditions │
│ • Facilities │      │ • Humidity   │      │ • Alerts     │
│ • Batches    │      │ • Door State │      │ • Activity   │
│ • Sales      │      │ • Ammonia    │      │              │
│ • Expenses   │      │ • Power      │      │              │
└──────────────┘      └──────────────┘      └──────────────┘
```

### 2.2 Key Data Flows

**Flow 1: Farmer Adding Inventory**
```
Farmer (Browser)
    ↓ Click "Add Inventory"
Frontend: FarmerInventory.tsx
    ↓ Form submission with (product, quantity, harvest_date)
    ↓ Supabase direct insert
Supabase (PostgreSQL)
    ├─ Insert into batches table
    │  (batch_code, farmer_id, product_id, quantity_kg, expiry_date)
    └─ Insert into batch_room_allocations
       (batch_id, room_id, quantity_kg, assigned_at)
    ↓
Backend MQTT Subscriber (Optional: notify owner)
```

**Flow 2: Owner Viewing Inventory**
```
Owner (Browser)
    ↓ Navigate to Inventory Management
Frontend: OwnerInventory.tsx
    ↓ Query chain:
    1. Get owner profile → profiles.id
    2. Get owner's facilities → facilities.owner_profile_id = profile.id
    3. Get rooms in facilities → cold_storage_rooms.facility_id
    4. Get approved farmers → farmer_room_access.room_id + status='Approved'
    5. Get batches → batch_room_allocations.room_id + farmer_id
    6. Join with products → product_name
    7. Join with profiles → farmer_name
    ↓
Frontend: Transform data → Display in table
```

**Flow 3: Real-time Sensor Monitoring**
```
IoT Device (Physical sensors)
    ↓ MQTT Publish (temperature, humidity, door status)
MQTT Broker (Topic: coldsense/sensors/room_id/sensor_type)
    ↓
Backend: MQTT Subscriber (app/mqtt/subscriber.py)
    ├─ Parse MQTT message
    ├─ Insert into cold_storage_conditions table
    └─ Update sensor_devices.last_reading_value
    ↓
Supabase Real-time Subscription
    ↓
Frontend: WebSocket listener
    ↓
Browser: Update HVAC Diagram, Sensor readings in real-time
```

**Flow 4: Order Creation & Revenue**
```
Farmer (Browser)
    ↓ Click "Create Order"
Frontend: FarmerOrders.tsx
    ↓ API Call to /api/orders/ (batch_id, quantity_kg, price, buyer)
    ↓
Backend: orders.py POST endpoint
    ├─ Validate batch exists
    ├─ Insert into sales table (batch_id, quantity_kg, selling_price, buyer)
    └─ Update batches.remaining_quantity_kg
    ↓
Frontend: Refresh order list
    ↓
Owner Finance Dashboard
    ↓ Backend: /api/finance/summary/owner
    ├─ Query sales table by batch_id
    ├─ Sum (quantity_kg * selling_price) for revenue
    └─ Display total revenue
```

---

## 3. MODULE BREAKDOWN

### 3.1 Frontend Module Structure

**Authentication Module** (`features/auth/`)
- `Login.tsx` - User login (email/password)
- `Signup.tsx` - User registration with role selection
- `RoomSelection.tsx` - Farmer selects storage rooms (creates farmer_room_access records)
- `ProductSelection.tsx` - Farmer selects storable products

**Inventory Module** (`features/inventory/`)
- `FarmerInventory.tsx` - Farmer's view of stored batches
  - Add inventory modal
  - Display batches in storage
  - Harvest date tracking
- `OwnerInventory.tsx` - Owner's aggregated view of all inventory
  - See all batches from all approved farmers
  - Facility capacity overview
  - Batch history

**Orders Module** (`features/orders/`)
- `FarmerOrders.tsx` - Create sales orders
  - Select batch to sell
  - Set quantity and price
  - Dispatch date and buyer info
  - API call to /api/orders/

**Finance Module** (`features/finance/`)
- `OwnerFinance.tsx` - Financial dashboard
  - Revenue calculation
  - Expense breakdown
  - Profit analysis
  - 6-month trend charts

**Dashboard Module** (`features/dashboard/`)
- `OwnerDashboard.tsx` - Owner home page
  - System status overview
  - Storage utilization
  - Farmer activity (last 7 days)
  - Energy consumption chart
  - HVAC monitoring (HVACDiagram component)
- `FarmerDashboard.tsx` - Farmer home page
  - Quick access to facilities
  - Recent batch status
  - Active orders

**Monitoring Module** (`features/monitoring/`)
- `OwnerMonitoring.tsx` - Real-time sensor dashboard
  - Live temperature/humidity
  - Door status alerts
  - Sensor health status
  - MQTT data visualization

**Approvals Module** (`features/approvals/`)
- `OwnerApprovals.tsx` - Farmer access request workflow
  - Lists pending farmer_room_access requests
  - Approve/reject interface
  - Sets price_per_crate for each farmer

**Batch Traceability Module** (`features/batch-traceability/`)
- `OwnerBatchTraceability.tsx` - Track batches through lifecycle
  - Search batches by ID, product, farmer
  - Shows: date, product, farmer, facility, quantity
  - Filters: active, archived, expired

**Settings Module** (`features/settings/`)
- `Settings.tsx` - Account and facility configuration
  - User profile editing
  - Facility management (rooms, capacity)
  - Farmer pricing per facility

### 3.2 Backend Module Structure

**API Routes** (`app/api/`)
- `routes.py` - Main router aggregating all endpoints
- `auth.py` - Authentication (login, signup, profile creation)
- `inventory.py` - Batch creation and listing
- `orders.py` - Sales order creation (POST /api/orders/)
- `finance.py` - Revenue, expenses, profit calculations
- `sites.py` - Facility and room management
- `sensors.py` - Sensor data endpoints
- `alerts.py` - Alert definitions and history
- `approvals.py` - Farmer access request management
- `energy.py` - Energy consumption tracking
- `market.py` - Market price data

**Database** (`app/database/`)
- `connection.py` - Supabase client initialization
- `supabase.py` - Database connection pool

**MQTT** (`app/mqtt/`)
- `subscriber.py` - Listens to MQTT topics, inserts into cold_storage_conditions
- `publisher.py` - Publishes control commands to sensors

**Services** (`app/services/`)
- `door_service.py` - Processes door open/close events
- `sensor_service.py` - Aggregates sensor readings

**Models** (`app/models/`)
- `sensor.py` - Sensor reading data class
- `storage.py` - Storage-related data classes

**Schemas** (`app/schemas/`)
- `sensor_schema.py` - Pydantic models for request/response validation

**Utils** (`app/utils/`)
- `logger.py` - Centralized logging configuration

**Configuration** (`app/`)
- `config.py` - Environment variables and app config
- `main.py` - FastAPI app initialization and middleware setup

---

## 4. KEY FEATURES & THEIR IMPACT ON ARCHITECTURE

### 4.1 Real-time Monitoring

**Impact:**
- Requires MQTT broker infrastructure for sensor data
- Backend needs async MQTT subscriber thread
- Frontend needs WebSocket connection for live updates
- Database needs fast query performance for frequently accessed sensor table
- Adds latency: Sensor → MQTT → Backend → Database → WebSocket → Frontend (~1-2 seconds)

**Resource Usage:**
- Sensor data: ~1KB per reading, 60+ readings/minute per room
- MQTT broker: ~100MB RAM for typical deployment
- Database storage: ~500MB/month for 14 sensors × 1440 readings/day

### 4.2 Real-time Geospatial Mapping

**Impact:**
- Requires D3-geo and react-simple-maps libraries (+250KB bundle)
- Frontend must load India map coordinates
- Real-time location updates for facilities

**Resource Usage:**
- Map data: ~500KB GeoJSON
- Frontend bundle increase: +15% (from charting + mapping)

### 4.3 Multi-Role Access Control

**Impact:**
- Database needs role field in profiles table
- Backend must check role on every API endpoint
- Frontend routes must be protected based on role
- Adds complexity to queries (only show user's own data)

**Query Impact:**
- Every inventory query filters by `owner_id` or `farmer_id`
- Prevents data leakage but adds WHERE clause to queries

### 4.4 Dynamic Pricing

**Impact:**
- `cold_storage_rooms.storage_rate_per_kg_month` is dynamic
- Each room can have different pricing
- Finance calculations must multiply quantity × rate per room

**Resource Usage:**
- Database: 1 additional DECIMAL column per room
- Frontend: Price input field in facility setup

### 4.5 Batch Traceability

**Impact:**
- Requires batch_room_allocations junction table (many-to-many)
- Soft delete pattern (removed_at) adds complexity
- Search/filter queries must join multiple tables

**Query Performance:**
- Batch view requires 4-5 table joins
- With many batches, can be slow without proper indexing
- Recommendation: Add database indexes on batch_code, farmer_id, created_at

---

## 5. TECHNOLOGY CHOICES & RATIONALE

| Component | Choice | Why | Alternative Rejected |
|-----------|--------|-----|----------------------|
| Frontend Framework | React | Most popular, large ecosystem, JSX syntax | Vue, Angular |
| State Management | Zustand | Lightweight, simpler than Redux | Redux, Context API |
| UI Framework | Tailwind | Utility-first, smaller CSS, fast development | Bootstrap, Material-UI |
| Backend | FastAPI | Fast (async), auto-generated docs, Pydantic validation | Django, Flask |
| Database | Supabase/PostgreSQL | Managed, real-time subs, open-source | Firebase, MongoDB |
| Real-time | MQTT + WebSocket | IoT standard, low latency, scalable | REST polling, gRPC |
| Charting | Recharts | React-native, lightweight, interactive | D3, Chart.js (more complex) |
| Deployment | Vercel + Docker | Global CDN, automatic deploys, containerized | Heroku, AWS EC2 |
| Build Tool | Vite | 10-100x faster than Webpack | Webpack, Parcel |

---

## 6. DATA STORAGE & RETENTION

### 6.1 Database Size Estimation

**Assuming:** 10 facilities, 50 farmers, 1 year of operation

| Table | Records | Avg Size | Total Storage |
|-------|---------|----------|---------------|
| profiles | 60 | 500 bytes | 30 KB |
| facilities | 10 | 1 KB | 10 KB |
| cold_storage_rooms | 100 | 500 bytes | 50 KB |
| batches | 10,000 | 1 KB | 10 MB |
| batch_room_allocations | 15,000 | 500 bytes | 7.5 MB |
| sales | 5,000 | 500 bytes | 2.5 MB |
| cold_storage_conditions | 2,100,000 | 200 bytes | 420 MB |
| sensor_devices | 60 | 500 bytes | 30 KB |
| expenses | 1,000 | 500 bytes | 500 KB |
| energy_consumption | 90,000 | 300 bytes | 27 MB |
| **TOTAL** | | | **~467 MB** |

**Supabase Pricing:** Free tier up to 500 MB, then $10/month per additional 1 GB.

### 6.2 Data Cleanup Policy

- **cold_storage_conditions:** Keep last 30 days, archive older data
- **sales:** Keep indefinitely (financial records)
- **batches:** Keep indefinitely (traceability requirements)
- **sensor_devices:** Keep indefinitely, mark inactive sensors as archived

---

## 7. SECURITY & COMPLIANCE

### 7.1 Authentication & Authorization

- **Method:** Supabase Auth (Firebase-compatible JWT)
- **Session:** JWT token stored in browser localStorage
- **Expiry:** 3600 seconds (1 hour) - user must re-authenticate
- **Role-based:** Every API endpoint checks user role before returning data

### 7.2 Data Privacy

- **Farmers cannot see:** Other farmers' data, prices, facility details
- **Owners cannot see:** Farmer's personal data (only name)
- **Database:** All queries filter by user_id or owner_id to prevent lateral access

### 7.3 Environment Variables

**Frontend (.env):**
- VITE_SUPABASE_URL - Public, shared with frontend
- VITE_SUPABASE_ANON_KEY - Public API key (limited permissions)

**Backend (.env):**
- SUPABASE_URL - Same as frontend
- SUPABASE_KEY - Service role key (full permissions, KEEP SECRET)
- MQTT credentials - If authentication required

---

## 8. PERFORMANCE CONSIDERATIONS

### 8.1 Frontend Performance

**Bundle Size:** ~450 KB (gzipped)
- React: 42 KB
- Tailwind CSS: 15 KB
- Recharts: 80 KB
- Supabase client: 50 KB
- Other dependencies: 263 KB

**Optimization:**
- Code splitting by route (lazy loading)
- Image optimization (Vercel automatically serves WebP)
- Cache assets for 1 year (Vercel CDN)

**Page Load Time:**
- Desktop: ~2 seconds (first contentful paint)
- Mobile: ~3-4 seconds
- Repeat visits: <500ms (cached)

### 8.2 Backend Performance

**Request latency:**
- Authentication (login): 200-500ms (Supabase Auth)
- API calls: 100-200ms (database query + JSON serialization)
- MQTT subscribe: Real-time (latency depends on broker)

**Bottlenecks:**
- Complex joins in inventory query (multiple table lookups)
- Finance calculations (sum aggregations)
- Sensor data inserts (high volume, needs optimization)

**Optimization:**
- Add database indexes on frequently queried columns
- Implement query result caching (Redis)
- Batch MQTT inserts (insert 100 readings at once, not individually)

---

## 9. INTEGRATION POINTS

### 9.1 External Services

| Service | Purpose | Impact |
|---------|---------|--------|
| **Supabase** | Database + Auth | Core - if down, app doesn't work |
| **MQTT Broker** | Sensor data | Non-critical - sensors queue data until broker is back |
| **Vercel** | Frontend hosting | Non-critical - can host elsewhere |
| **GitHub** | Version control | Non-critical - CI/CD trigger |

### 9.2 Future Integration Opportunities

- **AWS IoT Core:** Replace local MQTT broker with managed service
- **Stripe/Razorpay:** Payment processing for farmer-to-owner settlements
- **SendGrid/AWS SES:** Email notifications
- **Twilio:** SMS alerts for critical events (door open alert)
- **Datadog/New Relic:** Application performance monitoring
- **Auth0:** SSO/enterprise authentication

---

## 10. DEPLOYMENT ARCHITECTURE

### 10.1 Development Environment

```
Developer Machine
├─ Frontend (npm run dev) → http://localhost:5173
├─ Backend (uvicorn main:app) → http://localhost:8000
├─ MQTT Broker (docker run mosquitto) → localhost:1883
└─ Database → Supabase Cloud (shared dev)
```

### 10.2 Production Environment

```
GitHub
  └─ Push to main branch
    └─ Vercel Auto-Deploy
      ├─ Trigger build: npm run build
      ├─ Upload to CDN (Vercel Edge Network)
      └─ Serve globally

Backend (Option 1: Docker on AWS)
  ├─ Docker image pushed to ECR
  ├─ ECS Fargate runs container
  └─ ALB load balancer

Backend (Option 2: Heroku/Railway)
  ├─ Git push deploys app
  ├─ Automatic scaling
  └─ Environment variables in platform UI

Database
  └─ Supabase Postgres (managed backup, replication)

MQTT Broker
  └─ AWS IoT Core OR HiveMQ Cloud (managed MQTT)
```

---

## 11. DEVELOPMENT WORKFLOW

### 11.1 Local Setup

1. Clone repository
2. `cd frontend && npm install`
3. `cd ../backend && python -m venv venv && pip install -r requirements.txt`
4. Configure `.env` files (SUPABASE_URL, SUPABASE_KEY)
5. Start MQTT broker: `docker run -it -p 1883:1883 eclipse-mosquitto`
6. Start backend: `cd backend && uvicorn app.main:app --reload`
7. Start frontend: `cd frontend && npm run dev`
8. Open http://localhost:5173

### 11.2 Code Structure for Contributors

**Frontend Changes:**
- File → `frontend/src/features/[module]/`
- Add tests in same folder
- Run `npm run build` to check for TS errors
- Commit to feature branch → PR → Review → Merge

**Backend Changes:**
- File → `backend/app/api/` (new endpoints) or `backend/app/services/`
- Add Pydantic schema in `app/schemas/`
- Run `pytest` to validate
- Document endpoint in docstring
- Commit to feature branch → PR → Review → Merge

---

## 12. MONITORING & LOGGING

### 12.1 Frontend Logging

**Tools:**
- Browser console (development)
- Sentry (production errors)

**What's logged:**
- User actions (login, form submissions)
- API errors
- Failed data fetches

### 12.2 Backend Logging

**Tools:**
- Python logging (file in `backend/logs/`)
- Log level: INFO (set in .env)

**What's logged:**
- API requests/responses
- Database operations
- MQTT events
- Errors with stack traces

**Example:**
```
2024-09-15 10:30:45 INFO - GET /api/inventory/farmer/123 from 192.168.1.1
2024-09-15 10:30:46 INFO - Batch created: BATCH-1234567890-ABC123
2024-09-15 10:31:00 ERROR - MQTT disconnect: Connection refused
```

---

## CONCLUSION

ColdSense AI is a comprehensive cold chain management system built on:
- **Modern web technologies** (React, FastAPI, Supabase)
- **Real-time IoT integration** (MQTT, WebSocket)
- **Scalable architecture** (stateless backend, cloud-native)
- **Multi-role access control** (farmer, owner, stakeholder)
- **Financial tracking** (revenue, expenses, profit analysis)

The system handles complex business logic (farmer approvals, dynamic pricing, real-time monitoring) while maintaining code simplicity and performance. It's designed to scale from 10 to 1000+ facilities with proper database indexing and infrastructure scaling.
