-- Fix: Add missing RLS policies on sites table
-- This allows authenticated users to manage their own sites

BEGIN;

-- Enable RLS on sites table (if not already enabled)
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to SELECT their own sites
CREATE POLICY "Users can select sites they own"
ON public.sites
FOR SELECT
USING (
  auth.uid()::text = (
    SELECT profiles.auth_user_id 
    FROM public.profiles 
    WHERE profiles.id = sites.owner_profile_id 
    LIMIT 1
  )
);

-- Policy 2: Allow authenticated users to INSERT new sites
-- (owner_profile_id must match their profile)
CREATE POLICY "Users can create sites as owner"
ON public.sites
FOR INSERT
WITH CHECK (
  auth.uid()::text = (
    SELECT profiles.auth_user_id 
    FROM public.profiles 
    WHERE profiles.id = owner_profile_id 
    LIMIT 1
  )
);

-- Policy 3: Allow authenticated users to UPDATE their own sites
CREATE POLICY "Users can update sites they own"
ON public.sites
FOR UPDATE
USING (
  auth.uid()::text = (
    SELECT profiles.auth_user_id 
    FROM public.profiles 
    WHERE profiles.id = sites.owner_profile_id 
    LIMIT 1
  )
)
WITH CHECK (
  auth.uid()::text = (
    SELECT profiles.auth_user_id 
    FROM public.profiles 
    WHERE profiles.id = owner_profile_id 
    LIMIT 1
  )
);

-- Policy 4: Allow authenticated users to DELETE their own sites
CREATE POLICY "Users can delete sites they own"
ON public.sites
FOR DELETE
USING (
  auth.uid()::text = (
    SELECT profiles.auth_user_id 
    FROM public.profiles 
    WHERE profiles.id = sites.owner_profile_id 
    LIMIT 1
  )
);

COMMIT;
