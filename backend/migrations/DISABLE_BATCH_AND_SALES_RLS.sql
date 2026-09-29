-- Disable RLS on batch-related and sales tables to fix Owner queries
-- These tables need to be readable by owners via room associations

BEGIN;

-- Disable on batch_room_allocations
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batch_room_allocations' AND table_schema = 'public') THEN
    ALTER TABLE public.batch_room_allocations DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on batches
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'batches' AND table_schema = 'public') THEN
    ALTER TABLE public.batches DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on sales
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales' AND table_schema = 'public') THEN
    ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on products
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
    ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on stakeholder_investments
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stakeholder_investments' AND table_schema = 'public') THEN
    ALTER TABLE public.stakeholder_investments DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on energy_consumption
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'energy_consumption' AND table_schema = 'public') THEN
    ALTER TABLE public.energy_consumption DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on farmer_activity_logs
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farmer_activity_logs' AND table_schema = 'public') THEN
    ALTER TABLE public.farmer_activity_logs DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on farmer_products
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farmer_products' AND table_schema = 'public') THEN
    ALTER TABLE public.farmer_products DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Disable on farmer_room_access
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'farmer_room_access' AND table_schema = 'public') THEN
    ALTER TABLE public.farmer_room_access DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

COMMIT;
