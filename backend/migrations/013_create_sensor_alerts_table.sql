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

PRINT 'Created sensor_alerts table with farmer_id and owner_id columns for visibility';
