#!/usr/bin/env python3
"""Check the room details for the farmer's request"""
from app.database.supabase import supabase

farmer_id = 'cd4f2f71-e5a2-418c-b80a-bfe813289329'

# Get the farmer's request
req = supabase.table('farmer_room_access').select('*').eq('farmer_id', farmer_id).maybe_single().execute()
if req.data:
    room_id = req.data['room_id']
    print(f'Request found!')
    print(f'  Room ID: {room_id}')
    print(f'  Status: {req.data["status"]}')
    print(f'  Requested At: {req.data["requested_at"]}')
    
    # Get room details
    room = supabase.table('cold_storage_rooms').select('*').eq('id', room_id).maybe_single().execute()
    if room.data:
        print(f'\nRoom details:')
        print(f'  ID: {room.data["id"]}')
        print(f'  Room Code: {room.data["room_code"]}')
        print(f'  Room Name: {room.data["room_name"]}')
        print(f'  Site ID: {room.data["site_id"]}')
        
        # Get site details
        site = supabase.table('sites').select('*').eq('id', room.data['site_id']).maybe_single().execute()
        if site.data:
            print(f'\nSite details:')
            print(f'  ID: {site.data["id"]}')
            print(f'  Facility Name: {site.data["facility_name"]}')
else:
    print('No request found for this farmer')
