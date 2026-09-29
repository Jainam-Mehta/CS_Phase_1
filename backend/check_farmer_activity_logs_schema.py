from app.database.supabase import supabase

# Check farmer_activity_logs table structure
result = supabase.table('farmer_activity_logs').select('*').limit(1).execute()

if result.data:
    record = result.data[0]
    print(f"farmer_activity_logs table columns: {list(record.keys())}")
    print(f"\nSample record:")
    for key, val in record.items():
        print(f"  {key}: {val}")
else:
    print("No records in farmer_activity_logs")
