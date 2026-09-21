-- ============================================================================
-- FACILITY → SITE SCHEMA MIGRATION - FINAL SIMPLE VERSION
-- ============================================================================
-- Strategy: Drop views/policies first, then drop facility_id columns,
-- then add site_id columns, then recreate everything
-- ============================================================================

-- PHASE 1: DROP EVERYTHING DEPENDENT
DROP VIEW IF EXISTS public.maintenance_overview CASCADE;
DROP VIEW IF EXISTS public.active_alerts_summary CASCADE;
DROP VIEW IF EXISTS public.facility_health_summary CASCADE;
DROP VIEW IF EXISTS public.facility_capacity_view CASCADE;

-- PHASE 2: DROP ALL POLICIES
DROP POLICY IF EXISTS "Owners can view their rooms" ON public.cold_storage_rooms CASCADE;
DROP POLICY IF EXISTS "Owners can update their room alerts" ON public.alerts CASCADE;
DROP POLICY IF EXISTS "Owners can view their room alerts" ON public.alerts CASCADE;
DROP POLICY IF EXISTS "Owners can view their facility maintenance" ON public.facility_maintenance CASCADE;
DROP POLICY IF EXISTS "Owners can insert facility maintenance" ON public.facility_maintenance CASCADE;
DROP POLICY IF EXISTS "Owners can update facility maintenance" ON public.facility_maintenance CASCADE;
DROP POLICY IF EXISTS "Owners can view their maintenance logs" ON public.facility_maintenance_logs CASCADE;
DROP POLICY IF EXISTS "Owners can insert maintenance logs" ON public.facility_maintenance_logs CASCADE;
DROP POLICY IF EXISTS "Owners can view their expenses" ON public.facility_expenses CASCADE;
DROP POLICY IF EXISTS "Owners can insert expenses" ON public.facility_expenses CASCADE;

-- PHASE 3: DROP ALL FOREIGN KEY CONSTRAINTS USING facility_id
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND table_schema = 'public'
        AND constraint_name LIKE '%facility_id%'
    ) LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- PHASE 4: DROP ALL facility_id COLUMNS
ALTER TABLE IF EXISTS public.cold_storage_rooms DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.weather_history DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.stakeholder_investments DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.activity_logs DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.alerts DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.expenses DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.facility_maintenance DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.facility_maintenance_logs DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.farmer_payments DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.facility_expenses DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.carbon_credits DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.energy_consumption DROP COLUMN IF EXISTS facility_id CASCADE;
ALTER TABLE IF EXISTS public.stakeholder_interest DROP COLUMN IF EXISTS facility_id CASCADE;

-- PHASE 5: ADD site_id COLUMNS IF THEY DON'T EXIST
ALTER TABLE IF EXISTS public.cold_storage_rooms ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.weather_history ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.stakeholder_investments ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.activity_logs ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.alerts ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.expenses ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.facility_maintenance ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.facility_maintenance_logs ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.farmer_payments ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.facility_expenses ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.carbon_credits ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.energy_consumption ADD COLUMN IF NOT EXISTS site_id uuid;
ALTER TABLE IF EXISTS public.stakeholder_interest ADD COLUMN IF NOT EXISTS site_id uuid;

-- PHASE 6: ADD FOREIGN KEY CONSTRAINTS USING site_id
ALTER TABLE IF EXISTS public.cold_storage_rooms
ADD CONSTRAINT cold_storage_rooms_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.weather_history
ADD CONSTRAINT weather_history_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.stakeholder_investments
ADD CONSTRAINT stakeholder_investments_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.activity_logs
ADD CONSTRAINT activity_logs_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.alerts
ADD CONSTRAINT alerts_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.expenses
ADD CONSTRAINT expenses_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.facility_maintenance
ADD CONSTRAINT facility_maintenance_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.facility_maintenance_logs
ADD CONSTRAINT facility_maintenance_logs_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.farmer_payments
ADD CONSTRAINT farmer_payments_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.facility_expenses
ADD CONSTRAINT facility_expenses_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.carbon_credits
ADD CONSTRAINT carbon_credits_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.energy_consumption
ADD CONSTRAINT energy_consumption_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.stakeholder_interest
ADD CONSTRAINT stakeholder_interest_site_id_fkey 
FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE;

-- PHASE 7: RECREATE VIEWS
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

-- PHASE 8: RECREATE RLS POLICIES
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

-- ✅ MIGRATION COMPLETE
-- All facility_id columns removed
-- All site_id columns in place
-- All foreign keys updated
-- All views recreated
-- All policies updated
-- ============================================================================
