-- Migration: Fix missing owner profile and link facilities
-- This migration creates the missing profile for the owner and ensures facilities are properly linked

BEGIN;

-- Step 1: Ensure roles table exists with required roles
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default roles if they don't exist
INSERT INTO public.roles (name, description) 
VALUES 
    ('owner', 'Cold storage facility owner'),
    ('farmer', 'Agricultural farmer/producer'),
    ('stakeholder', 'Investment stakeholder/investor')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Ensure profiles.role_id column exists and is UUID type
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'role_id'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.profiles.role_id IS 'Foreign key to roles table';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON public.profiles(role_id);

-- Step 3: Create missing owner profile if it doesn't exist
-- This creates a profile for any owner user that doesn't have one yet
DO $$ 
DECLARE
    owner_role_id UUID;
    auth_user_id UUID;
BEGIN
    -- Get the owner role ID
    SELECT id INTO owner_role_id FROM public.roles WHERE name = 'owner' LIMIT 1;
    
    -- For each auth user with 'owner' email pattern that doesn't have a profile, create one
    FOR auth_user_id IN 
        SELECT u.id 
        FROM auth.users u
        WHERE u.email LIKE '%@coldsense.in' 
          AND u.email ILIKE '%own%'
          AND NOT EXISTS (
              SELECT 1 FROM public.profiles WHERE auth_user_id = u.id
          )
    LOOP
        INSERT INTO public.profiles (auth_user_id, first_name, last_name, role_id)
        VALUES (auth_user_id, 'Owner', 'Account', owner_role_id)
        ON CONFLICT (auth_user_id) DO NOTHING;
    END LOOP;
END $$;

-- Step 4: Update existing facilities to have valid owner_profile_id if missing
-- This ensures all facilities have an owner assigned
UPDATE public.facilities
SET owner_profile_id = (
    SELECT p.id 
    FROM public.profiles p
    WHERE p.role_id = (SELECT id FROM public.roles WHERE name = 'owner')
    LIMIT 1
)
WHERE owner_profile_id IS NULL
  AND id IS NOT NULL;

-- Step 5: Ensure facility columns exist
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
    END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_facilities_owner_profile_id ON public.facilities(owner_profile_id);

COMMIT;
