import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

print('=== Market Prices Data ===')
result = sb.table('market_prices').select('state', count='exact').limit(1).execute()
print(f'Total records: {result.count}')

# Get unique states
states = set()
for offset in range(0, min(10000, result.count), 1000):
    r = sb.table('market_prices').select('state').offset(offset).limit(1000).execute()
    for record in r.data or []:
        states.add(record['state'])

print(f'Unique states: {len(states)}')
print('Sample states:', sorted(states)[:5])

# Get sample data for first state
if states:
    test_state = sorted(states)[0]
    print(f'\nSample data for state: {test_state}')
    sample = sb.table('market_prices').select('state, city, market_name, price_per_kg').eq('state', test_state).limit(3).execute()
    for record in sample.data or []:
        city = record.get('city')
        market = record.get('market_name')
        price = record.get('price_per_kg')
        print(f'  {city}: {market} - Rs{price}')
