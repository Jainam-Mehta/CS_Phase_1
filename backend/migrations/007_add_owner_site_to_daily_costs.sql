-- ============================================================================
-- Migration 007: Add owner_id and site_id to farmer_daily_storage_costs
-- Purpose: Enable filtering by owner, and make payment recording easier
-- ============================================================================

-- Step 1: Add missing foreign keys to farmer_daily_storage_costs
ALTER TABLE public.farmer_daily_storage_costs
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Step 2: Populate site_id from room_id for existing records
UPDATE public.farmer_daily_storage_costs fdsc
SET site_id = csr.site_id
FROM public.cold_storage_rooms csr
WHERE fdsc.room_id = csr.id AND fdsc.site_id IS NULL;

-- Step 3: Populate owner_id from site for existing records
UPDATE public.farmer_daily_storage_costs fdsc
SET owner_id = s.owner_profile_id
FROM public.sites s
WHERE fdsc.site_id = s.id AND fdsc.owner_id IS NULL;

-- Step 4: Make the new columns NOT NULL for consistency
ALTER TABLE public.farmer_daily_storage_costs
ALTER COLUMN site_id SET NOT NULL,
ALTER COLUMN owner_id SET NOT NULL;

-- Step 5: Add indexes for efficient filtering by owner
CREATE INDEX IF NOT EXISTS idx_farmer_daily_costs_owner 
  ON public.farmer_daily_storage_costs(owner_id);

CREATE INDEX IF NOT EXISTS idx_farmer_daily_costs_site 
  ON public.farmer_daily_storage_costs(site_id);

CREATE INDEX IF NOT EXISTS idx_farmer_daily_costs_owner_status 
  ON public.farmer_daily_storage_costs(owner_id, payment_status);

-- Step 6: Add composite index for fast owner+farmer lookup
CREATE INDEX IF NOT EXISTS idx_farmer_daily_costs_owner_farmer_status 
  ON public.farmer_daily_storage_costs(owner_id, farmer_id, payment_status);

-- Step 7: Verify the changes
-- SELECT COUNT(*), payment_status FROM farmer_daily_storage_costs 
-- WHERE site_id IS NOT NULL AND owner_id IS NOT NULL 
-- GROUP BY payment_status;
