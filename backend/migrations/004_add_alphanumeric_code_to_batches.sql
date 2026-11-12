-- Migration: Add alphanumeric_code column to batches table
-- Description: Add farmer-friendly crate codes in 0A-9Z format for easier batch identification

ALTER TABLE public.batches
ADD COLUMN alphanumeric_code character varying(2) NULL;

-- Create index for faster lookups
CREATE INDEX idx_batches_alphanumeric_code ON public.batches(alphanumeric_code);

-- Create partial unique index to enforce uniqueness only for non-NULL values
-- This allows multiple NULL values (for existing batches without codes)
CREATE UNIQUE INDEX idx_unique_alphanumeric_per_farmer 
ON public.batches(farmer_id, alphanumeric_code) 
WHERE alphanumeric_code IS NOT NULL;
