from app.database.supabase import supabase

# Try to list all triggers on farmer_room_access
# This won't work directly via REST API, so let's check the table structure

result = supabase.table('farmer_room_access').select('*').limit(1).execute()

print("farmer_room_access columns:")
if result.data:
    for col in result.data[0].keys():
        print(f"  - {col}")

# Check if there's a generated column or computed field
# by looking at the actual column definitions
print("\nTrying to get column info...")

# Let's just try a simple select to see what columns exist
print("\nSample record:", result.data[0] if result.data else "No data")
