-- Migration: Create roles table
-- Purpose: Enable role-based access control with FK from profiles

BEGIN;

-- Create roles table if not exists
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.roles IS 'User roles: owner, farmer, stakeholder';
COMMENT ON COLUMN public.roles.name IS 'Role name: owner, farmer, or stakeholder';

-- Seed initial roles if they don't exist
INSERT INTO public.roles (name, description) 
VALUES 
    ('owner', 'Cold storage facility owner'),
    ('farmer', 'Agricultural farmer/producer'),
    ('stakeholder', 'Investment stakeholder/investor')
ON CONFLICT (name) DO NOTHING;

-- Create index for faster name lookups
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

COMMIT;
