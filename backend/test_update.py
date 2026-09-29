from app.database.supabase import supabase
from datetime import datetime

# Try to update a test farmer_room_access record and see the full error
test_id = '6c56b36a-77a4-4586-8bc4-a0882745e58e'

result = supabase.table('farmer_room_access').update({
    'status': 'Approved',
    'approved_at': datetime.now().isoformat(),
    'approved_by': 'a9a84341-65e0-4e9c-9c0b-88208d1c9ab3'
}).eq('id', test_id).execute()

print(f"Update result: {result}")
if result.data:
    print(f"Success: {result.data}")
else:
    print(f"Error data: {result.data}")
