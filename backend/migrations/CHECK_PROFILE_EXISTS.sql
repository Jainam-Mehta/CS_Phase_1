-- Diagnostic: Check if your profile exists in the database

SELECT 
  id,
  email,
  first_name,
  last_name,
  role_id,
  is_active,
  created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- Also check total profile count
SELECT COUNT(*) as total_profiles FROM public.profiles;
