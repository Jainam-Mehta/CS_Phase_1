-- Check what constraints exist on sensor_devices table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'sensor_devices'::regclass
AND contype = 'c';  -- 'c' = check constraint
