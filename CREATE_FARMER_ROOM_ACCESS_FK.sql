-- Delete orphaned farmer_room_access records where room_id doesn't exist
-- This is safe because the rooms are gone anyway
DELETE FROM public.farmer_room_access
WHERE room_id NOT IN (SELECT id FROM public.cold_storage_rooms);

-- Now add the foreign key constraints
ALTER TABLE public.farmer_room_access
ADD CONSTRAINT fk_farmer_room_access_room_id
FOREIGN KEY (room_id)
REFERENCES public.cold_storage_rooms(id)
ON DELETE CASCADE;

-- Also add foreign key to profiles table for farmer_id if it doesn't exist
ALTER TABLE public.farmer_room_access
ADD CONSTRAINT fk_farmer_room_access_farmer_id
FOREIGN KEY (farmer_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
