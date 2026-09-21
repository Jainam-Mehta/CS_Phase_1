import csv
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Set sys.stdout encoding for Windows cp1252 compatibility
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Missing credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
CSV_DIR = Path(__file__).parent.parent / "datasets" / "processed"

def import_states():
    print("--- STATES ---")
    states_file = CSV_DIR / "states.csv"
    if not states_file.exists():
        print(f"[ERROR] {states_file} not found")
        return
    
    # Check existing states
    existing = supabase.table('states').select('id, name').execute()
    existing_ids = {s['id'] for s in existing.data}
    existing_names = {s['name'] for s in existing.data}
    print(f"Current states in DB: {len(existing_ids)}")
    
    to_insert = []
    with open(states_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            s_id = row['id']
            s_name = row['name']
            s_code = row.get('code', '')
            if s_id not in existing_ids and s_name not in existing_names:
                to_insert.append({
                    'id': s_id,
                    'name': s_name,
                    'code': s_code
                })
    
    if to_insert:
        print(f"Inserting {len(to_insert)} new states...")
        supabase.table('states').insert(to_insert).execute()
        print("[OK] States inserted")
    else:
        print("[OK] All states up to date")

def import_districts():
    print("\n--- DISTRICTS ---")
    districts_file = CSV_DIR / "districts.csv"
    if not districts_file.exists():
        print(f"[ERROR] {districts_file} not found")
        return
    
    existing = supabase.table('districts').select('id').execute()
    existing_ids = {d['id'] for d in existing.data}
    print(f"Current districts in DB: {len(existing_ids)}")
    
    to_insert = []
    with open(districts_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            d_id = row['id']
            state_id = row['state_id']
            name = row['name']
            code = row.get('code', '')
            if d_id not in existing_ids:
                to_insert.append({
                    'id': d_id,
                    'state_id': state_id,
                    'name': name,
                    'code': code
                })
    
    if to_insert:
        print(f"Inserting {len(to_insert)} new districts in chunks...")
        chunk_size = 500
        for i in range(0, len(to_insert), chunk_size):
            chunk = to_insert[i:i + chunk_size]
            supabase.table('districts').insert(chunk).execute()
            print(f"  Inserted {i + len(chunk)} / {len(to_insert)} districts...")
        print("[OK] Districts inserted")
    else:
        print("[OK] All districts up to date")

def import_localities():
    print("\n--- LOCALITIES ---")
    localities_file = CSV_DIR / "localities.csv"
    if not localities_file.exists():
        print(f"[ERROR] {localities_file} not found")
        return
    
    # Get existing district IDs to ensure foreign key validity
    districts_res = supabase.table('districts').select('id').execute()
    valid_district_ids = {d['id'] for d in districts_res.data}
    print(f"Valid district IDs in DB: {len(valid_district_ids)}")
    
    # Get current localities count
    res_loc = supabase.table('localities').select('id', count='exact').limit(1).execute()
    existing_count = res_loc.count if res_loc.count is not None else 0
    print(f"Current localities in DB: {existing_count}")
    
    # Read localities CSV
    print("Reading localities.csv...")
    batch = []
    batch_size = 1000
    inserted_total = 0
    skipped_district = 0
    
    with open(localities_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            loc_id = row['id']
            district_id = row['district_id']
            name = row['name']
            postal_code = row.get('postal_code') or row.get('pincode') or ''
            
            if district_id not in valid_district_ids:
                skipped_district += 1
                continue
            
            batch.append({
                'id': loc_id,
                'district_id': district_id,
                'name': name,
                'pincode': postal_code
            })
            
            if len(batch) >= batch_size:
                try:
                    supabase.table('localities').upsert(batch, on_conflict='id').execute()
                    inserted_total += len(batch)
                    print(f"  Processed {inserted_total} localities...")
                except Exception as e:
                    print(f"  [ERROR] Error inserting batch: {str(e)[:150]}")
                    # Try item by item if batch fails
                    for item in batch:
                        try:
                            supabase.table('localities').upsert(item, on_conflict='id').execute()
                            inserted_total += 1
                        except Exception:
                            pass
                batch = []
        
        if batch:
            try:
                supabase.table('localities').upsert(batch, on_conflict='id').execute()
                inserted_total += len(batch)
            except Exception as e:
                print(f"  [ERROR] Error inserting final batch: {str(e)[:150]}")
    
    print(f"[OK] Localities import finished! Total processed/upserted: {inserted_total} (Skipped due to invalid district_id: {skipped_district})")

if __name__ == "__main__":
    print("==================================================")
    print("SUPABASE GEOGRAPHIC DATA IMPORT")
    print("==================================================")
    import_states()
    import_districts()
    import_localities()
