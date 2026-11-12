import sys
sys.path.insert(0, '.')
from app.database.supabase import supabase

# Check sites by district
sites = supabase.table('sites').select('id, facility_name, district_id').execute()
print('Total sites:', len(sites.data))
for site in sites.data:
    dist_id = site.get('district_id', 'NULL')
    print(f"  - {site['facility_name']} (district_id: {dist_id})")

# Check rooms
print()
rooms = supabase.table('cold_storage_rooms').select('id, room_code, site_id').execute()
print('Total rooms:', len(rooms.data))
for room in rooms.data:
    print(f"  - {room['room_code']} (site_id: {room['site_id']})")
