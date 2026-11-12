import csv

csv_path = '..\\datasets\\processed\\products.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for i, row in enumerate(reader):
        if i < 5:
            print('Row', i, ':', 'name=', repr(row['name']), 'is_active=', repr(row['is_active']))
        if i >= 4:
            break

# Count all products with is_active values
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_products = list(reader)
    active_vals = [row['is_active'] for row in all_products]
    print('\nUnique is_active values:', set(active_vals))
    print('Count by value:')
    for val in set(active_vals):
        count = sum(1 for row in all_products if row['is_active'] == val)
        print(f'  {repr(val)}: {count}')
