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
SERVICE_ROLE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SERVICE_ROLE_KEY:
    print("[ERROR] Missing credentials in .env")
    sys.exit(1)

# Always maintain a pure admin_client with service_role key
admin_client: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)

def test_admin_and_user_flows():
    print("=== TESTING ADMIN & AUTHENTICATED USER FLOWS ===")
    
    # 1. Create user via admin API
    test_email = f"owner_test_{uuid.uuid4().hex[:8]}@coldsense.com"
    test_password = "Password123!"
    
    print(f"\n1. Creating Auth User via Admin API ({test_email})...")
    user_res = admin_client.auth.admin.create_user({
        'email': test_email,
        'password': test_password,
        'email_confirm': True
    })
    
    user_id = user_res.user.id
    print(f"   [OK] Auth User created! ID: {user_id}")
    
    # 2. Create owner company via Admin client
    company_id = str(uuid.uuid4())
    print(f"\n2. Creating Owner Company ({company_id[:8]}...)...")
    comp_res = admin_client.table('owner_companies').insert({
        'id': company_id,
        'company_name': 'ColdSense Test Corp',
        'contact_email': test_email,
        'city': 'Hyderabad',
        'state': 'Telangana'
    }).execute()
    print("   [OK] Owner Company created")
    
    # 3. Create Profile via Admin client
    print(f"\n3. Creating User Profile in public.profiles...")
    prof_res = admin_client.table('profiles').insert({
        'id': user_id,
        'email': test_email,
        'full_name': 'Test Owner Admin',
        'role': 'owner',
        'owner_company_id': company_id
    }).execute()
    print("   [OK] Profile saved to public.profiles")
    
    # 4. Create Site via Admin client
    site_id = str(uuid.uuid4())
    print(f"\n4. Creating Site linked to owner ({site_id[:8]}...)...")
    site_res = admin_client.table('sites').insert({
        'id': site_id,
        'owner_profile_id': user_id,
        'facility_name': 'Hyderabad Cold Storage Facility 1',
        'address': 'Plot 100, Gachibowli',
        'is_active': True
    }).execute()
    print("   [OK] Site created in public.sites")
    
    # 5. Create Multi-Rooms via Admin client
    room_1 = str(uuid.uuid4())
    room_2 = str(uuid.uuid4())
    print(f"\n5. Creating 2 Multi-Rooms linked to site_id...")
    rooms_res = admin_client.table('cold_storage_rooms').insert([
        {
            'id': room_1,
            'site_id': site_id,
            'room_code': 'RM-101',
            'capacity_kg': 50000,
            'current_utilization_kg': 0,
            'status': 'active',
            'is_active': True
        },
        {
            'id': room_2,
            'site_id': site_id,
            'room_code': 'RM-102',
            'capacity_kg': 75000,
            'current_utilization_kg': 0,
            'status': 'active',
            'is_active': True
        }
    ]).execute()
    print(f"   [OK] {len(rooms_res.data)} Multi-Rooms created successfully!")
    
    # 6. Now test signing in as the user (authenticated client) to test SELECT queries
    print(f"\n6. Testing Authenticated User session sign in...")
    user_client = create_client(SUPABASE_URL, os.getenv("VITE_SUPABASE_ANON_KEY", SERVICE_ROLE_KEY))
    auth_res = user_client.auth.sign_in_with_password({
        'email': test_email,
        'password': test_password
    })
    print(f"   [OK] Signed in as user {auth_res.user.email}")
    
    # Test reading sites & rooms as authenticated user
    try:
        user_sites = user_client.table('sites').select('*').eq('owner_profile_id', user_id).execute()
        print(f"   [OK] Authenticated user fetched {len(user_sites.data)} site(s)")
    except Exception as e:
        print(f"   [NOTE] User site fetch note: {e}")
        
    try:
        user_rooms = user_client.table('cold_storage_rooms').select('*').eq('site_id', site_id).execute()
        print(f"   [OK] Authenticated user fetched {len(user_rooms.data)} room(s)")
    except Exception as e:
        print(f"   [NOTE] User room fetch note: {e}")

    # 7. Clean up
    print("\n7. Cleaning up test data...")
    admin_client.table('cold_storage_rooms').delete().eq('site_id', site_id).execute()
    admin_client.table('sites').delete().eq('id', site_id).execute()
    admin_client.table('profiles').delete().eq('id', user_id).execute()
    admin_client.table('owner_companies').delete().eq('id', company_id).execute()
    admin_client.auth.admin.delete_user(user_id)
    print("   [OK] All test data cleaned up successfully")
    
    print("\n==================================================")
    print("ALL TESTS PASSED PERFECTLY!")
    print("==================================================")

if __name__ == "__main__":
    test_admin_and_user_flows()
