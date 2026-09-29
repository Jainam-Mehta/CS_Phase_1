from app.database.supabase import supabase
from datetime import datetime

test_id = '6c56b36a-77a4-4586-8bc4-a0882745e58e'

# Try different field combinations
print("Test 1: Update only status")
try:
    result = supabase.table('farmer_room_access').update({
        'status': 'Approved'
    }).eq('id', test_id).execute()
    print(f"  Success!")
except Exception as e:
    print(f"  Error: {e}")

print("\nTest 2: Update status + approved_at")
try:
    result = supabase.table('farmer_room_access').update({
        'status': 'Approved',
        'approved_at': datetime.now().isoformat()
    }).eq('id', test_id).execute()
    print(f"  Success!")
except Exception as e:
    print(f"  Error: {e}")

print("\nTest 3: Update status + approved_by")
try:
    result = supabase.table('farmer_room_access').update({
        'status': 'Approved',
        'approved_by': 'a9a84341-65e0-4e9c-9c0b-88208d1c9ab3'
    }).eq('id', test_id).execute()
    print(f"  Success!")
except Exception as e:
    print(f"  Error: {e}")

print("\nTest 4: Update all three fields")
try:
    result = supabase.table('farmer_room_access').update({
        'status': 'Approved',
        'approved_at': datetime.now().isoformat(),
        'approved_by': 'a9a84341-65e0-4e9c-9c0b-88208d1c9ab3'
    }).eq('id', test_id).execute()
    print(f"  Success!")
except Exception as e:
    print(f"  Error: {e}")
