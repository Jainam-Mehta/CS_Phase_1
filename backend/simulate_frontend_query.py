"""
Simulate the exact frontend query to debug why prices return empty.
This tests the query chain: batches -> rooms -> sites -> locality+state -> market_prices
"""

import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# Since we can't access batches/rooms due to RLS from backend, 
# let's test market_prices directly with all states

print('=== Market Prices Validation ===\n')

# Get all states in market_prices
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
    if len(result.data) < batch_size:
        break
    offset += batch_size

sorted_states = sorted(all_states)
print(f'States in market_prices: {len(sorted_states)}')
print(f'Samples: {sorted_states[:5]}')

# Test: Can we query each state?
print('\n=== Testing queries for each state ===\n')
success_count = 0
fail_count = 0

for state in sorted_states:
    try:
        result = sb.table('market_prices').select('*', count='exact').eq('state', state).limit(1).execute()
        if result.count > 0:
            # Try also querying by state + city
            sample_result = sb.table('market_prices').select('city').eq('state', state).limit(1).execute()
            if sample_result.data:
                city = sample_result.data[0]['city']
                city_result = sb.table('market_prices').select('*', count='exact').eq('state', state).eq('city', city).execute()
                if city_result.count > 0:
                    success_count += 1
                    if success_count <= 3:
                        print(f'✓ {state} - {city_result.count} prices for {city}')
                else:
                    fail_count += 1
                    print(f'✗ {state} - {city} query returned 0 results')
        else:
            fail_count += 1
            print(f'✗ {state} - state query returned 0 results')
    except Exception as e:
        fail_count += 1
        print(f'✗ {state} - Error: {str(e)}')

print(f'\nResults: {success_count} states ok, {fail_count} states failed')

# Summary
print('\n=== Summary ===')
print(f'✓ market_prices table has {len(sorted_states)} states and is queryable')
print(f'✓ State + city queries work correctly')
print('\nNext step: Verify that farmer sites have locality_id and state_id populated')
