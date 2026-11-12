-- Migration: Add inventory value tracking to farmer portfolio with PostgreSQL triggers
-- Description: Track accumulated "When Stored" and "Current Market Value" across all batches
-- No backend script needed - all logic in database triggers

-- Add columns to FARMER_MULTI_ROOM_SUMMARY to track inventory net worth
ALTER TABLE public.farmer_multi_room_summary
ADD COLUMN inventory_value_when_stored numeric(14, 2) DEFAULT 0,  -- Accumulated snapshot value (when items were stored)
ADD COLUMN inventory_value_current_market numeric(14, 2) DEFAULT 0;  -- Accumulated current market value

-- Create indexes for fast lookups
CREATE INDEX idx_farmer_multi_summary_inventory_value ON public.farmer_multi_room_summary(inventory_value_when_stored, inventory_value_current_market);

-- Create table to track net worth per farmer (latest snapshot - one row per farmer)
CREATE TABLE IF NOT EXISTS public.farmer_inventory_net_worth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Accumulated values from all active batches
  total_inventory_value_when_stored numeric(14, 2) DEFAULT 0,    -- Sum of (initial_quantity_kg * snapshot_price_per_kg) for all batches
  total_inventory_value_current_market numeric(14, 2) DEFAULT 0,  -- Sum of (initial_quantity_kg * current_market_price) for all batches
  
  -- Metadata
  total_active_batches integer DEFAULT 0,                         -- Count of batches with remaining_quantity_kg > 0
  total_crates_in_storage integer DEFAULT 0,                      -- Total remaining crates across all batches
  total_quantity_kg numeric(12, 2) DEFAULT 0,                     -- Total remaining kg across all batches
  
  last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for net worth lookups
CREATE INDEX idx_farmer_net_worth_farmer ON public.farmer_inventory_net_worth(farmer_id);
CREATE INDEX idx_farmer_net_worth_value ON public.farmer_inventory_net_worth(total_inventory_value_when_stored, total_inventory_value_current_market);
CREATE INDEX idx_farmer_net_worth_updated ON public.farmer_inventory_net_worth(last_updated DESC);

-- ============================================================================
-- TRIGGER: Update farmer_inventory_net_worth when batch is created or removed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_farmer_net_worth_on_batch_change()
RETURNS TRIGGER AS $$
DECLARE
  farmer_id_var uuid;
  total_when_stored numeric(14, 2);
  total_crates numeric;
  total_kg numeric(12, 2);
  batch_count integer;
BEGIN
  -- Determine which farmer and which batch_id
  IF TG_OP = 'INSERT' THEN
    farmer_id_var := NEW.farmer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    farmer_id_var := NEW.farmer_id;
  ELSIF TG_OP = 'DELETE' THEN
    farmer_id_var := OLD.farmer_id;
  END IF;

  -- Recalculate totals for this farmer across all active batches
  SELECT
    COALESCE(SUM(initial_quantity_kg * snapshot_price_per_kg), 0),
    COALESCE(SUM(initial_quantity_kg / 25), 0),
    COALESCE(SUM(initial_quantity_kg), 0),
    COUNT(*)
  INTO
    total_when_stored,
    total_crates,
    total_kg,
    batch_count
  FROM public.batches
  WHERE farmer_id = farmer_id_var
    AND remaining_quantity_kg > 0;  -- Only active batches

  -- Upsert into farmer_inventory_net_worth
  INSERT INTO public.farmer_inventory_net_worth (
    farmer_id,
    total_inventory_value_when_stored,
    total_active_batches,
    total_crates_in_storage,
    total_quantity_kg,
    last_updated
  )
  VALUES (
    farmer_id_var,
    total_when_stored,
    batch_count,
    COALESCE(total_crates, 0),
    total_kg,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (farmer_id) DO UPDATE SET
    total_inventory_value_when_stored = total_when_stored,
    total_active_batches = batch_count,
    total_crates_in_storage = COALESCE(total_crates, 0),
    total_quantity_kg = total_kg,
    last_updated = CURRENT_TIMESTAMP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on batches table INSERT/UPDATE/DELETE
CREATE TRIGGER trg_batches_update_net_worth
AFTER INSERT OR UPDATE OR DELETE ON public.batches
FOR EACH ROW
EXECUTE FUNCTION public.update_farmer_net_worth_on_batch_change();

-- ============================================================================
-- TRIGGER: Update net worth when batch_room_allocations are removed (soft delete)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_farmer_net_worth_on_allocation_remove()
RETURNS TRIGGER AS $$
DECLARE
  farmer_id_var uuid;
  total_when_stored numeric(14, 2);
  total_crates numeric;
  total_kg numeric(12, 2);
  batch_count integer;
BEGIN
  -- Get farmer from batch
  SELECT farmer_id INTO farmer_id_var
  FROM public.batches
  WHERE id = NEW.batch_id;

  -- Recalculate totals for this farmer
  SELECT
    COALESCE(SUM(initial_quantity_kg * snapshot_price_per_kg), 0),
    COALESCE(SUM(initial_quantity_kg / 25), 0),
    COALESCE(SUM(initial_quantity_kg), 0),
    COUNT(*)
  INTO
    total_when_stored,
    total_crates,
    total_kg,
    batch_count
  FROM public.batches
  WHERE farmer_id = farmer_id_var
    AND remaining_quantity_kg > 0;

  -- Update farmer_inventory_net_worth
  UPDATE public.farmer_inventory_net_worth
  SET
    total_inventory_value_when_stored = total_when_stored,
    total_active_batches = batch_count,
    total_crates_in_storage = COALESCE(total_crates, 0),
    total_quantity_kg = total_kg,
    last_updated = CURRENT_TIMESTAMP
  WHERE farmer_id = farmer_id_var;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger when batch_room_allocations.removed_at is set (soft delete)
CREATE TRIGGER trg_allocations_update_net_worth
AFTER UPDATE ON public.batch_room_allocations
FOR EACH ROW
WHEN (OLD.removed_at IS NULL AND NEW.removed_at IS NOT NULL)
EXECUTE FUNCTION public.update_farmer_net_worth_on_allocation_remove();
