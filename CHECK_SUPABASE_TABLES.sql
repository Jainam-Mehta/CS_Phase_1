-- ============================================================================
-- CHECK SUPABASE SCHEMA FOR MQTT DATA STORAGE
-- ============================================================================
-- Run this in Supabase SQL Editor to verify tables exist

-- Check if cold_storage_conditions table exists and has data
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('cold_storage_conditions', 'sensor_devices', 'sites', 'cold_storage_rooms')
ORDER BY table_name, ordinal_position;

-- ============================================================================

-- Count records in key tables
SELECT 
  'sites' as table_name, COUNT(*) as record_count FROM public.sites
UNION ALL
SELECT 'cold_storage_rooms', COUNT(*) FROM public.cold_storage_rooms
UNION ALL
SELECT 'sensor_devices', COUNT(*) FROM public.sensor_devices
UNION ALL
SELECT 'cold_storage_conditions', COUNT(*) FROM public.cold_storage_conditions;

-- ============================================================================

-- View latest cold_storage_conditions (if any data exists)
SELECT 
  id,
  site_id,
  room_id,
  temperature,
  humidity,
  door_status,
  energy_consumption_kwh,
  recorded_at,
  created_at
FROM public.cold_storage_conditions
ORDER BY recorded_at DESC
LIMIT 5;

-- ============================================================================

-- View sensor_devices (to understand what sensors are configured)
SELECT 
  sd.id,
  sd.site_id,
  sd.room_id,
  sd.sensor_type,
  sd.sensor_code,
  sd.status,
  sd.last_reading_value,
  sd.last_reading_unit,
  sd.last_seen,
  sd.created_at
FROM public.sensor_devices sd
ORDER BY sd.created_at DESC
LIMIT 10;

-- ============================================================================

-- View all sites and their rooms
SELECT 
  s.id as site_id,
  s.facility_name,
  s.owner_profile_id,
  COUNT(r.id) as num_rooms,
  ARRAY_AGG(r.id) as room_ids
FROM public.sites s
LEFT JOIN public.cold_storage_rooms r ON s.id = r.site_id
GROUP BY s.id, s.facility_name, s.owner_profile_id
ORDER BY s.created_at DESC;
