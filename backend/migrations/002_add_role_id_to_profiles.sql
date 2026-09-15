-- Migration: Add role_id FK to profiles table
-- Purpose: Link profiles to roles table for proper role-based access control

BEGIN;

-- Add role_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role_id INTEGER REFERENCES public.roles(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.profiles.role_id IS 'Foreign key to roles table';
    END IF;
END $$;

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- Set default role for existing profiles (if they don't have one yet)
-- Assumes most existing profiles are farmers if not set
UPDATE public.profiles 
SET role_id = (SELECT id FROM public.roles WHERE name = 'farmer')
WHERE role_id IS NULL AND id IS NOT NULL;

COMMIT;
