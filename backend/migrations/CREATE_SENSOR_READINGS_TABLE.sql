-- Create sensor_readings table to store MQTT sensor data
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_id TEXT NOT NULL,
  room_id TEXT,
  sensor_id TEXT,
  sensor_name TEXT,
  sensor_value NUMERIC,
  sensor_unit TEXT,
  mqtt_topic TEXT,
  raw_json JSONB,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_sensor_readings_gateway_time 
  ON public.sensor_readings(gateway_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_room_time 
  ON public.sensor_readings(room_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_type 
  ON public.sensor_readings(sensor_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_created_at 
  ON public.sensor_readings(created_at DESC);

-- Disable RLS for development
ALTER TABLE public.sensor_readings DISABLE ROW LEVEL SECURITY;
