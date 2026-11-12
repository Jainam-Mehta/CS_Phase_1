import sys
sys.path.insert(0, 'app')
from database.connection import get_db
from dotenv import load_dotenv

load_dotenv()
sb = get_db()

# Test query: Get some prices for Andhra Pradesh
result = sb.table('market_prices').select('*').eq('state', 'Andhra Pradesh').limit(5).execute()
print('Sample Andhra Pradesh prices:')
if result.data:
    for r in result.data:
        city = r.get('city')
        market = r.get('market_name')
        price = r.get('price_per_kg')
        print(f'  City: {city}, Market: {market}, Price: {price}')
else:
    print('No results')

# Test query: Try to find prices for a specific city
print('\nTesting query for specific city:')
# Get first city from Andhra Pradesh
if result.data:
    first_city = result.data[0]['city']
    city_result = sb.table('market_prices').select('*').eq('state', 'Andhra Pradesh').eq('city', first_city).limit(3).execute()
    print(f'Searching for: state=Andhra Pradesh, city={first_city}')
    print(f'Found: {len(city_result.data) if city_result.data else 0} records')
    if city_result.data:
        for r in city_result.data:
            market = r.get('market_name')
            price = r.get('price_per_kg')
            print(f'  - {market}: {price}')
