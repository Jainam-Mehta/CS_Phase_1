import os
import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase = create_client(url, key)

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

# Check PostgREST OpenAPI spec for any available RPC functions or DDL endpoints
r = httpx.get(f"{url}/rest/v1/", headers=headers)
paths = list(r.json().get('paths', {}).keys())
print("ALL OPENAPI PATHS IN POSTGREST:")
for p in paths:
    if 'rpc' in p or 'sql' in p or 'exec' in p:
        print("  - ", p)

# Test creating a test site & rooms with service_role client vs authenticated user
print("\nTesting creating site & rooms using service_role client...")
try:
    site_res = supabase.table('sites').insert({
        'facility_name': 'Test Direct Site',
        'owner_profile_id': '00000000-0000-0000-0000-000000000000',
        'is_active': True
    }).execute()
    s_id = site_res.data[0]['id']
    print("[OK] Site created via service_role:", s_id)
    
    room_res = supabase.table('cold_storage_rooms').insert({
        'site_id': s_id,
        'room_code': 'RM-TEST99',
        'capacity_kg': 5000,
        'status': 'active'
    }).execute()
    print("[OK] Room created via service_role:", room_res.data[0]['id'])
    
    # Clean up
    supabase.table('cold_storage_rooms').delete().eq('site_id', s_id).execute()
    supabase.table('sites').delete().eq('id', s_id).execute()
    print("[OK] Cleanup successful")
except Exception as e:
    print("[ERROR] Service role create:", e)
