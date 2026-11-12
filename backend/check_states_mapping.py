import os
import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# Get all states from states table
print('--- States from states table ---')
states_result = sb.table('states').select('name').execute()
if states_result.data:
    db_states = sorted([s['name'] for s in states_result.data])
    print(f'Total states in states table: {len(db_states)}')
    for i, state in enumerate(db_states):
        print(f'  {i+1}. {state}')

# Get all states from market_prices
print('\n--- States from market_prices table ---')
mp_states = [
    'Andaman And Nicobar Islands',
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu And Kashmir',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
]
print(f'First 20 of 39 states in market_prices:')
for i, state in enumerate(mp_states, 1):
    print(f'  {i}. {state}')

# Try to find matches
print('\n--- Matching ---')
if states_result.data:
    db_state_set = set(s['name'] for s in states_result.data)
    mp_state_set = set(mp_states)
    
    matches = db_state_set & mp_state_set
    print(f'Exact matches: {len(matches)}')
    
    no_match_in_mp = db_state_set - mp_state_set
    print(f'In states table but not market_prices: {len(no_match_in_mp)}')
    if no_match_in_mp:
        for state in sorted(no_match_in_mp)[:10]:
            print(f'  - {state}')
    
    no_match_in_db = mp_state_set - db_state_set
    print(f'In market_prices but not states table: {len(no_match_in_db)}')
    if no_match_in_db:
        for state in sorted(no_match_in_db):
            print(f'  - {state}')
