from app.database.supabase import supabase

# Check if farmer_room_access table exists and has any data
result = supabase.table('farmer_room_access').select('*', count='exact').limit(1).execute()
print(f'farmer_room_access table exists: {result.data is not None}')
print(f'Record count: {result.count if hasattr(result, "count") else "N/A"}')

# Get one record to see structure
result_one = supabase.table('farmer_room_access').select('*').limit(1).execute()
if result_one.data:
    print(f'\nSample record: {result_one.data[0]}')
else:
    print('No records found')

# Check pending requests
result_pending = supabase.table('farmer_room_access').select('*').eq('status', 'Pending').execute()
print(f'\nPending requests: {len(result_pending.data) if result_pending.data else 0}')

# Check farmer_activity_logs
result_logs = supabase.table('farmer_activity_logs').select('*', count='exact').limit(1).execute()
print(f'\nfarmer_activity_logs table exists: {result_logs.data is not None}')
print(f'Activity logs count: {result_logs.count if hasattr(result_logs, "count") else "N/A"}')
