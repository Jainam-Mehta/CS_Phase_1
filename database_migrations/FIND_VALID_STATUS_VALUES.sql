-- Run this in Supabase SQL Editor to find valid status values

-- Check the constraint definition
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sensor_devices'::regclass
AND contype = 'c';

-- Also check what existing status values are in the table
SELECT DISTINCT status 
FROM sensor_devices 
ORDER BY status;
