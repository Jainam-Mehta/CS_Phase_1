#!/usr/bin/env python3
"""Set room_name to match room_code for all rooms that have NULL room_name"""
from app.database.supabase import supabase

# Get all rooms with NULL room_name
rooms = supabase.table('cold_storage_rooms').select('id, room_code, room_name').is_('room_name', 'null').execute()

print(f'Found {len(rooms.data)} rooms with NULL room_name\n')

if rooms.data:
    print('Updating rooms:\n')
    for room in rooms.data:
        # Update room_name to match room_code
        result = supabase.table('cold_storage_rooms').update({
            'room_name': room['room_code']
        }).eq('id', room['id']).execute()
        
        if result.data:
            print(f'✓ {room["room_code"]} - Updated')
    
    print(f'\nDone! Updated {len(rooms.data)} rooms')
else:
    print('No rooms with NULL room_name found - all rooms are initialized!')

# Verify
all_rooms = supabase.table('cold_storage_rooms').select('id, room_code, room_name').execute()
null_count = sum(1 for r in all_rooms.data if r['room_name'] is None)
print(f'\nVerification: {null_count} rooms still have NULL room_name')
