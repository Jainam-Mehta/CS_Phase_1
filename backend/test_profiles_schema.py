from app.database.supabase import supabase

# Check profiles table structure by querying one record
result = supabase.table('profiles').select('*').limit(1).execute()

if result.data:
    record = result.data[0]
    print(f"Profiles table columns: {list(record.keys())}")
    print(f"\nSample record: {record}")
else:
    print("No profiles found")
