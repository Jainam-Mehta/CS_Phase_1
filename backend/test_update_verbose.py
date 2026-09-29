from app.database.supabase import supabase
from datetime import datetime
import json

# Enable verbose mode
supabase.postgrest.client.headers["X-Debug-Mode"] = "true"

test_id = '6c56b36a-77a4-4586-8bc4-a0882745e58e'

print("Attempting update...")
try:
    result = supabase.table('farmer_room_access').update({
        'status': 'Approved',
        'approved_at': datetime.now().isoformat(),
        'approved_by': 'a9a84341-65e0-4e9c-9c0b-88208d1c9ab3'
    }).eq('id', test_id).execute()
    
    print(f"Success: {result}")
except Exception as e:
    print(f"Error type: {type(e)}")
    print(f"Error: {e}")
    print(f"Error details: {str(e)}")
    
    # Try to see if there are any RLS policies
    print("\nChecking RLS policies...")
    
    # Try a simple select to see if that works
    print("\nTesting select (should work)...")
    result_select = supabase.table('farmer_room_access').select('*').eq('id', test_id).execute()
    print(f"Select works: {len(result_select.data) if result_select.data else 0} records")
