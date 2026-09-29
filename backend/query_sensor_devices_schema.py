#!/usr/bin/env python3
"""
Query Supabase to get the actual schema of the sensor_devices table.
"""

from supabase import create_client, Client
import json

# Credentials from .env
SUPABASE_URL = "https://vzoypfctadgyflzwodmp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE0Nzk3NywiZXhwIjoyMTAwNzIzOTc3fQ.h7Nmej91_USzGDpv-MgVG81kGWEHnzjlfc1EtJXAzDc"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("=" * 80)
print("QUERYING SENSOR_DEVICES TABLE SCHEMA")
print("=" * 80)

# 1. Get ONE record from sensor_devices table
print("\n1. Fetching ONE record from sensor_devices table...")
print("-" * 80)
try:
    response = (
        supabase
        .table("sensor_devices")
        .select("*")
        .limit(1)
        .execute()
    )
    
    if response.data:
        record = response.data[0]
        print(f"Found record. Keys/Columns in sensor_devices:")
        print(json.dumps(list(record.keys()), indent=2))
        print("\nFull record:")
        print(json.dumps(record, indent=2, default=str))
    else:
        print("No records found in sensor_devices table")
except Exception as e:
    print(f"Error querying sensor_devices: {e}")

# 2. Get table schema from information_schema
print("\n\n2. Querying information_schema for column details...")
print("-" * 80)
try:
    response = supabase.rpc(
        'get_table_columns',
        {
            'table_name': 'sensor_devices'
        }
    ).execute()
    
    if response.data:
        print("Table columns from information_schema:")
        print(json.dumps(response.data, indent=2, default=str))
    else:
        print("No schema information returned")
except Exception as e:
    print(f"RPC call failed or function doesn't exist: {e}")
    print("\nTrying alternative query using information_schema directly...")
    
    try:
        # Try direct SQL query through Supabase
        response = supabase.rpc(
            'get_columns_info',
            {
                'table_name': 'sensor_devices'
            }
        ).execute()
        print(json.dumps(response.data, indent=2, default=str))
    except Exception as e2:
        print(f"Alternative query also failed: {e2}")

# 3. Get all tables in public schema
print("\n\n3. Listing all tables in public schema...")
print("-" * 80)
try:
    response = supabase.rpc(
        'get_tables_in_schema',
        {
            'schema_name': 'public'
        }
    ).execute()
    
    if response.data:
        print("Tables in public schema:")
        print(json.dumps(response.data, indent=2))
    else:
        print("No tables found or RPC not available")
except Exception as e:
    print(f"Could not fetch table list: {e}")

print("\n" + "=" * 80)
print("QUERY COMPLETE")
print("=" * 80)
