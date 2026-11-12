"""
Fix inconsistent state names in market_prices table to match states table.
Handles cases like "Andaman And Nicobar Islands" vs "Andaman and Nicobar Islands".
"""

import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# State name mappings (incorrect -> correct)
state_corrections = {
    'Andaman And Nicobar Islands': 'Andaman and Nicobar Islands',
    'Jammu And Kashmir': 'Jammu and Kashmir',
}

print('Fixing state names in market_prices...\n')

for old_state, new_state in state_corrections.items():
    try:
        # Count records with old name
        count_result = sb.table('market_prices').select('*', count='exact').eq('state', old_state).execute()
        old_count = count_result.count
        
        if old_count == 0:
            print(f'✓ No records found for "{old_state}", skipping')
            continue
        
        print(f'Updating {old_count} records: "{old_state}" -> "{new_state}"')
        
        # Update the state name
        # We need to fetch and re-insert since Supabase doesn't have UPDATE via SDK
        # Instead, we'll delete old and insert new
        
        # Fetch all records with old state
        fetch_result = sb.table('market_prices').select('*').eq('state', old_state).execute()
        records = fetch_result.data or []
        
        if not records:
            print(f'  ⚠️  Could not fetch records')
            continue
        
        # Update state name in memory
        for record in records:
            record['state'] = new_state
        
        # Delete old records
        delete_result = sb.table('market_prices').delete().eq('state', old_state).execute()
        print(f'  Deleted {old_count} records')
        
        # Re-insert with corrected state
        batch_size = 500
        total_inserted = 0
        for i in range(0, len(records), batch_size):
            batch = records[i:i + batch_size]
            try:
                insert_result = sb.table('market_prices').insert(batch).execute()
                inserted = len(insert_result.data) if insert_result.data else 0
                total_inserted += inserted
                print(f'  Re-inserted batch {i//batch_size + 1}/{(len(records)-1)//batch_size + 1}: {inserted} records (total: {total_inserted})')
            except Exception as e:
                print(f'  Batch {i//batch_size + 1} failed: {str(e)}')
        
        # Verify
        verify_result = sb.table('market_prices').select('*', count='exact').eq('state', new_state).execute()
        new_count = verify_result.count
        print(f'  ✓ Verification: {new_count} records now have state "{new_state}"\n')
        
    except Exception as e:
        print(f'  ❌ Error: {str(e)}\n')

print('Done!')
