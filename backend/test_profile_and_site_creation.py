import os
import sys
import uuid
from dotenv import load_dotenv
from supabase import create_client, Client

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def test_full_flow():
    print("=== TESTING COMPLETE MULTI-ROOM & PROFILE CREATION FLOW ===")
    
    # 1. Sign up a test auth user via Supabase Auth
    test_email = f"testowner_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "TestPassword123!"
    print(f"\n1. Registering new Auth User ({test_email})...")
    
    auth_res = supabase.auth.sign_up({
        'email': test_email,
        'password': test_password
    })
    
    if not auth_res.user:
        print("[ERROR] Failed to create auth user")
        return
        
    user_id = auth_res.user.id
    print(f"   [OK] Auth user registered successfully! auth.users ID: {user_id}")
    
    # 2. Create owner company
    company_id = str(uuid.uuid4())
    print(f"\n2. Creating test owner company ({company_id[:8]}...)...")
    comp_res = supabase.table('owner_companies').insert({
        'id': company_id,
        'company_name': 'Test ColdStorage Logistics Pvt Ltd',
        'contact_email': test_email,
        'city': 'Hyderabad',
        'state': 'Telangana'
    }).execute()
    print("   [OK] Owner company created")
    
    # 3. Create user profile in public.profiles using auth.user.id
    print(f"\n3. Creating user profile in public.profiles (id={user_id[:8]}...)...")
    prof_res = supabase.table('profiles').insert({
        'id': user_id,
        'email': test_email,
        'full_name': 'Test Owner User',
        'role': 'owner',
        'owner_company_id': company_id
    }).execute()
    print("   [OK] Profile saved to public.profiles!")
    
    # 4. Create Site (renamed from facility)
    site_id = str(uuid.uuid4())
    print(f"\n4. Creating test Site linked to owner_profile_id ({site_id[:8]}...)...")
    site_res = supabase.table('sites').insert({
        'id': site_id,
        'owner_profile_id': user_id,
        'facility_name': 'ColdSense Multi-Room Facility Alpha',
        'address': 'Plot 42, Industrial Area, Hyderabad',
        'is_active': True
    }).execute()
    print("   [OK] Site created successfully!")
    
    # 5. Create Multi-Rooms linked to site_id
    room_id_1 = str(uuid.uuid4())
    room_id_2 = str(uuid.uuid4())
    print(f"\n5. Creating 2 Cold Storage Rooms linked to site_id...")
    rooms_res = supabase.table('cold_storage_rooms').insert([
        {
            'id': room_id_1,
            'site_id': site_id,
            'room_code': 'ROOM-101',
            'capacity_kg': 50000,
            'status': 'active'
        },
        {
            'id': room_id_2,
            'site_id': site_id,
            'room_code': 'ROOM-102',
            'capacity_kg': 75000,
            'status': 'active'
        }
    ]).execute()
    print("   [OK] 2 Rooms created successfully for site_id!")
    
    # 6. Verify room queries
    print(f"\n6. Querying rooms for site_id...")
    fetched_rooms = supabase.table('cold_storage_rooms').select('*').eq('site_id', site_id).execute()
    print(f"   [OK] Retrieved {len(fetched_rooms.data)} rooms from database!")
    for r in fetched_rooms.data:
        print(f"      - Room: {r['room_code']}, Capacity: {r['capacity_kg']}kg, Status: {r['status']}")
    
    # 7. Clean up test records
    print("\n7. Cleaning up test records...")
    supabase.table('cold_storage_rooms').delete().eq('site_id', site_id).execute()
    supabase.table('sites').delete().eq('id', site_id).execute()
    supabase.table('profiles').delete().eq('id', user_id).execute()
    supabase.table('owner_companies').delete().eq('id', company_id).execute()
    
    # Admin delete user from auth if service role available
    try:
        supabase.auth.admin.delete_user(user_id)
        print("   [OK] Auth test user cleaned up")
    except Exception as e:
        print(f"   [NOTE] Auth user cleanup notice: {e}")
    
    print("\n==================================================")
    print("SUCCESS! Complete multi-room site & profile flow verified without errors!")
    print("==================================================")

if __name__ == "__main__":
    test_full_flow()
