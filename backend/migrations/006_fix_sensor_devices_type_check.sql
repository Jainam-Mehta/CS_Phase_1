-- Migration: 006_fix_sensor_devices_type_check.sql
-- Purpose: Drop/Update restrictive check constraint on sensor_devices.sensor_type
-- to allow all sensor types from SENSOR_REGISTRY (temperature, humidity, oxygen, co2, pressure, door, motion, solar, battery, etc.)

BEGIN;

-- Drop existing restrictive check constraint if present
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'sensor_devices_sensor_type_check' 
      AND conrelid = 'public.sensor_devices'::regclass
  ) THEN
    ALTER TABLE public.sensor_devices DROP CONSTRAINT sensor_devices_sensor_type_check;
  END IF;
END $$;

-- Disable RLS on sensor_devices, cold_storage_rooms, sites, owner_companies, profiles if enabled
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'owner_companies' AND table_schema = 'public') THEN
    ALTER TABLE public.owner_companies DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sites' AND table_schema = 'public') THEN
    ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cold_storage_rooms' AND table_schema = 'public') THEN
    ALTER TABLE public.cold_storage_rooms DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensor_devices' AND table_schema = 'public') THEN
    ALTER TABLE public.sensor_devices DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;
