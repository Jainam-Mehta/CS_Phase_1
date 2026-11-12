-- =======================================================================
-- DISABLE RLS ON ALL TABLES FOR DEVELOPMENT
-- =======================================================================
-- WARNING: This enables full access to all tables.
-- Use only in development environments.
-- For production, create proper RLS policies instead.

-- CRITICAL: Drop owner_needs_pincode constraint
-- This constraint prevented owners from signing up without pincode
-- Pincode is now only required when creating a SITE, not during profile signup
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS owner_needs_pincode;

-- Disable RLS on all tables
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.states DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.localities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_storage_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_access_control DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_daily_storage_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_multi_room_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_room_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_access_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cold_storage_rooms_with_access DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_aggregated_costs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers_with_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_operational_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_performance_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_access_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

-- Grant public access to all tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Also enable on auth schema
GRANT SELECT ON auth.users TO anon, authenticated;
