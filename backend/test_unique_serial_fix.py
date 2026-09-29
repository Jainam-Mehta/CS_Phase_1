import os
import sys
import uuid
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('frontend/.env')

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase = create_client(SUPABASE_URL, ANON_KEY)

def test_unique_serial_fix():
    print("=== TESTING UNIQUE SERIAL NUMBER FIX FOR COMPOUND SENSORS ===")
    
    # 1. Get a room
    rooms = supabase.table('cold_storage_rooms').select('id, site_id').limit(1).execute().data
    if not rooms:
        print("No room found")
        return
    room_id = rooms[0]['id']
    site_id = rooms[0]['site_id']

    # Simulate inserting Temperature+Humidity compound sensor
    db_types = ['temperature', 'humidity']
    
    inserted_ids = []
    try:
        for db_type in db_types:
            serial = f"SN-{uuid.uuid4().hex[:6]}" # Unique serial for each DB record
            res = supabase.table('sensor_devices').insert({
                'room_id': room_id,
                'site_id': site_id,
                'sensor_name': f'Temperature+Humidity ({db_type})',
                'sensor_type': db_type,
                'sensor_code': serial,
                'status': 'Online',
                'is_active': True
            }).execute()
            inserted_ids.append(res.data[0]['id'])
            print(f"   [SUCCESS] Inserted {db_type} with unique code: {serial}")
    except Exception as e:
        print("   [FAIL] Compound sensor insert failed:", e)
    finally:
        for item_id in inserted_ids:
            supabase.table('sensor_devices').delete().eq('id', item_id).execute()

if __name__ == '__main__':
    test_unique_serial_fix()
