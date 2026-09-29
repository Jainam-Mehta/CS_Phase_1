#!/usr/bin/env python3
"""Diagnose room_id mismatches between farmer_room_access and cold_storage_rooms"""
from app.database.supabase import supabase

# Get all farmer_room_access records
reqs = supabase.table('farmer_room_access').select('id, farmer_id, room_id, status').execute()
print(f'Total farmer_room_access records: {len(reqs.data)}\n')

# Get all cold_storage_rooms
rooms = supabase.table('cold_storage_rooms').select('id, room_code, room_name').execute()
room_ids = set(r['id'] for r in rooms.data)
print(f'Total cold_storage_rooms: {len(rooms.data)}')
print(f'Room IDs in cold_storage_rooms: {len(room_ids)}\n')

# Check for orphaned references
orphaned = []
valid = []
for req in reqs.data:
    if req['room_id'] not in room_ids:
        orphaned.append(req)
    else:
        valid.append(req)

print(f'Valid farmer_room_access (room exists): {len(valid)}')
print(f'Orphaned farmer_room_access (room NOT found): {len(orphaned)}\n')

if orphaned:
    print('ORPHANED RECORDS:')
    for req in orphaned:
        print(f'  - ID: {req["id"]}, Farmer: {req["farmer_id"]}, Room: {req["room_id"]}, Status: {req["status"]}')
    print()

print('All available rooms:')
for room in rooms.data:
    print(f'  - ID: {room["id"]}, Code: {room["room_code"]}, Name: {room["room_name"]}')
