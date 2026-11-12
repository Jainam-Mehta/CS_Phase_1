import csv

csv_path = '..\\datasets\\processed\\products.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    products = [row['name'] for row in reader if row['is_active'].strip() == '1']

print(f"Total active products in CSV: {len(products)}\n")
print("Products:")
for i, product in enumerate(sorted(products), 1):
    print(f"{i:3}. {product}")
