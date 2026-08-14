-- Migration: Update batch_room_allocations foreign key to use cold_storage_rooms instead of rooms
-- This fixes the FK constraint violation where the application uses cold_storage_rooms.id
-- but the database constraint references rooms.id

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE batch_room_allocations 
DROP CONSTRAINT IF EXISTS batch_room_allocations_room_id_fkey;

-- Step 2: Add the new foreign key constraint pointing to cold_storage_rooms
ALTER TABLE batch_room_allocations 
ADD CONSTRAINT batch_room_allocations_room_id_fkey 
FOREIGN KEY (room_id) REFERENCES cold_storage_rooms(id) ON DELETE CASCADE;

-- Step 3: Verify the constraint was added successfully
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'batch_room_allocations'
    AND kcu.column_name = 'room_id';