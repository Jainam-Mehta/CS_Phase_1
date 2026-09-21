-- ============================================================================
-- COMPLETE DATABASE RESET - FRESH START
-- ============================================================================
-- This script completely resets the database to a clean state
-- WARNING: This deletes ALL data. Use only for local testing/dev environments.
-- ============================================================================

-- Step 1: DROP ALL VIEWS
DROP VIEW IF EXISTS public.maintenance_overview CASCADE;
DROP VIEW IF EXISTS public.active_alerts_summary CASCADE;
DROP VIEW IF EXISTS public.facility_health_summary CASCADE;
DROP VIEW IF EXISTS public.facility_capacity_view CASCADE;

-- Step 2: DISABLE ALL RLS POLICIES (drop them all)
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Step 3: DROP ALL TABLES (in dependency order)
DROP TABLE IF EXISTS public.maintenance_overview CASCADE;
DROP TABLE IF EXISTS public.stakeholder_interest CASCADE;
DROP TABLE IF EXISTS public.stakeholder_investments CASCADE;
DROP TABLE IF EXISTS public.carbon_credits CASCADE;
DROP TABLE IF EXISTS public.energy_consumption CASCADE;
DROP TABLE IF EXISTS public.farmer_payments CASCADE;
DROP TABLE IF EXISTS public.facility_expenses CASCADE;
DROP TABLE IF EXISTS public.facility_maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.facility_maintenance CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.alerts CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.weather_history CASCADE;
DROP TABLE IF EXISTS public.sensor_readings CASCADE;
DROP TABLE IF EXISTS public.sensor_devices CASCADE;
DROP TABLE IF EXISTS public.cold_storage_rooms CASCADE;
DROP TABLE IF EXISTS public.sites CASCADE;
DROP TABLE IF EXISTS public.facilities CASCADE;
DROP TABLE IF EXISTS public.districts CASCADE;
DROP TABLE IF EXISTS public.states CASCADE;
DROP TABLE IF EXISTS public.localities CASCADE;
DROP TABLE IF EXISTS public.owner_companies CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- CREATE FRESH SCHEMA
-- ============================================================================

-- Geographic tables
CREATE TABLE public.states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.districts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id uuid NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(state_id, name)
);

CREATE TABLE public.localities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
    name text NOT NULL,
    pincode text,
    latitude decimal,
    longitude decimal,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(district_id, name)
);

-- Profiles & Companies
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE,
    full_name text,
    role text CHECK (role IN ('owner', 'farmer', 'stakeholder')),
    phone text,
    owner_company_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.owner_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name text NOT NULL,
    contact_email text,
    phone text,
    address text,
    city text,
    district text,
    state text,
    country text,
    created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key after profiles table exists
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_owner_company_id_fkey
FOREIGN KEY (owner_company_id) REFERENCES public.owner_companies(id) ON DELETE SET NULL;

-- ============================================================================
-- SITES & ROOMS (NEW MULTI-ROOM SCHEMA - NO facility_id!)
-- ============================================================================

CREATE TABLE public.sites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    facility_name text NOT NULL,
    address text,
    state_id uuid REFERENCES public.states(id) ON DELETE SET NULL,
    district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
    locality_id uuid REFERENCES public.localities(id) ON DELETE SET NULL,
    latitude decimal,
    longitude decimal,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.cold_storage_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    room_code text NOT NULL,
    capacity_kg numeric NOT NULL DEFAULT 0,
    current_utilization_kg numeric NOT NULL DEFAULT 0,
    status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(site_id, room_code)
);

-- ============================================================================
-- SENSOR & MONITORING TABLES (NO facility_id - use site_id!)
-- ============================================================================

CREATE TABLE public.sensor_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid NOT NULL REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
    sensor_type text NOT NULL CHECK (sensor_type IN ('temperature', 'humidity', 'pressure', 'co2', 'oxygen')),
    sensor_code text NOT NULL,
    status text DEFAULT 'Online' CHECK (status IN ('Online', 'Offline', 'Maintenance')),
    last_reading timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(room_id, sensor_code)
);

CREATE TABLE public.sensor_readings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id uuid NOT NULL REFERENCES public.sensor_devices(id) ON DELETE CASCADE,
    temperature_c numeric,
    humidity_percent numeric,
    pressure_hpa numeric,
    co2_ppm numeric,
    oxygen_percent numeric,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    room_id uuid REFERENCES public.cold_storage_rooms(id) ON DELETE SET NULL,
    alert_type text NOT NULL,
    severity text CHECK (severity IN ('critical', 'warning', 'info')),
    status text DEFAULT 'unresolved' CHECK (status IN ('resolved', 'unresolved', 'acknowledged')),
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.weather_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    temperature_c numeric,
    humidity_percent numeric,
    rainfall_mm numeric,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text,
    details text,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- INVENTORY & STORAGE TABLES (NO facility_id!)
-- ============================================================================

CREATE TABLE public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    category text,
    amount numeric,
    description text,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.facility_maintenance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    maintenance_type text,
    description text,
    scheduled_date timestamp with time zone,
    completed_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.facility_maintenance_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    maintenance_id uuid REFERENCES public.facility_maintenance(id) ON DELETE SET NULL,
    log_entry text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.facility_expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    expense_type text,
    amount numeric,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.farmer_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    farmer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount numeric,
    payment_date timestamp with time zone,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.carbon_credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    credits numeric,
    issue_date timestamp with time zone,
    expiry_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.energy_consumption (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    kwh numeric,
    recorded_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- STAKEHOLDER & INVESTMENT TABLES (NO facility_id!)
-- ============================================================================

CREATE TABLE public.stakeholder_investments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    stakeholder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    investment_amount numeric,
    investment_date timestamp with time zone,
    roi_percentage numeric,
    status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.stakeholder_interest (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    stakeholder_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    interest_percentage numeric,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================================================
-- CREATE VIEWS
-- ============================================================================

CREATE VIEW public.facility_capacity_view AS
SELECT 
    sr.site_id,
    s.facility_name as site_name,
    s.owner_profile_id,
    COUNT(sr.id) as total_rooms,
    SUM(sr.capacity_kg) as total_capacity_kg,
    SUM(sr.current_utilization_kg) as current_utilization_kg,
    ROUND((SUM(sr.current_utilization_kg)::NUMERIC / NULLIF(SUM(sr.capacity_kg), 0) * 100)::NUMERIC, 2) as utilization_percentage
FROM public.cold_storage_rooms sr
LEFT JOIN public.sites s ON sr.site_id = s.id
WHERE sr.site_id IS NOT NULL
GROUP BY sr.site_id, s.facility_name, s.owner_profile_id;

CREATE VIEW public.facility_health_summary AS
SELECT 
    s.id as site_id,
    s.facility_name as site_name,
    COUNT(DISTINCT sr.id) as total_rooms,
    COUNT(DISTINCT sd.id) as total_sensors,
    SUM(CASE WHEN sd.status = 'Online' THEN 1 ELSE 0 END) as online_sensors,
    SUM(CASE WHEN sd.status = 'Offline' THEN 1 ELSE 0 END) as offline_sensors,
    SUM(CASE WHEN sd.status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance_sensors,
    ROUND(AVG(CASE WHEN sr.current_utilization_kg > 0 THEN (sr.current_utilization_kg::NUMERIC / NULLIF(sr.capacity_kg, 0) * 100) ELSE 0 END)::NUMERIC, 2) as avg_room_utilization
FROM public.sites s
LEFT JOIN public.cold_storage_rooms sr ON s.id = sr.site_id
LEFT JOIN public.sensor_devices sd ON sr.id = sd.room_id
GROUP BY s.id, s.facility_name;

CREATE VIEW public.active_alerts_summary AS
SELECT 
    s.id as site_id,
    s.facility_name as site_name,
    COUNT(CASE WHEN a.severity = 'critical' AND a.status = 'unresolved' THEN 1 END) as critical_unresolved,
    COUNT(CASE WHEN a.severity = 'warning' AND a.status = 'unresolved' THEN 1 END) as warning_unresolved,
    COUNT(CASE WHEN a.status = 'unresolved' THEN 1 END) as total_unresolved,
    MAX(a.created_at) as latest_alert_time
FROM public.sites s
LEFT JOIN public.cold_storage_rooms sr ON s.id = sr.site_id
LEFT JOIN public.alerts a ON sr.id = a.room_id
GROUP BY s.id, s.facility_name;

-- ============================================================================
-- ENABLE RLS (Row Level Security)
-- ============================================================================

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_storage_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

-- Owners can view their sites
CREATE POLICY "Owners can view their sites"
ON public.sites FOR SELECT
USING (owner_profile_id = auth.uid()::uuid);

-- Owners can insert sites
CREATE POLICY "Owners can insert sites"
ON public.sites FOR INSERT
WITH CHECK (owner_profile_id = auth.uid()::uuid);

-- Owners can update their sites
CREATE POLICY "Owners can update their sites"
ON public.sites FOR UPDATE
USING (owner_profile_id = auth.uid()::uuid);

-- Owners can view their rooms
CREATE POLICY "Owners can view their rooms"
ON public.cold_storage_rooms FOR SELECT
USING (
    site_id IN (
        SELECT id FROM public.sites
        WHERE owner_profile_id = auth.uid()::uuid
    )
);

-- Owners can view their room alerts
CREATE POLICY "Owners can view their room alerts"
ON public.alerts FOR SELECT
USING (
    site_id IN (
        SELECT id FROM public.sites
        WHERE owner_profile_id = auth.uid()::uuid
    )
);

-- ============================================================================
-- FRESH DATABASE READY
-- ============================================================================
-- ✅ All old facility_id references removed
-- ✅ Schema completely fresh - only site_id used
-- ✅ All tables created clean
-- ✅ RLS enabled for security
-- ✅ Ready for testing
-- ============================================================================
