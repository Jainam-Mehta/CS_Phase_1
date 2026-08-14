"""
Import Complete Indian Administrative Dataset
=============================================
This script imports the complete Indian States → Districts → Localities dataset
from the CSV files in datasets/processed/ into Supabase.

The CSV files use UUIDs, but the database uses SERIAL IDs. This script handles
the mapping between UUIDs and SERIAL IDs.
"""

import csv
import os
from pathlib import Path
from app.database.supabase import supabase

# Path to CSV files
CSV_DIR = Path(__file__).parent.parent / "datasets" / "processed"

def clear_existing_data():
    """Clear existing location data from Supabase"""
    print("Clearing existing location data...")
    
    # Skip clearing - just note that we're appending
    print("  Note: Skipping clear (will append to existing data)")
    print("  Done")

def import_states():
    """Import states from CSV and return UUID to ID mapping"""
    print("Importing states...")
    
    states_file = CSV_DIR / "states.csv"
    uuid_to_id = {}
    
    # First, get existing states to map them
    existing = supabase.table('states').select('*').execute()
    existing_name_to_id = {s['name']: s['id'] for s in existing.data}
    
    with open(states_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            uuid = row['id']
            name = row['name']
            code = row.get('code', '')
            
            # Check if state already exists
            if name in existing_name_to_id:
                serial_id = existing_name_to_id[name]
                uuid_to_id[uuid] = serial_id
                print(f"  [SKIP] {name} already exists (ID: {serial_id})")
                continue
            
            # Insert state and get the SERIAL ID
            result = supabase.table('states').insert({
                'name': name
            }).execute()
            
            serial_id = result.data[0]['id']
            uuid_to_id[uuid] = serial_id
            print(f"  [OK] {name} (UUID: {uuid[:8]}... -> ID: {serial_id})")
    
    print(f"[OK] Imported {len(uuid_to_id)} states")
    return uuid_to_id

def import_districts(state_uuid_to_id):
    """Import districts from CSV"""
    print("Importing districts...")
    
    districts_file = CSV_DIR / "districts.csv"
    district_uuid_to_id = {}
    
    # Get existing districts
    existing = supabase.table('districts').select('*').execute()
    existing_key_to_id = {(d['name'], d['state_id']): d['id'] for d in existing.data}
    
    with open(districts_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            uuid = row['id']
            state_uuid = row['state_id']
            name = row['name']
            
            # Map state UUID to SERIAL ID
            state_id = state_uuid_to_id.get(state_uuid)
            if not state_id:
                print(f"  [WARN] Skipping {name}: state UUID {state_uuid} not found")
                continue
            
            # Check if district already exists
            key = (name, state_id)
            if key in existing_key_to_id:
                serial_id = existing_key_to_id[key]
                district_uuid_to_id[uuid] = serial_id
                print(f"  [SKIP] {name} already exists (ID: {serial_id})")
                continue
            
            # Insert district and get the SERIAL ID
            result = supabase.table('districts').insert({
                'name': name,
                'state_id': state_id
            }).execute()
            
            serial_id = result.data[0]['id']
            district_uuid_to_id[uuid] = serial_id
            print(f"  [OK] {name} (UUID: {uuid[:8]}... -> ID: {serial_id})")
    
    print(f"[OK] Imported {len(district_uuid_to_id)} districts")
    return district_uuid_to_id

def import_localities(district_uuid_to_id):
    """Import localities from CSV"""
    print("Importing localities...")
    
    localities_file = CSV_DIR / "localities.csv"
    count = 0
    skipped = 0
    
    # Get existing localities
    existing = supabase.table('localities').select('*').execute()
    existing_key_to_id = {(l['name'], l['district_id']): l['id'] for l in existing.data}
    
    with open(localities_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            uuid = row['id']
            district_uuid = row['district_id']
            name = row['name']
            pincode = row.get('pincode', '')
            
            # Map district UUID to SERIAL ID
            district_id = district_uuid_to_id.get(district_uuid)
            if not district_id:
                print(f"  [WARN] Skipping {name}: district UUID {district_uuid} not found")
                continue
            
            # Check if locality already exists
            key = (name, district_id)
            if key in existing_key_to_id:
                skipped += 1
                if skipped % 1000 == 0:
                    print(f"  Progress: {skipped} localities skipped...")
                continue
            
            # Insert locality
            supabase.table('localities').insert({
                'name': name,
                'district_id': district_id
            }).execute()
            
            count += 1
            if count % 1000 == 0:
                print(f"  Progress: {count} localities imported...")
    
    print(f"[OK] Imported {count} localities (skipped {skipped} existing)")

def check_bajaura():
    """Check if Bajaura exists in the database"""
    print("\nChecking for Bajaura...")
    
    # Get Himachal Pradesh state
    hp = supabase.table('states').select('*').eq('name', 'Himachal Pradesh').execute()
    if not hp.data:
        print("  [ERROR] Himachal Pradesh not found")
        return None, None
    
    hp_id = hp.data[0]['id']
    print(f"  Himachal Pradesh ID: {hp_id}")
    
    # Get Kullu district
    kullu = supabase.table('districts').select('*').eq('name', 'Kullu').eq('state_id', hp_id).execute()
    if not kullu.data:
        print("  [ERROR] Kullu district not found")
        return None, None
    
    kullu_id = kullu.data[0]['id']
    print(f"  Kullu district ID: {kullu_id}")
    
    # Check for Bajaura
    bajaura = supabase.table('localities').select('*').eq('name', 'Bajaura').eq('district_id', kullu_id).execute()
    if bajaura.data:
        print(f"  [OK] Bajaura found! ID: {bajaura.data[0]['id']}")
        return kullu_id, bajaura.data[0]['id']
    else:
        print(f"  [NOT FOUND] Bajaura does not exist in Kullu district")
        print(f"  Searching for Bajaura in all districts...")
        
        # Search for Bajaura anywhere
        all_bajaura = supabase.table('localities').select('*').eq('name', 'Bajaura').execute()
        if all_bajaura.data:
            print(f"  Found {len(all_bajaura.data)} locality(s) named Bajaura:")
            for loc in all_bajaura.data:
                # Get district name
                dist = supabase.table('districts').select('name').eq('id', loc['district_id']).execute()
                dist_name = dist.data[0]['name'] if dist.data else 'Unknown'
                print(f"    - {loc['name']} in {dist_name} district (ID: {loc['id']})")
        else:
            print(f"  [NOT FOUND] Bajaura does not exist anywhere in the database")
    
    return kullu_id, None

def add_bajaura(kullu_id):
    """Add Bajaura to Kullu district"""
    print("\nAdding Bajaura to Kullu district...")
    
    result = supabase.table('localities').insert({
        'name': 'Bajaura',
        'district_id': kullu_id
    }).execute()
    
    bajaura_id = result.data[0]['id']
    print(f"  [OK] Bajaura added! ID: {bajaura_id}")
    return bajaura_id

def main():
    """Main import function"""
    print("=" * 60)
    print("Checking Indian Administrative Dataset")
    print("=" * 60)
    
    # Check if Bajaura exists
    kullu_id, bajaura_id = check_bajaura()
    
    # Add Bajaura if it doesn't exist
    if kullu_id and not bajaura_id:
        bajaura_id = add_bajaura(kullu_id)
    
    print("=" * 60)

if __name__ == "__main__":
    main()