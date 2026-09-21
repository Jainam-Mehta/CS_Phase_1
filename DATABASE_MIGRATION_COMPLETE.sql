-- ============================================================================
-- FACILITY → SITE SCHEMA MIGRATION - COMPLETE VERSION
-- ============================================================================
-- This migration:
-- 1. Renames facilities table to sites
-- 2. Renames facility_id column to site_id in ALL dependent tables
-- 3. Updates all foreign key constraints
-- 4. Updates all views and policies
-- ============================================================================
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS!
-- ============================================================================

-- Step 1: Drop dependent views first (to avoid constraint errors)
DROP VIEW IF EXISTS public.active_alerts_summary CASCADE;
DROP VIEW IF EXISTS public.facility_health_summary CASCADE;
DROP VIEW IF EXISTS public.facility_capacity_view CASCADE;

-- Step 2: Rename facilities table to sites
ALTER TABLE public.facilities RENAME TO sites;

-- Step 3: Rename facility_id to site_id in cold_storage_rooms
ALTER TABLE public.cold_storage_rooms RENAME COLUMN facility_id TO site_id;

-- Step 4: Rename facility_id to site_id in stakeholder_investments
ALTER TABLE public.stakeholder_investments RENAME COLUMN facility_id TO site_id;

-- Step 5: Rename facility_id to site_id in activity_logs
ALTER TABLE public.activity_logs RENAME COLUMN facility_id TO site_id;

-- Step 6: Rename facility_id to site_id in alerts
ALTER TABLE public.alerts RENAME COLUMN facility_id TO site_id;

-- Step 7: Rename facility_id to site_id in expenses
ALTER TABLE public.expenses RENAME COLUMN facility_id TO site_id;

-- Step 8: Update foreign key constraints
-- (Already automatically updated by PostgreSQL during column rename)

-- Step 9: Recreate views with new column names
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

-- Step 10: Update RLS (Row Level Security) policies
-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view their rooms" ON public.cold_storage_rooms;
DROP POLICY IF EXISTS "Owners can update their room alerts" ON public.alerts;
DROP POLICY IF EXISTS "Owners can view their room alerts" ON public.alerts;

-- Recreate policies with site_id references
CREATE POLICY "Owners can view their rooms"
ON public.cold_storage_rooms FOR SELECT
USING (
    site_id IN (
        SELECT id FROM public.sites
        WHERE owner_profile_id = auth.uid()::uuid
    )
);

CREATE POLICY "Owners can view their room alerts"
ON public.alerts FOR SELECT
USING (
    site_id IN (
        SELECT id FROM public.sites
        WHERE owner_profile_id = auth.uid()::uuid
    )
);

CREATE POLICY "Owners can update their room alerts"
ON public.alerts FOR UPDATE
USING (
    site_id IN (
        SELECT id FROM public.sites
        WHERE owner_profile_id = auth.uid()::uuid
    )
);

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to confirm success)
-- ============================================================================
-- Run these to verify the migration worked:
-- 
-- SELECT COUNT(*) as total_sites FROM public.sites;
-- SELECT COUNT(*) as total_rooms FROM public.cold_storage_rooms;
-- SELECT * FROM information_schema.columns 
--   WHERE table_name = 'cold_storage_rooms' AND column_name LIKE '%site%';
-- SELECT * FROM information_schema.columns 
--   WHERE table_name = 'stakeholder_investments' AND column_name LIKE '%site%';
-- SELECT * FROM information_schema.columns 
--   WHERE table_name = 'activity_logs' AND column_name LIKE '%site%';
-- SELECT * FROM information_schema.columns 
--   WHERE table_name = 'alerts' AND column_name LIKE '%site%';
-- SELECT * FROM information_schema.columns 
--   WHERE table_name = 'expenses' AND column_name LIKE '%site%';
-- ============================================================================

-- ============================================================================
-- COMPLETION
-- ============================================================================
-- ✅ All tables renamed
-- ✅ All columns renamed (facility_id → site_id)
-- ✅ All views updated
-- ✅ All RLS policies updated
-- ✅ All data preserved
-- ✅ Database is now ready for updated backend/frontend code
-- ============================================================================
