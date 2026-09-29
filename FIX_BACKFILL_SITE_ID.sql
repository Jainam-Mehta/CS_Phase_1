-- ============================================================================
-- FIX: Backfill site_id in cold_storage_conditions
-- ============================================================================
-- The previous backfill may have failed. Let's do it again with debugging.

-- Step 1: Check current state
SELECT 
  COUNT(*) as total_records,
  COUNT(site_id) as records_with_site_id,
  COUNT(room_id) as records_with_room_id
FROM public.cold_storage_conditions;

-- ============================================================================

-- Step 2: Debug - show sample records and their matching rooms
SELECT 
  csc.id,
  csc.room_id,
  csc.site_id as current_site_id,
  csr.id as matching_room_id,
  csr.site_id as room_site_id
FROM public.cold_storage_conditions csc
LEFT JOIN public.cold_storage_rooms csr ON csc.room_id = csr.id
LIMIT 5;

-- ============================================================================

-- Step 3: Backfill with explicit WHERE clause
UPDATE public.cold_storage_conditions
SET site_id = (
  SELECT csr.site_id 
  FROM public.cold_storage_rooms csr
  WHERE csr.id = cold_storage_conditions.room_id
)
WHERE site_id IS NULL
  AND room_id IS NOT NULL;

-- ============================================================================

-- Step 4: Verify backfill worked
SELECT 
  COUNT(*) as total_records,
  COUNT(site_id) as records_with_site_id,
  COUNT(CASE WHEN site_id IS NULL THEN 1 END) as records_without_site_id
FROM public.cold_storage_conditions;

-- ============================================================================

-- Step 5: Show sample of updated records
SELECT 
  id,
  site_id,
  room_id,
  temperature,
  humidity,
  recorded_at
FROM public.cold_storage_conditions
WHERE site_id IS NOT NULL
ORDER BY recorded_at DESC
LIMIT 5;

-- ============================================================================

-- Step 6: If there are still NULL site_ids, find orphaned room_ids
SELECT 
  COUNT(*) as orphaned_records,
  COUNT(DISTINCT room_id) as unique_room_ids
FROM public.cold_storage_conditions
WHERE site_id IS NULL AND room_id IS NOT NULL;

-- Show which room_ids don't exist in cold_storage_rooms
SELECT DISTINCT csc.room_id
FROM public.cold_storage_conditions csc
WHERE csc.site_id IS NULL
  AND csc.room_id NOT IN (SELECT id FROM public.cold_storage_rooms);
