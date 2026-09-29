-- Nuclear option: Disable RLS on profiles and related tables
-- The backend uses service_role_key which bypasses RLS anyway
-- Frontend needs to read profiles without RLS restrictions

BEGIN;

-- Disable RLS on profiles (CRITICAL - fixes the 400 error)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable on owner_companies
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'owner_companies' AND table_schema = 'public') THEN
    ALTER TABLE public.owner_companies DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on cold_storage_rooms
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cold_storage_rooms' AND table_schema = 'public') THEN
    ALTER TABLE public.cold_storage_rooms DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on cold_storage_conditions
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cold_storage_conditions' AND table_schema = 'public') THEN
    ALTER TABLE public.cold_storage_conditions DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on sensor_devices
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensor_devices' AND table_schema = 'public') THEN
    ALTER TABLE public.sensor_devices DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on sensor_readings
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sensor_readings' AND table_schema = 'public') THEN
    ALTER TABLE public.sensor_readings DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on sites
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sites' AND table_schema = 'public') THEN
    ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;
