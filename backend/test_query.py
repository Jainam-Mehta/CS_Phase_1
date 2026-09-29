#!/usr/bin/env python3
"""Test the exact query the frontend is using"""
from app.database.supabase import supabase

farmer_id = 'cd4f2f71-e5a2-418c-b80a-bfe813289329'

# First, let's see what's in farmer_room_access
result = supabase.table('farmer_room_access').select('*').eq('farmer_id', farmer_id).execute()

print(f'farmer_room_access columns:')
if result.data:
    print(f'Keys: {result.data[0].keys()}')
    print(f'Full record:')
    for key, val in result.data[0].items():
        print(f'  {key}: {val}')

