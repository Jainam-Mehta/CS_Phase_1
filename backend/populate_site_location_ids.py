"""
Populate missing locality_id and state_id on sites table.
This is needed because sites were created without these required fields.

Strategy:
1. For each site with NULL locality_id or state_id
2. Try to resolve from address or use a default location
3. Since we don't have pincode/address parsing, use a sensible default
4. Note: This is a temporary fix; ideally sites should be recreated with proper location selection
"""

import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

print("=== Populating site location IDs ===\n")

# Get a default state and locality for fallback
# Use Maharashtra (common state) as default
print("Getting default state and locality...")
try:
    states_result = sb.table('states').select('id, name').eq('name', 'Maharashtra').single().execute()
    if not states_result.data:
        print("Maharashtra not found, using first state...")
        states_result = sb.table('states').select('id, name').limit(1).execute()
    
    if states_result.data:
        default_state = states_result.data
        print(f"Default state: {default_state['name']} (id: {default_state['id']})")
        
        # Get a default locality in this state
        districts_result = sb.table('districts').select('id').eq('state_id', default_state['id']).limit(1).execute()
        if districts_result.data:
            district_id = districts_result.data[0]['id']
            
            localities_result = sb.table('localities').select('id, name').eq('district_id', district_id).limit(1).execute()
            if localities_result.data:
                default_locality = localities_result.data[0]
                print(f"Default locality: {default_locality['name']} (id: {default_locality['id']})\n")
            else:
                print("ERROR: Could not find default locality")
                sys.exit(1)
        else:
            print("ERROR: Could not find district for default state")
            sys.exit(1)
    else:
        print("ERROR: No states found")
        sys.exit(1)
        
except Exception as e:
    print(f"ERROR getting defaults: {e}")
    sys.exit(1)

# Now update sites with missing location IDs
print("Checking sites with missing location IDs...")
try:
    # Get sites with NULL locality_id or state_id
    sites_result = sb.table('sites').select('id, locality_id, state_id').execute()
    
    if not sites_result.data:
        print("No sites found")
        sys.exit(0)
    
    sites_to_update = [s for s in sites_result.data if not s.get('locality_id') or not s.get('state_id')]
    
    if not sites_to_update:
        print("All sites already have location IDs populated!")
        sys.exit(0)
    
    print(f"Found {len(sites_to_update)} sites with missing location IDs\n")
    
    # Update each site
    updated_count = 0
    for site in sites_to_update:
        try:
            update_payload = {}
            if not site.get('locality_id'):
                update_payload['locality_id'] = default_locality['id']
                print(f"Setting locality_id for site {site['id']}")
            if not site.get('state_id'):
                update_payload['state_id'] = default_state['id']
                print(f"Setting state_id for site {site['id']}")
            
            if update_payload:
                # Update the site
                update_result = sb.table('sites').update(update_payload).eq('id', site['id']).execute()
                updated_count += 1
                print(f"  ✓ Updated site {site['id']}")
        except Exception as e:
            print(f"  ✗ Error updating site {site['id']}: {e}")
    
    print(f"\nSuccessfully updated {updated_count} sites")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
