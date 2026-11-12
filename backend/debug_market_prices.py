import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# Check market_prices table - sample records
result = sb.table('market_prices').select('*').limit(5).execute()
print('Sample market_prices records:')
if result.data:
    for record in result.data:
        state = record.get('state')
        city = record.get('city')
        market = record.get('market_name')
        price = record.get('price_per_kg')
        product_id = record.get('product_id')
        print(f'  State: {state}, City: {city}, Market: {market}, Price: {price}, Product: {product_id}')
else:
    print('No records found')

# Check total count
result2 = sb.table('market_prices').select('*', count='exact').execute()
print(f'\nTotal market_prices records: {result2.count}')

# Check unique states by fetching all records and deduplicating
print('\n--- Fetching all records to check states ---')
all_states = set()
offset = 0
batch_size = 1000
while True:
    result = sb.table('market_prices').select('state').offset(offset).limit(batch_size).execute()
    if not result.data:
        break
    for r in result.data:
        if r.get('state'):
            all_states.add(r['state'])
    offset += batch_size
    print(f'  Fetched {offset} records, found {len(all_states)} unique states so far...')
    if len(result.data) < batch_size:
        break

print(f'\nTotal unique states: {len(all_states)}')
sorted_states = sorted(all_states)
print(f'States:')
for i, state in enumerate(sorted_states):
    if i < 20:
        print(f'  {i+1}. {state}')
    elif i == 20:
        print(f'  ... and {len(sorted_states) - 20} more')

# Test a direct query for a state
if sorted_states:
    test_state = sorted_states[0]
    print(f'\n--- Testing query for "{test_state}" ---')
    test_result = sb.table('market_prices').select('*', count='exact').eq('state', test_state).execute()
    print(f'Records found for {test_state}: {test_result.count}')
    if test_result.data:
        sample = test_result.data[0]
        print(f'Sample: {sample.get("city")} - {sample.get("market_name")}: {sample.get("price_per_kg")}')
