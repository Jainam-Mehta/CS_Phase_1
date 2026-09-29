#!/usr/bin/env python3
"""
Query the CHECK constraint on sensor_devices table for sensor_type
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_KEY not set in .env")
    sys.exit(1)

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("QUERYING SENSOR_TYPE CHECK CONSTRAINT")
print("=" * 80)

# Method 1: Query information_schema to get the constraint definition
try:
    print("\n[Method 1] Querying information_schema.table_constraints...")
    response = supabase.rpc(
        "query_constraint",
        {
            "constraint_name_param": "sensor_devices_sensor_type_check"
        }
    ).execute()
    print("Response:", json.dumps(response.data, indent=2))
except Exception as e:
    print(f"RPC not available, trying direct SQL query approach...")

# Method 2: Query check_clauses from information_schema
try:
    print("\n[Method 2] Querying information_schema.check_clauses...")
    # Note: We'll use raw SQL via Python's psycopg2 if available
    # For now, let's try to get table info
    from postgrest.exceptions import APIError
    
    # Try to read the table schema
    response = supabase.table('sensor_devices').select('*').limit(1).execute()
    print("Table exists and is accessible")
    
except Exception as e:
    print(f"Error querying table: {e}")

# Method 3: Try inserting test values to see which ones fail
print("\n[Method 3] Testing sensor_type values by attempted insertion...")

test_sensor_types = [
    "temperature",
    "humidity",
    "temperature_humidity",
    "co2",
    "light",
    "pressure",
    "motion",
    "door",
    "temperature_sensor",
    "humidity_sensor",
    "TEMPERATURE",
    "HUMIDITY",
]

allowed_types = []
rejected_types = []

for sensor_type in test_sensor_types:
    try:
        # Try to insert a test record (we'll use a rollback after)
        test_data = {
            "sensor_type": sensor_type,
            "device_id": "test-device-" + sensor_type,
            "location": "test-location",
            "status": "active",
        }
        response = supabase.table('sensor_devices').insert(test_data).execute()
        print(f"✓ ALLOWED: {sensor_type}")
        allowed_types.append(sensor_type)
        
        # Clean up test record
        try:
            supabase.table('sensor_devices').delete().eq('device_id', test_data['device_id']).execute()
        except:
            pass
            
    except Exception as e:
        error_msg = str(e)
        if "check constraint" in error_msg.lower() or "violates" in error_msg.lower():
            print(f"✗ REJECTED: {sensor_type} - {error_msg[:100]}")
            rejected_types.append(sensor_type)
        else:
            print(f"? ERROR: {sensor_type} - {error_msg[:100]}")

print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)
print(f"\nAllowed sensor_type values: {allowed_types}")
print(f"Rejected sensor_type values: {rejected_types}")

# Try direct SQL query if available
print("\n[Method 4] Attempting direct constraint query...")
try:
    # Query the constraint definition
    query = """
    SELECT constraint_name, check_clause
    FROM information_schema.check_constraints
    WHERE constraint_name = 'sensor_devices_sensor_type_check'
    AND table_schema = 'public'
    """
    
    # Try to execute via RPC or raw SQL
    result = supabase.rpc('execute_sql', {'sql': query}).execute()
    print("Constraint definition:", json.dumps(result.data, indent=2))
except Exception as e:
    print(f"Direct SQL query failed: {e}")

print("\n[Method 5] Querying table_constraints...")
try:
    query = """
    SELECT *
    FROM information_schema.table_constraints
    WHERE constraint_name = 'sensor_devices_sensor_type_check'
    """
    result = supabase.rpc('execute_sql', {'sql': query}).execute()
    print("Table constraints:", json.dumps(result.data, indent=2))
except Exception as e:
    print(f"Table constraints query failed: {e}")
