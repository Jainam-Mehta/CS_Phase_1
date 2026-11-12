-- ============================================================================
-- MIGRATION 003: Add farmer_payment_history table for payment audit trail
-- ============================================================================
-- Date: 2026-11-02
-- Purpose: Track all payments made by farmers to owners
--          Enables insights/alerts on payment history
--          Workflow: On payment, record inserted here, then farmer_daily_storage_costs rows deleted
-- Deployment: Supabase SQL Editor or psql
-- ============================================================================

-- Create farmer_payment_history table
CREATE TABLE IF NOT EXISTS public.farmer_payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  
  -- Payment Period Details
  period_start_date date NOT NULL,
  period_end_date date NOT NULL,
  
  -- Summary Statistics
  total_daily_entries integer NOT NULL,
  total_crates_stored numeric(12, 2),
  total_quantity_kg numeric(12, 2),
  
  -- Payment Amount
  amount_paid numeric(14, 2) NOT NULL,
  
  -- Payment Metadata
  payment_date timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_received_by_owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  payment_method character varying(50),
  transaction_id character varying(100),
  remarks text,
  
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT amount_positive CHECK (amount_paid > 0)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_farmer 
  ON public.farmer_payment_history(farmer_id);

CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_owner 
  ON public.farmer_payment_history(owner_id);

CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_room 
  ON public.farmer_payment_history(room_id);

CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_site 
  ON public.farmer_payment_history(site_id);

CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_payment_date 
  ON public.farmer_payment_history(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_payment_history_period 
  ON public.farmer_payment_history(farmer_id, room_id, period_end_date DESC);

-- ============================================================================
-- WORKFLOW DOCUMENTATION
-- ============================================================================
-- 
-- Daily Calculation (12:00 AM):
-- ==============================
-- 1. Query active crates from batch_room_allocations (WHERE removed_at IS NULL)
-- 2. Get current price from room_pricing (WHERE effective_from <= TODAY)
-- 3. Calculate: daily_cost = crates × price
-- 4. Get yesterday's cumulative_cost from farmer_daily_storage_costs
-- 5. Upsert into farmer_daily_storage_costs:
--    - daily_crate_count = current crates
--    - price_per_crate = current price
--    - daily_cost = crates × price
--    - cumulative_cost = yesterday_cumulative + daily_cost
--    - payment_status = 'unpaid'
--
-- Payment Recording (Owner marks payment complete):
-- ==================================================
-- Example: Farmer A pays ₹6700 for Nov 1-5
--
-- Step 1: Collect data from farmer_daily_storage_costs
--   SELECT SUM(cumulative_cost), SUM(daily_crate_count), COUNT(*), MIN(cost_date), MAX(cost_date)
--   FROM farmer_daily_storage_costs
--   WHERE farmer_id = 'farmer-uuid' AND room_id = 'room-uuid'
--
-- Step 2: INSERT payment record into farmer_payment_history
--   INSERT INTO farmer_payment_history (
--     farmer_id, owner_id, room_id, site_id,
--     period_start_date, period_end_date,
--     total_daily_entries, total_crates_stored, total_quantity_kg,
--     amount_paid, payment_received_by_owner_id, payment_method, transaction_id
--   ) VALUES (
--     'farmer-uuid', 'owner-uuid', 'room-uuid', 'site-uuid',
--     '2026-11-01', '2026-11-05',
--     5, 70, 1750,
--     6700, 'owner-uuid', 'bank_transfer', 'TXN-12345'
--   );
--
-- Step 3: DELETE daily entries (reset for next period)
--   DELETE FROM farmer_daily_storage_costs
--   WHERE farmer_id = 'farmer-uuid' AND room_id = 'room-uuid';
--
-- Result: farmer_daily_storage_costs is now empty for this farmer-room
--         Next day's calculation starts fresh with cumulative_cost = 0
--
-- Query Examples for Insights/Alerts:
-- ====================================
--
-- 1. Farmer View: How much do I owe?
--    SELECT SUM(cumulative_cost) AS amount_owed
--    FROM farmer_daily_storage_costs
--    WHERE farmer_id = 'farmer-uuid' AND payment_status = 'unpaid'
--
-- 2. Farmer View: Payment history
--    SELECT period_start_date, period_end_date, amount_paid, payment_date, payment_method
--    FROM farmer_payment_history
--    WHERE farmer_id = 'farmer-uuid'
--    ORDER BY payment_date DESC
--
-- 3. Owner View: Which farmers owe money?
--    SELECT 
--      f.farmer_id, 
--      p.full_name AS farmer_name,
--      f.room_id,
--      r.room_name,
--      SUM(f.cumulative_cost) AS total_owed
--    FROM farmer_daily_storage_costs f
--    JOIN profiles p ON f.farmer_id = p.id
--    JOIN cold_storage_rooms r ON f.room_id = r.id
--    WHERE f.payment_status = 'unpaid'
--      AND r.site_id = 'site-uuid'
--    GROUP BY f.farmer_id, p.full_name, f.room_id, r.room_name
--    ORDER BY total_owed DESC
--
-- 4. Owner View: Payment history for all farmers at site
--    SELECT 
--      fph.farmer_id,
--      p.full_name AS farmer_name,
--      fph.period_start_date,
--      fph.period_end_date,
--      fph.amount_paid,
--      fph.payment_date,
--      fph.payment_method,
--      fph.transaction_id
--    FROM farmer_payment_history fph
--    JOIN profiles p ON fph.farmer_id = p.id
--    WHERE fph.site_id = 'site-uuid'
--    ORDER BY fph.payment_date DESC
--
-- 5. Insights Alert: Recently paid farmers
--    SELECT 
--      p.full_name AS farmer_name,
--      fph.amount_paid,
--      fph.payment_date
--    FROM farmer_payment_history fph
--    JOIN profiles p ON fph.farmer_id = p.id
--    WHERE fph.site_id = 'site-uuid'
--      AND fph.payment_date >= NOW() - INTERVAL '7 days'
--    ORDER BY fph.payment_date DESC
--
-- ============================================================================

