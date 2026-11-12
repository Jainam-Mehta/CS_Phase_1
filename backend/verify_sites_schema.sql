-- Verify actual sites table schema
-- Run this in Supabase SQL Editor to confirm column names

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'sites' 
ORDER BY ordinal_position;

-- Also show sample data
SELECT * FROM sites LIMIT 3;
