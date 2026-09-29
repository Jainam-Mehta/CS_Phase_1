#!/usr/bin/env python3
"""Test the complete query that the frontend uses"""
from app.database.supabase import supabase

farmer_id = 'cd4f2f71-e5a2-418c-b80a-bfe813289329'

# Test the exact query from Settings.tsx
result = supabase.table('farmer_room_access').select("""
    id, status, requested_at, remarks,
    cold_storage_rooms(room_name, room_code, site_id, sites(facility_name))
""").eq('farmer_id', farmer_id).order('requested_at', desc=True).execute()

print(f'Query result: {len(result.data)} records\n')
for req in result.data:
    print(f'Request ID: {req["id"]}')
    print(f'Status: {req["status"]}')
    print(f'Requested At: {req["requested_at"]}')
    print(f'Room: {req["cold_storage_rooms"]}')
    if req.get('cold_storage_rooms'):
        room = req['cold_storage_rooms']
        print(f'  Room Name: {room.get("room_name")}')
        print(f'  Room Code: {room.get("room_code")}')
        print(f'  Facility: {room.get("sites", {}).get("facility_name")}')
