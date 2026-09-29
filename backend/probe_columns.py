"""
Probe actual columns by inserting a comprehensive test row and checking
which PGRST204 errors come back. Then we know exactly which columns exist.
"""
import os, sys, uuid
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
admin = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

def probe(table, payload):
    """Try insert; on PGRST204 identify missing column; retry without it."""
    remaining = dict(payload)
    bad_cols = []
    while True:
        try:
            r = admin.table(table).insert(remaining).execute()
            # Success — delete it
            if r.data:
                rid = r.data[0].get('id')
                if rid:
                    admin.table(table).delete().eq('id', rid).execute()
            print(f"  [{table}] VALID cols: {list(remaining.keys())}")
            break
        except Exception as e:
            msg = str(e)
            if 'PGRST204' in msg or "Could not find" in msg:
                # extract column name from message
                import re
                m = re.search(r"find the '(\w+)' column", msg)
                if m:
                    bad = m.group(1)
                    bad_cols.append(bad)
                    del remaining[bad]
                else:
                    print(f"  [{table}] Unknown error: {e}")
                    break
            else:
                print(f"  [{table}] Non-schema error: {e}")
                break
    if bad_cols:
        print(f"  [{table}] MISSING cols: {bad_cols}")

uid = lambda: str(uuid.uuid4())

# Get a real room_id and site_id from what we just created
sites = admin.table('sites').select('id').limit(1).execute()
site_id = sites.data[0]['id'] if sites.data else uid()

rooms = admin.table('cold_storage_rooms').select('id').limit(1).execute()
room_id = rooms.data[0]['id'] if rooms.data else uid()

# Get a real farmer/owner profile id
profiles = admin.table('profiles').select('id,role').execute()
owner_id  = next((p['id'] for p in profiles.data if p['role'] == 'owner'), uid())
farmer_id = next((p['id'] for p in profiles.data if p['role'] == 'farmer'), uid())
stake_id  = next((p['id'] for p in profiles.data if p['role'] == 'stakeholder'), uid())

print("\n=== Probing actual column names ===\n")

print("--- cold_storage_rooms ---")
probe('cold_storage_rooms', {
    'id': uid(), 'site_id': site_id, 'room_code': 'PROBE-001',
    'room_name': 'Probe Room', 'capacity_kg': 100,
    'current_utilization_kg': 0, 'storage_rate_per_kg_month': 1.4,
    'status': 'active', 'is_active': True,
})

print("\n--- farmer_payments ---")
probe('farmer_payments', {
    'id': uid(), 'farmer_id': farmer_id, 'site_id': site_id, 'room_id': room_id,
    'period_start': '2026-09-16', 'period_end': '2026-09-17',
    'crates_stored': 12, 'rate_per_crate': 1.4, 'total_amount': 16.8,
    'payment_status': 'Received', 'status': 'paid',
})

print("\n--- alerts ---")
probe('alerts', {
    'id': uid(), 'site_id': site_id, 'room_id': room_id,
    'alert_type': 'temperature', 'severity': 'warning',
    'title': 'Test Alert', 'description': 'Test desc',
    'message': 'Test message', 'status': 'unresolved',
    'resolved_at': None,
})

print("\n--- activity_logs ---")
probe('activity_logs', {
    'id': uid(), 'actor_id': owner_id, 'actor_name': 'Suresh Kumar',
    'action_type': 'farmer_approved', 'action_subtype': 'cold_storage_request',
    'target_type': 'farmer', 'target_id': farmer_id, 'target_name': 'Roy Sharma',
    'facility_id': site_id, 'related_data': {}, 'visibility': 'private',
})

print("\n--- sensor_readings ---")
probe('sensor_readings', {
    'id': uid(), 'room_id': room_id, 'timestamp': '2026-09-21T10:00:00',
    'temperature_celsius': 5.6, 'humidity_percentage': 89.23,
    'temperature': 5.6, 'humidity': 89.23,
    'ambient_temperature': 18.5, 'ambient_humidity': 62.0,
    'compressor_status': 'Running', 'door_status': 'Closed',
    'recorded_at': '2026-09-21T10:00:00',
})

print("\n--- facility_maintenance ---")
probe('facility_maintenance', {
    'id': uid(), 'site_id': site_id,
    'maintenance_type': 'hvac_water',
    'last_service_date': '2026-09-20', 'next_due_date': '2026-10-20',
    'status': 'healthy', 'notes': 'Test', 'performed_by': 'Tech',
})

print("\n--- facility_maintenance_logs ---")
probe('facility_maintenance_logs', {
    'id': uid(), 'site_id': site_id,
    'maintenance_type': 'hvac_water',
    'service_date': '2026-09-20',
    'performed_by': 'Tech', 'notes': 'Test',
    'status': 'completed', 'next_due_date': '2026-10-20',
})

print("\n--- expenses ---")
probe('expenses', {
    'id': uid(), 'site_id': site_id, 'room_id': room_id,
    'category': 'Maintenance', 'amount': 1500.0,
    'description': 'HVAC check', 'expense_date': '2026-09-20',
})

print("\n--- stakeholder_investments ---")
probe('stakeholder_investments', {
    'id': uid(), 'stakeholder_id': stake_id, 'site_id': site_id,
    'owner_company_id': None,
    'investment_amount_inr': 20000, 'roi_percentage_estimate': 5.3,
    'carbon_credits': 241, 'status': 'Active',
})

print("\n--- stakeholder_payments ---")
probe('stakeholder_payments', {
    'id': uid(), 'investment_id': uid(), 'stakeholder_id': stake_id,
    'amount_inr': 883.0, 'payment_status': 'Received',
    'remarks': 'Test',
})

print("\n--- energy_consumption ---")
probe('energy_consumption', {
    'id': uid(), 'site_id': site_id,
    'total_kwh': 50.0, 'kwh': 50.0, 'reading_date': '2026-09-21',
})

print("\nDone!")
