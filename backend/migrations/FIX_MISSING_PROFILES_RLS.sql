-- Fix: Add missing RLS policies on profiles table
-- This allows users to read their own profile after login

BEGIN;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow users to SELECT their own profile
CREATE POLICY "Users can select own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Policy 2: Allow users to UPDATE their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy 3: Allow authenticated users to INSERT their own profile (during signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy 4: Service role can read/write all profiles (for backend operations)
-- (This is implicit with service_role_key, but making it explicit for clarity)

COMMIT;
