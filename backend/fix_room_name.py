#!/usr/bin/env python3
"""Fix the room_name for the farmer's requested room"""
from app.database.supabase import supabase

room_id = 'cf79a361-20eb-47dd-be42-b9a5d3c81167'

# Update the room name - use the room code as basis
result = supabase.table('cold_storage_rooms').update({
    'room_name': 'Storage Room A'
}).eq('id', room_id).execute()

print(f'Updated room {room_id}')
print(f'Result: {result.data}')

# Verify
room = supabase.table('cold_storage_rooms').select('*').eq('id', room_id).maybe_single().execute()
if room.data:
    print(f'\nVerified - Room Name is now: {room.data["room_name"]}')
