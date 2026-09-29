#!/usr/bin/env python3
"""Check if farmer has room access requests in database"""
from app.database.supabase import supabase

# Get the test farmer profile
result = supabase.table('profiles').select('*').eq('email', 'karan@test.in').maybe_single().execute()
if result.data:
    print(f'Profile found. Keys: {result.data.keys()}')
    farmer_id = result.data['id']
    print(f'Farmer ID: {farmer_id}')
    print(f'Role: {result.data.get("role", "N/A")}')
    
    # Check for room access requests
    reqs = supabase.table('farmer_room_access').select('*').eq('farmer_id', farmer_id).execute()
    print(f'\nRoom Access Requests: {len(reqs.data)} found')
    for req in reqs.data:
        print(f'  - ID: {req["id"]}, Status: {req["status"]}, Room ID: {req["room_id"]}, Requested At: {req["requested_at"]}')
        
        # Also check if room exists and has site info
        room_result = supabase.table('cold_storage_rooms').select('id, room_name, site_id').eq('id', req['room_id']).maybe_single().execute()
        if room_result.data:
            room = room_result.data
            print(f'     Room: {room["room_name"]}, Site ID: {room["site_id"]}')
            
            # Get site details
            site_result = supabase.table('sites').select('id, facility_name').eq('id', room['site_id']).maybe_single().execute()
            if site_result.data:
                print(f'     Site: {site_result.data["facility_name"]}')
else:
    print('Farmer not found')
