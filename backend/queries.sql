-- Count total records in market_prices table
SELECT COUNT(*) as total_records FROM public.market_prices;

-- Count records by state
SELECT state, COUNT(*) as record_count FROM public.market_prices GROUP BY state ORDER BY state;

-- Count distinct products
SELECT COUNT(DISTINCT market_name) as distinct_markets FROM public.market_prices;

-- Count distinct cities/localities
SELECT COUNT(DISTINCT city) as distinct_cities FROM public.market_prices;


-- ============================================================================
-- DELETE SITE AND CASCADE ALL RELATED DATA
-- ============================================================================
-- This will delete: sites → cold_storage_rooms → sensor_devices → all related data

-- Step 1: Delete the site (cascades to all dependent tables)
DELETE FROM public.sites 
WHERE facility_name = 'MHMUMSO06' OR site_code = 'MHMUMSO06';

-- Step 2: Verify deletion
SELECT 'Sites count after deletion:' as status, COUNT(*) as count FROM public.sites;
SELECT 'Sensors count after deletion:' as status, COUNT(*) as count FROM public.sensor_devices;
SELECT 'Rooms count after deletion:' as status, COUNT(*) as count FROM public.cold_storage_rooms;
