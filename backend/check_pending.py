from app.database.supabase import supabase
import json

# Check pending requests with full details
result_pending = supabase.table('farmer_room_access').select('*').eq('status', 'Pending').execute()
print(f'\n=== PENDING REQUESTS ({len(result_pending.data)} total) ===')
for req in result_pending.data:
    print(f'\nID: {req["id"]}')
    print(f'  Farmer ID: {req["farmer_id"]}')
    print(f'  Room ID: {req["room_id"]}')
    print(f'  Status: {req["status"]}')
    print(f'  Requested At: {req["requested_at"]}')

# Check farmer_activity_logs
result_logs = supabase.table('farmer_activity_logs').select('*').execute()
print(f'\n=== FARMER ACTIVITY LOGS ({len(result_logs.data)} total) ===')
for log in result_logs.data:
    print(f'\nID: {log["id"]}')
    print(f'  Event Type: {log["event_type"]}')
    print(f'  Farmer ID: {log["farmer_id"]}')
    print(f'  Room ID: {log.get("room_id", "N/A")}')
    print(f'  Details: {log.get("details", {})}')
    print(f'  Created: {log["created_at"]}')

# Check old activity_logs table
result_old = supabase.table('activity_logs').select('*').eq('actor_id', 'a9a84341-65e0-4e9c-9c0b-88208d1c9ab3').execute()
print(f'\n=== OLD ACTIVITY_LOGS for owner (a9a84341...) ===')
print(f'Count: {len(result_old.data) if result_old.data else 0}')
