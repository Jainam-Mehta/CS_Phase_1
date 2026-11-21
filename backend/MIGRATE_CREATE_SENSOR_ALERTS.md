# Migration: Create sensor_alerts Table

## Problem
The alert system needs a `sensor_alerts` table in Supabase that includes both `farmer_id` and `owner_id` columns so that alerts are visible to both the farmer (who stored the product) and the owner (who owns the facility).

## Solution
Run the SQL migration to create the table with proper schema.

## Steps

### 1. Manual Migration (Easiest for Supabase)

Open your Supabase project → **SQL Editor** → create a new query and paste this:

```sql
-- ============================================================================
-- MIGRATION: Create sensor_alerts table for auto-alert system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sensor_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
  
  alert_type character varying(100) NOT NULL,
  severity character varying(50) DEFAULT 'warning',
  title character varying(255) NOT NULL,
  description text,
  
  sensor_type character varying(50),
  sensor_number integer,
  current_value numeric(10, 4),
  min_value numeric(10, 4),
  max_value numeric(10, 4),
  
  status character varying(50) DEFAULT 'active',
  acknowledged boolean DEFAULT false,
  
  -- CRITICAL: farmer_id and owner_id for visibility
  farmer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT alert_type_check CHECK (alert_type IN (
    'sensor_threshold_violation',
    'door_alert',
    'system_alert'
  )),
  CONSTRAINT severity_check CHECK (severity IN ('critical', 'warning', 'info')),
  CONSTRAINT status_check CHECK (status IN ('active', 'acknowledged', 'resolved'))
);

-- Create indexes for fast lookups
CREATE INDEX idx_sensor_alerts_room_id ON public.sensor_alerts(room_id);
CREATE INDEX idx_sensor_alerts_farmer_id ON public.sensor_alerts(farmer_id);
CREATE INDEX idx_sensor_alerts_owner_id ON public.sensor_alerts(owner_id);
CREATE INDEX idx_sensor_alerts_created_at ON public.sensor_alerts(created_at DESC);
CREATE INDEX idx_sensor_alerts_status ON public.sensor_alerts(status);
CREATE INDEX idx_sensor_alerts_acknowledged ON public.sensor_alerts(acknowledged);
CREATE INDEX idx_sensor_alerts_room_created ON public.sensor_alerts(room_id, created_at DESC);
CREATE INDEX idx_sensor_alerts_sensor_type ON public.sensor_alerts(sensor_type);

-- Composite index for common query: get recent unacknowledged alerts for farmer
CREATE INDEX idx_sensor_alerts_farmer_unacknowledged ON public.sensor_alerts(
  farmer_id, 
  acknowledged, 
  created_at DESC
) WHERE acknowledged = false;

-- Composite index for common query: get recent unacknowledged alerts for owner
CREATE INDEX idx_sensor_alerts_owner_unacknowledged ON public.sensor_alerts(
  owner_id, 
  acknowledged, 
  created_at DESC
) WHERE acknowledged = false;
```

Then click **Run** ✓

### 2. Disable RLS (If Needed)

If the backend still gets permission errors, you may need to disable RLS on this table or grant permissions:

```sql
-- Disable RLS for development/testing
ALTER TABLE public.sensor_alerts DISABLE ROW LEVEL SECURITY;

-- OR grant service_role permissions (for production)
GRANT SELECT, INSERT, UPDATE ON public.sensor_alerts TO service_role;
```

## After Migration

1. **Verify the table exists:**
   - Go to **Supabase → Table Editor**
   - Look for `sensor_alerts` table
   - Confirm columns: `id`, `room_id`, `farmer_id`, `owner_id`, `alert_type`, `status`, `acknowledged`, `created_at`, etc.

2. **Restart the backend on AWS:**
   ```bash
   sudo systemctl restart coldsense-backend
   ```

3. **Test the alerts endpoint:**
   - Frontend should now be able to fetch alerts at `/alerts/farmer/{farmer_id}`
   - Alerts should appear in FarmerAlertsAndInsights page

## Column Descriptions

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `room_id` | UUID | Which room triggered the alert |
| `farmer_id` | UUID | Farmer who stored the product (can see alert) |
| `owner_id` | UUID | Facility owner (can see alert) |
| `alert_type` | VARCHAR | Type: sensor_threshold_violation, door_alert, system_alert |
| `severity` | VARCHAR | critical, warning, info |
| `title` | VARCHAR | Alert title (e.g., "Temperature Too High") |
| `description` | TEXT | Detailed message |
| `sensor_type` | VARCHAR | Temperature, Humidity, Door, etc. |
| `sensor_number` | INT | Sensor 1, 2, 3, 4 |
| `current_value` | NUMERIC | Current reading (e.g., 28.5°C) |
| `min_value` | NUMERIC | Minimum threshold (e.g., 24.0°C) |
| `max_value` | NUMERIC | Maximum threshold (e.g., 27.0°C) |
| `status` | VARCHAR | active, acknowledged, resolved |
| `acknowledged` | BOOLEAN | Has user acknowledged the alert? |
| `created_at` | TIMESTAMP | When alert was generated |
| `updated_at` | TIMESTAMP | When alert was last updated |

## Deduplication Logic

The backend (subscriber.py) implements 15-minute deduplication:
- **If alert unacknowledged:** Won't create a duplicate alert for 15 minutes
- **If alert acknowledged:** New alert can be created immediately if threshold violated again

This prevents alert flooding while allowing re-alerts after user acknowledges.
