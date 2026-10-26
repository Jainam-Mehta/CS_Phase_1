# SystemII - Backend & Frontend Integration Guide

**Document Version:** 1.0  
**Last Updated:** October 26, 2026  
**Technologies:** FastAPI (backend), React (frontend), REST API  

---

## Executive Summary

This document details how the React frontend communicates with the FastAPI backend, including:
- API endpoint contracts
- Data flow & transformations
- Authentication & authorization
- Real-time updates
- Error handling
- Performance considerations

**Key Stats:**
- 40+ REST endpoints
- ~300-500ms latency (gateway to dashboard)
- JWT authentication via Supabase
- Polling-based updates (WebSocket planned)

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          User Browser (React App)           │
│  ├─ Dashboard (temp/humidity monitoring)    │
│  ├─ Site management (create, edit, delete)  │
│  ├─ Reports (PDF/CSV export)                │
│  └─ Notifications (alerts, messages)        │
└────────────────┬────────────────────────────┘
                 │ HTTP/REST (Axios)
                 │ JSON requests/responses
                 ↓
┌─────────────────────────────────────────────┐
│        Nginx Reverse Proxy (Port 80/443)    │
│  ├─ Routes / → Frontend (port 3000)         │
│  ├─ Routes /api → Backend (port 8000)       │
│  └─ WebSocket upgrade (future)              │
└────────────────┬────────────────────────────┘
                 │
         ┌───────┴────────┐
         ↓                ↓
    ┌────────────┐  ┌──────────────┐
    │  Frontend  │  │   Backend    │
    │  (React)   │  │  (FastAPI)   │
    │ port 3000  │  │  port 8000   │
    └────────────┘  └──────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
    ┌─────────┐  ┌─────────────────┐ ┌──────────┐
    │MQTT Sub │  │PostgreSQL (local)│ │Supabase  │
    │(Mosquit │  │  or Cloud SQL    │ │(external)│
    │to)      │  │  cold_storage_   │ │(Auth)    │
    │         │  │  conditions (etc)│ │          │
    └─────────┘  └──────────────────┘ └──────────┘
```

---

## Authentication Flow

### 1. Login Process

```
Frontend Flow:
┌──────────────┐
│ User enters  │
│ email/pass   │
└──────┬───────┘
       ↓
┌──────────────────────────────────────────┐
│ POST /auth/login                         │
│ Body: { email, password }                │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Backend calls Supabase Auth              │
│ (Supabase manages credentials)           │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Response: { access_token, user_id }      │
│ access_token = JWT valid for 24 hours    │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ Frontend stores JWT in:                  │
│ - localStorage (persistence)             │
│ - Memory (session)                       │
└──────┬───────────────────────────────────┘
       ↓
┌──────────────────────────────────────────┐
│ All future API calls include:            │
│ Authorization: Bearer {access_token}     │
└──────────────────────────────────────────┘
```

### 2. Token Usage

```javascript
// Frontend (Axios interceptor)
const api = axios.create({
  baseURL: 'http://backend:8000/api',
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Example request
const response = await api.get('/sites/');
// Automatically includes: Authorization: Bearer eyJhbGc...
```

### 3. Authorization

```
Role-Based Access Control (RBAC):

User Roles: farmer, owner, stakeholder, admin

API Endpoints Protected By Role:

GET /sites/
├─ farmer: Can view ONLY sites they have access to
├─ owner: Can view ALL their sites
├─ stakeholder: Can view invested sites
└─ admin: Can view ALL sites

POST /sites/
├─ farmer: ❌ Denied
├─ owner: ✅ Allowed
├─ stakeholder: ❌ Denied
└─ admin: ✅ Allowed

DELETE /sites/{id}
├─ farmer: ❌ Denied (even if access granted)
├─ owner: ✅ Allowed (if owner of site)
├─ stakeholder: ❌ Denied
└─ admin: ✅ Allowed (force delete)

Authorization Check (Backend):
@router.get("/sites/")
def get_sites(current_user: User = Depends(get_current_user)):
    if current_user.role == "farmer":
        # Query only sites farmer has access to
        return db.query(Site).filter(
            Site.id.in_(
                db.query(FarmerAccess.site_id)
                .filter(FarmerAccess.farmer_id == current_user.id)
            )
        ).all()
    elif current_user.role == "owner":
        # Query only owner's sites
        return db.query(Site).filter(Site.owner_id == current_user.id).all()
    else:
        # Admin sees all
        return db.query(Site).all()
```

---

## API Endpoints

### Authentication Endpoints

```
POST /auth/login
├─ Request: { email: string, password: string }
├─ Response: { access_token: string, user_id: UUID }
├─ Status: 200 (success), 401 (invalid creds)
└─ Used by: Splash/Login pages

POST /auth/signup
├─ Request: { email, password, role, company_name }
├─ Response: { user_id: UUID, access_token: string }
├─ Status: 201 (created), 400 (validation error)
└─ Used by: Signup page (role selection)

POST /auth/logout
├─ Request: { } (empty)
├─ Response: { message: "Logged out" }
├─ Status: 200
└─ Used by: Logout button
```

### Site Management Endpoints

```
GET /sites/
├─ Query params: None
├─ Response: Array of SiteResponse
│  ├─ id: UUID
│  ├─ name: string (facility_name)
│  ├─ location: string (address)
│  ├─ category: string ("Cold Storage")
│  ├─ capacity: float (kg)
│  ├─ current_load: float (kg)
│  ├─ temperature: float (latest °C)
│  ├─ humidity: float (latest %)
│  └─ health_score: int (0-100)
├─ Status: 200
└─ Used by: Owner Dashboard (site list)

GET /sites/{site_id}
├─ Response: Single SiteResponse
├─ Status: 200 (found), 404 (not found)
└─ Used by: Site detail page

POST /sites/
├─ Request: { facility_name, address, owner_id, capacity }
├─ Response: { id: UUID, code: string, site_code: string } [NEW]
├─ Status: 201 (created)
└─ Used by: Site creation form

PUT /sites/{site_id}
├─ Request: { facility_name, address, capacity, category }
├─ Response: SiteResponse (updated)
├─ Status: 200
└─ Used by: Edit site modal

DELETE /sites/{site_id}
├─ Request: { deletion_reason: string } [NEW]
├─ Response: { message: "Soft deleted", deleted_at: timestamp }
├─ Status: 204 (no content)
└─ Used by: Delete site button
```

### Sensor/Reading Endpoints

```
GET /api/latest-reading?room_id={uuid}
├─ Query params: room_id (required)
├─ Response: LatestReading
│  ├─ temperature: float
│  ├─ humidity: float
│  ├─ recorded_at: ISO 8601 timestamp
│  ├─ room_id: UUID
│  └─ sensor_id: UUID (optional)
├─ Status: 200
├─ Latency: 50-100ms (typical)
└─ Used by: Dashboard (polling every 5-10s)

GET /sensors/
├─ Response: Array of SensorDevice
│  ├─ id: UUID
│  ├─ sensor_type: string (Temperature, Humidity, Door)
│  ├─ status: string (Online, Offline, Error)
│  ├─ last_reading: float
│  └─ last_reading_value: ISO timestamp
├─ Status: 200
└─ Used by: Sensor list page

GET /sensors/latest
├─ Response: Array of latest readings (all sensors in all rooms)
├─ Status: 200
└─ Used by: Dashboard initial load
```

### Room Management Endpoints

```
GET /storage/rooms/{site_id}
├─ Response: Array of Room
│  ├─ id: UUID
│  ├─ room_code: string (R01, R02, etc.) [NEW]
│  ├─ room_name: string
│  ├─ capacity_kg: float
│  ├─ current_temp: float (latest)
│  ├─ current_humidity: float (latest)
│  └─ health_score: int
├─ Status: 200
└─ Used by: Room list (per site)

POST /storage/rooms/{site_id}
├─ Request: { room_name, capacity_kg }
├─ Response: { id: UUID, room_code: string } [NEW]
├─ Status: 201
└─ Used by: Add room button

GET /storage/conditions/{room_id}
├─ Query params: limit=50, offset=0
├─ Response: Array of cold_storage_conditions
│  ├─ timestamp: ISO 8601
│  ├─ temperature: float
│  ├─ humidity: float
│  └─ door_status: string (open/closed)
├─ Status: 200
└─ Used by: Temperature/humidity charts

GET /storage/conditions/{room_id}/summary
├─ Query params: time_range (1h, 24h, 7d, 30d)
├─ Response: SummaryStats
│  ├─ avg_temperature: float
│  ├─ min_temperature: float
│  ├─ max_temperature: float
│  ├─ anomalies_count: int
│  └─ uptime_percentage: float
├─ Status: 200
└─ Used by: Dashboard stats panel
```

### Alert Endpoints

```
GET /alerts/
├─ Query params: room_id (optional), status (active/resolved)
├─ Response: Array of Alert
│  ├─ id: UUID
│  ├─ alert_type: string (TEMP_LOW, TEMP_HIGH, DOOR_OPEN)
│  ├─ severity: string (info, warning, critical)
│  ├─ message: string
│  ├─ is_active: boolean
│  └─ created_at: ISO timestamp
├─ Status: 200
└─ Used by: Alert list page

POST /alerts/
├─ Request: { room_id, alert_type, severity, message }
├─ Response: Alert (created)
├─ Status: 201
└─ Used by: Create alert (manual or automatic)

PUT /alerts/{alert_id}
├─ Request: { is_active: false } (resolve alert)
├─ Response: Alert (updated)
├─ Status: 200
└─ Used by: Resolve alert button

GET /alerts/active
├─ Response: Array of active alerts (count <= 100)
├─ Status: 200
├─ Polling interval: Every 10 seconds
└─ Used by: Alert bell notification
```

### Report Endpoints

```
GET /reports/
├─ Response: Array of available reports
├─ Status: 200
└─ Used by: Reports page

POST /reports/export
├─ Request: { 
│   room_id: UUID,
│   start_date: ISO 8601,
│   end_date: ISO 8601,
│   format: "csv" | "pdf"
│ }
├─ Response: Binary file (CSV or PDF)
├─ Status: 200 (with file download)
└─ Used by: Export button

GET /reports/summary
├─ Query params: site_id, time_range (1d, 7d, 30d)
├─ Response: ReportSummary
│  ├─ total_readings: int
│  ├─ avg_temperature: float
│  ├─ alerts_triggered: int
│  ├─ door_open_count: int
│  └─ uptime_percentage: float
├─ Status: 200
└─ Used by: Dashboard summary section
```

---

## Data Flow Examples

### Example 1: Dashboard Load

```
1. User opens dashboard

2. Frontend executes:
   GET /sites/ (list all owner's sites)
   ↓ Response: [Site{id, name, temp, humidity, ...}]
   
3. For each site, fetch rooms:
   GET /storage/rooms/{site_id} (for each site)
   ↓ Response: [Room{id, room_code, ...}]
   
4. For each room, fetch latest condition:
   GET /api/latest-reading?room_id={room_id} (parallel calls)
   ↓ Response: {temperature, humidity, recorded_at}
   
5. Display in dashboard:
   ├─ Site cards with location + capacity
   ├─ Room tiles with latest temp/humidity
   ├─ Alert bell with active alert count
   └─ Charts with last 24 hours of data
   
6. Set polling interval (every 5-10s):
   GET /api/latest-reading?room_id={room_id}
   ↓ Auto-refresh charts on new data

Timeline: ~500-1000ms to full dashboard render
```

### Example 2: Create New Site

```
1. Owner clicks "Add Site" button

2. Form opens with inputs:
   ├─ Facility name: "Nashik Cold Store"
   ├─ Address: "123 Main St, Nashik"
   ├─ Capacity: 50000 kg
   └─ [Create Site] button

3. Frontend validates form:
   ├─ Facility name: not empty ✓
   ├─ Capacity: > 0 ✓
   └─ No errors → proceed

4. Frontend calls:
   POST /sites/
   Body: {
     facility_name: "Nashik Cold Store",
     address: "123 Main St, Nashik",
     capacity: 50000,
     owner_id: current_user.id
   }
   
5. Backend:
   ├─ Validates owner_id owns this site
   ├─ Auto-generates site_code: "S01"
   ├─ Auto-generates locality_code: "MHNKIGP01" [from owner input]
   ├─ Creates site record
   ├─ Creates MQTT route: mqtt_locality_routes
   └─ Returns: {id, code, site_code}
   
6. Frontend receives response:
   ├─ Site created: id = "550e8400-..."
   ├─ site_code: "S01"
   ├─ Redirect to site detail page
   ├─ Show toast: "Site created successfully"
   └─ Auto-refresh sites list

Response Time: 100-200ms
```

### Example 3: Real-Time Alert

```
Scenario: Temperature drops below safe level

1. Gateway publishes MQTT:
   Topic: cdsense/gw/GW001/MHNKIGP01/S01/R01
   Payload: {Temp1: "0.5", Humidity1: "90"}
   
2. MQTT Subscriber receives:
   ├─ Parses topic → locality_code=MHNKIGP01, site_code=S01, room_code=R01
   ├─ Stores in: sensor_ingestion_raw (raw JSONB)
   ├─ Extracts: temperature=0.5, humidity=90
   ├─ Stores in: cold_storage_conditions (for dashboard)
   └─ Checks: temperature < 2°C (danger threshold)

3. Alert triggered:
   ├─ Creates alert: {room_id, alert_type=TEMP_LOW, severity=critical}
   ├─ Inserts into: alerts table
   ├─ Sends notification: farmer who owns room
   └─ Stores in: farmer_notifications

4. Frontend polling detects change:
   ├─ GET /api/latest-reading?room_id=... (every 5s)
   ├─ Returns: temperature=0.5 (dangerously low)
   ├─ Updates dashboard: Temperature card turns RED
   ├─ Plays alert sound (browser notification)
   ├─ Shows toast: "🚨 Low temperature alert!"
   └─ Auto-refresh alert list
   
5. GET /alerts/active
   ├─ Returns: [Alert{type=TEMP_LOW, severity=critical, ...}]
   ├─ Alert bell shows: "1 critical alert"
   ├─ Farmer clicks bell → see full alert details
   └─ Farmer can "Resolve alert" when temperature recovers

End-to-End Latency:
├─ Gateway publish → Database: 70ms
├─ Database → Frontend GET: 50ms
├─ Frontend polling detects: +5s (polling interval)
├─ Frontend renders: 100ms
└─ User sees alert: ~5.2 seconds (depends on polling interval)

[To reduce to <500ms, use WebSocket instead of polling]
```

---

## Frontend to Backend Communication

### Request Format

```
HTTP Method: GET, POST, PUT, DELETE
Content-Type: application/json
Authorization: Bearer {jwt_token}

Example POST request:
POST /api/sites/ HTTP/1.1
Host: backend:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Content-Length: 95

{
  "facility_name": "Nashik Cold Store",
  "address": "123 Main St, Nashik",
  "capacity": 50000,
  "owner_id": "69c0d035-9d8a-4060-9f7e-987980022e8c"
}
```

### Response Format

```
HTTP/1.1 201 Created
Content-Type: application/json
Date: Mon, 26 Oct 2026 14:30:00 GMT

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "facility_name": "Nashik Cold Store",
  "address": "123 Main St, Nashik",
  "capacity": 50000,
  "site_code": "S01",
  "locality_code": "MHNKIGP01",
  "owner_id": "69c0d035-9d8a-4060-9f7e-987980022e8c",
  "created_at": "2026-10-26T14:30:00Z",
  "updated_at": "2026-10-26T14:30:00Z"
}
```

### Error Handling

```
Error Response Format:
{
  "detail": "Error message",
  "status": 400 | 401 | 403 | 404 | 500,
  "timestamp": "2026-10-26T14:30:00Z"
}

Common Errors:

400 Bad Request
├─ Invalid input (validation failed)
├─ Missing required fields
└─ Malformed JSON

401 Unauthorized
├─ No authorization header
├─ Invalid/expired token
└─ Token signature mismatch

403 Forbidden
├─ Insufficient permissions
├─ User not owner of resource
└─ Role-based access denied

404 Not Found
├─ Resource doesn't exist
├─ Site/room/sensor not found
└─ User not found

500 Internal Server Error
├─ Database connection failed
├─ Unhandled exception
└─ Service temporarily unavailable

Frontend Error Handling:
try {
  const response = await api.get(`/sites/${siteId}`);
  setSite(response.data);
} catch (error) {
  if (error.response?.status === 404) {
    showError("Site not found");
  } else if (error.response?.status === 401) {
    redirectToLogin();  // Token expired
  } else if (error.response?.status === 500) {
    showError("Server error, try again later");
  } else {
    showError("Network error");
  }
}
```

---

## Real-Time Updates (Current vs Planned)

### Current: Polling

```
Method: HTTP GET requests at fixed intervals

Flow:
1. setInterval(() => {
   GET /api/latest-reading?room_id=...
   }, 5000);  // Every 5 seconds

2. Pros:
   ├─ Simple to implement
   ├─ Works with standard HTTP
   ├─ No special server config needed
   └─ Works behind firewalls

3. Cons:
   ├─ Latency: ~5s delay (polling interval)
   ├─ Network overhead: Unnecessary requests
   ├─ Database load: Repeated queries
   └─ Not true real-time

4. Current latency breakdown:
   ├─ Gateway → MQTT: 20ms
   ├─ MQTT → Database: 50ms
   ├─ Database → API ready: 10ms
   ├─ Frontend polling delay: 5000ms ← BOTTLENECK
   ├─ API response: 50ms
   ├─ Frontend render: 100ms
   └─ TOTAL: 5.2 seconds
```

### Planned: WebSocket (Week 3)

```
Method: Persistent bidirectional WebSocket connection

Flow:
1. Frontend connects:
   WebSocket ws://backend:8000/ws/subscribe/room_id

2. Server subscribes:
   ├─ Adds to subscribers list
   ├─ Listens for database changes (LISTEN/NOTIFY)
   └─ Waits for events

3. Event triggers (new MQTT message):
   ├─ Backend receives MQTT
   ├─ Writes to database
   ├─ Triggers notification
   ├─ Server sends: {temp: 4.2, humidity: 85.3}
   └─ All subscribed clients receive instantly

4. Frontend receives:
   ├─ WebSocket onmessage handler triggered
   ├─ Updates chart data
   ├─ Renders new values
   └─ Total latency: <500ms

5. Latency improvement:
   ├─ Gateway → MQTT: 20ms
   ├─ MQTT → Database: 50ms
   ├─ Database → Server notify: 10ms
   ├─ Server → WebSocket push: 30ms
   ├─ Frontend receives: <100ms
   ├─ Frontend render: 100ms
   └─ TOTAL: ~300ms (vs 5.2s now)
```

---

## Performance Optimization

### Frontend Optimizations

```
1. Code Splitting
   ├─ Load pages on-demand (React.lazy)
   ├─ Reduce initial bundle size
   └─ ~30% faster page load

2. Caching
   ├─ Cache sites list (10 min)
   ├─ Cache sensor metadata
   └─ Reduce API calls by 40%

3. Memoization
   ├─ Prevent unnecessary re-renders
   ├─ useMemo() for expensive calculations
   └─ ~15% faster chart updates

4. Image Optimization
   ├─ Compress icons/logos
   ├─ Use WebP format
   └─ ~20% smaller bundle
```

### Backend Optimizations

```
1. Database Indexing
   ├─ Index on room_id (sensor_readings)
   ├─ Index on recorded_at (timestamp queries)
   └─ Query speed: 50-100x faster

2. Connection Pooling
   ├─ Reuse DB connections (20 pool size)
   ├─ Avoid connection overhead
   └─ Reduce latency by 50ms

3. Caching
   ├─ Redis cache for latest readings
   ├─ TTL: 5 seconds
   └─ API response < 50ms (cached)

4. Query Optimization
   ├─ SELECT only needed columns
   ├─ Use LIMIT for pagination
   └─ Avoid N+1 queries
```

---

## Troubleshooting

### Frontend Issues

```
Issue: Dashboard not updating
Solution 1: Check network tab (GET requests 5XX?)
Solution 2: Check browser console for errors
Solution 3: Verify JWT token not expired
Solution 4: Clear localStorage, re-login

Issue: Slow page load
Solution 1: Check Network tab for slow API calls
Solution 2: Check browser dev tools Performance tab
Solution 3: Reduce polling frequency to 10s
Solution 4: Enable browser caching

Issue: "401 Unauthorized" error
Solution 1: Token expired → Re-login
Solution 2: Token invalid → Clear localStorage, re-login
Solution 3: CORS issue → Check backend CORS config
```

### Backend Issues

```
Issue: API returns 500 error
Solution 1: Check backend logs: docker logs coldsense-backend
Solution 2: Verify database connection
Solution 3: Check if PostgreSQL is running
Solution 4: Restart backend: docker-compose restart coldsense-backend

Issue: Database connection timeout
Solution 1: Check if PostgreSQL container is running
Solution 2: Verify connection string (.env DATABASE_URL)
Solution 3: Check database disk space
Solution 4: Increase connection pool size in env

Issue: MQTT data not appearing in API
Solution 1: Check if MQTT subscriber is running
Solution 2: Verify gateway is publishing to correct topic
Solution 3: Check MQTT subscriber logs
Solution 4: Verify database writes with: SELECT COUNT(*) FROM cold_storage_conditions;
```

---

**End of Backend-Frontend Integration Documentation**
