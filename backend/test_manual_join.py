#!/usr/bin/env python3
"""Test the FarmerInventory query"""
from app.database.supabase import supabase

farmer_id = 'cd4f2f71-e5a2-418c-b80a-bfe813289329'

# Test the query from FarmerInventory.tsx
try:
    result = supabase.table('farmer_room_access').select("room_id, cold_storage_rooms(room_name, site_id, sites(facility_name))").eq('farmer_id', farmer_id).eq('status', 'Approved').execute()
    print(f'Query succeeded! Got {len(result.data)} records')
    for req in result.data:
        print(f'  {req}')
except Exception as e:
    print(f'Query failed: {e}')

