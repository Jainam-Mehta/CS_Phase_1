"""
Inspect the actual columns in the sites table to verify schema
"""

import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# Query one site record with all fields
print("=== Inspecting sites table structure ===\n")

try:
    # Get one record with all fields
    result = sb.table('sites').select('*').limit(1).execute()
    
    if result.data:
        site = result.data[0]
        print("Columns found in sites table:")
        for key in sorted(site.keys()):
            value = site[key]
            if isinstance(value, str):
                display_value = value[:50] if len(value) > 50 else value
            else:
                display_value = str(value)[:50]
            print(f"  • {key}: {display_value}")
        
        # Specific checks
        print("\n=== Key Field Checks ===")
        has_locality_code = 'locality_code' in site
        has_pincode = 'pincode' in site
        has_site_code = 'site_code' in site
        has_locality_id = 'locality_id' in site
        has_state_id = 'state_id' in site
        
        print(f"locality_code present: {has_locality_code}")
        if has_locality_code:
            print(f"  Value: {site['locality_code']}")
        
        print(f"pincode present: {has_pincode}")
        if has_pincode:
            print(f"  Value: {site['pincode']}")
        
        print(f"site_code present: {has_site_code}")
        if has_site_code:
            print(f"  Value: {site['site_code']}")
        
        print(f"locality_id present: {has_locality_id}")
        if has_locality_id:
            print(f"  Value: {site['locality_id']}")
        
        print(f"state_id present: {has_state_id}")
        if has_state_id:
            print(f"  Value: {site['state_id']}")
        
    else:
        print("No records found in sites table")

except Exception as e:
    print(f"Error: {e}")
