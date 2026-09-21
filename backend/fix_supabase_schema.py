import os
import sys
import json
import urllib.request
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: Missing credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def inspect_database():
    print("=== DATABASE INSPECTION ===")
    
    # Try selecting from tables
    tables = [
        "profiles", "owner_companies", "sites", "cold_storage_rooms",
        "sensor_devices", "sensor_readings", "alerts", "weather_history",
        "activity_logs", "expenses", "facility_maintenance", "facility_maintenance_logs",
        "facility_expenses", "farmer_payments", "carbon_credits", "energy_consumption",
        "stakeholder_investments", "stakeholder_interest", "states", "districts", "localities",
        "products", "batches", "facilities"
    ]
    
    existing_tables = []
    missing_tables = []
    
    for t in tables:
        try:
            res = supabase.table(t).select("*", count="exact").limit(1).execute()
            count = res.count if res.count is not None else len(res.data)
            print(f"  [EXISTS] Table '{t}': {count} rows")
            existing_tables.append(t)
        except Exception as e:
            err_msg = str(e)
            if "relation" in err_msg and "does not exist" in err_msg:
                print(f"  [MISSING] Table '{t}' does not exist")
                missing_tables.append(t)
            else:
                print(f"  [ERROR] Table '{t}': {err_msg[:100]}")

if __name__ == "__main__":
    inspect_database()
