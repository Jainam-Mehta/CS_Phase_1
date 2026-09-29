"""Discover actual columns for tables that failed."""
import os, sys
if sys.stdout.encoding != 'utf-8':
    try: sys.stdout.reconfigure(encoding='utf-8')
    except: pass

from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
admin = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

tables = [
    'farmer_payments', 'alerts', 'activity_logs',
    'sites', 'cold_storage_rooms', 'sensor_readings',
    'facility_maintenance', 'facility_maintenance_logs',
    'expenses', 'stakeholder_investments', 'stakeholder_payments',
    'profiles',
]

for t in tables:
    try:
        r = admin.table(t).select('*').limit(1).execute()
        if r.data:
            print(f"\n[{t}] columns: {list(r.data[0].keys())}")
        else:
            # Insert a dummy and immediately delete to see column error
            print(f"\n[{t}] — empty table, trying schema info...")
    except Exception as e:
        print(f"\n[{t}] ERROR: {e}")
