"""
Trace the exact query flow to find where prices are returning empty.
"""

import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

print("=== Tracing Market Price Query Flow ===\n")

# Step 1: Check if there are any sites
print("Step 1: Check sites table")
try:
    sites_result = sb.table('sites').select('id, locality_id, state_id', count='exact').limit(1).execute()
    print(f"  Sites exist: {sites_result.count > 0}")
    if sites_result.data:
        site = sites_result.data[0]
        print(f"  Sample site: {site}")
        print(f"  Has locality_id: {site.get('locality_id') is not None}")
        print(f"  Has state_id: {site.get('state_id') is not None}")
except Exception as e:
    print(f"  ERROR: {e}")

# Step 2: Pick a site and trace the query
print("\nStep 2: Get sites with non-null locality_id and state_id")
try:
    # Query sites with both fields populated
    sites_result = sb.table('sites').select('id, locality_id, state_id').execute()
    valid_sites = [s for s in (sites_result.data or []) if s.get('locality_id') and s.get('state_id')]
    print(f"  Sites with both locality_id AND state_id: {len(valid_sites)}")
    
    if not valid_sites:
        print("  WARNING: NO sites have both locality_id and state_id populated!")
        # Show what we do have
        all_sites = sites_result.data or []
        print(f"  Total sites: {len(all_sites)}")
        for i, s in enumerate(all_sites[:3]):
            print(f"    Site {i+1}: locality_id={s.get('locality_id')}, state_id={s.get('state_id')}")
    else:
        # Use first valid site
        test_site = valid_sites[0]
        print(f"  Using site: {test_site['id']}")
        
        # Step 3: Resolve locality name
        print(f"\nStep 3: Resolve locality name from locality_id={test_site['locality_id']}")
        try:
            locality_result = sb.table('localities').select('id, name').eq('id', test_site['locality_id']).single().execute()
            locality = locality_result.data
            print(f"  Locality found: {locality}")
            locality_name = locality.get('name')
        except Exception as e:
            print(f"  ERROR resolving locality: {e}")
            locality_name = None
        
        # Step 4: Resolve state name
        print(f"\nStep 4: Resolve state name from state_id={test_site['state_id']}")
        try:
            state_result = sb.table('states').select('id, name').eq('id', test_site['state_id']).single().execute()
            state = state_result.data
            print(f"  State found: {state}")
            state_name = state.get('name')
        except Exception as e:
            print(f"  ERROR resolving state: {e}")
            state_name = None
        
        # Step 5: Query market prices
        if locality_name and state_name:
            print(f"\nStep 5: Query market_prices with state={state_name}, city={locality_name}")
            try:
                prices_result = sb.table('market_prices').select('*', count='exact').eq('state', state_name).eq('city', locality_name).limit(10).execute()
                print(f"  Records found: {prices_result.count}")
                if prices_result.data:
                    print(f"  Sample prices:")
                    for p in prices_result.data[:3]:
                        print(f"    - {p.get('market_name')}: ₹{p.get('price_per_kg')}/kg")
                else:
                    print(f"  NO RECORDS FOUND for this state/city combination")
                    
                    # Debug: Check what values exist in market_prices for this state
                    print(f"\n  DEBUG: What cities exist for state '{state_name}'?")
                    cities_result = sb.table('market_prices').select('city', count='exact').eq('state', state_name).limit(1).execute()
                    if cities_result.count > 0:
                        sample_cities = sb.table('market_prices').select('distinct city').eq('state', state_name).limit(5).execute()
                        print(f"  Cities in market_prices for '{state_name}':")
                        for c in (sample_cities.data or []):
                            print(f"    - {c.get('city')}")
                    else:
                        print(f"  No records at all for state '{state_name}'")
                        
            except Exception as e:
                print(f"  ERROR querying market_prices: {e}")
        else:
            print(f"  Cannot query: locality_name={locality_name}, state_name={state_name}")

except Exception as e:
    print(f"ERROR: {e}")
