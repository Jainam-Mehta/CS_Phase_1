-- Migration: Verify facilities table has required columns
-- Purpose: Ensure all necessary columns exist for facility management

BEGIN;

-- Add address column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN address VARCHAR(255) DEFAULT 'Location not specified';
        
        COMMENT ON COLUMN public.facilities.address IS 'Facility physical address';
    END IF;
END $$;

-- Add capacity_kg if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'capacity_kg'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN capacity_kg DECIMAL(12, 2) DEFAULT 5000.00;
    END IF;
END $$;

-- Add total_capacity_kg if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'total_capacity_kg'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN total_capacity_kg DECIMAL(12, 2) DEFAULT 5000.00;
    END IF;
END $$;

-- Add current_utilization_kg if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'current_utilization_kg'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN current_utilization_kg DECIMAL(12, 2) DEFAULT 0.00;
    END IF;
END $$;

-- Add is_active if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Add category if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'facilities' 
        AND column_name = 'category'
    ) THEN
        ALTER TABLE public.facilities 
        ADD COLUMN category VARCHAR(100) DEFAULT 'Cold Storage';
    END IF;
END $$;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_facilities_owner_profile_id ON public.facilities(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_facilities_is_active ON public.facilities(is_active);

COMMIT;
