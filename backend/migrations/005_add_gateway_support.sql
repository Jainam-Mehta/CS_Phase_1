-- Migration 005: Add gateway support to MQTT architecture
-- Adds gateway_id and sensor_name columns to track multi-gateway deployments

BEGIN;

-- 1. Add gateway_id to sensor_devices table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_devices' AND column_name = 'gateway_id'
    ) THEN
        ALTER TABLE public.sensor_devices 
        ADD COLUMN gateway_id TEXT DEFAULT 'gateway1';
        CREATE INDEX idx_sensor_devices_gateway_id ON public.sensor_devices(gateway_id);
    END IF;
END $$;

-- 2. Add sensor_name to sensor_devices table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_devices' AND column_name = 'sensor_name'
    ) THEN
        ALTER TABLE public.sensor_devices 
        ADD COLUMN sensor_name TEXT;
        CREATE INDEX idx_sensor_devices_sensor_name ON public.sensor_devices(sensor_name);
    END IF;
END $$;

-- 3. Add gateway_id to cold_storage_conditions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cold_storage_conditions' AND column_name = 'gateway_id'
    ) THEN
        ALTER TABLE public.cold_storage_conditions 
        ADD COLUMN gateway_id TEXT DEFAULT 'gateway1';
        CREATE INDEX idx_conditions_gateway_id ON public.cold_storage_conditions(gateway_id);
    END IF;
END $$;

-- 4. Add gateway_id to sensor_readings table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sensor_readings' AND column_name = 'gateway_id'
    ) THEN
        ALTER TABLE public.sensor_readings 
        ADD COLUMN gateway_id TEXT DEFAULT 'gateway1';
        CREATE INDEX idx_sensor_readings_gateway_id ON public.sensor_readings(gateway_id);
    END IF;
END $$;

-- 5. Create gateways table for tracking gateway status (optional but useful)
CREATE TABLE IF NOT EXISTS public.gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  gateway_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('online', 'offline')) DEFAULT 'online',
  last_heartbeat TIMESTAMPTZ,
  ip_address INET,
  firmware_version TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, gateway_id)
);

CREATE INDEX IF NOT EXISTS idx_gateways_site_id ON public.gateways(site_id);
CREATE INDEX IF NOT EXISTS idx_gateways_gateway_id ON public.gateways(gateway_id);
CREATE INDEX IF NOT EXISTS idx_gateways_last_heartbeat ON public.gateways(last_heartbeat);

COMMIT;
