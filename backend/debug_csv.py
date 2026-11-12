import csv

csv_path = '..\\datasets\\processed\\products.csv'

print("=== Reading with csv.reader ===")
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader):
        if i < 3:
            print(f"Row {i}: {len(row)} fields")
            print(f"  Field 18 (icon): {repr(row[18] if len(row) > 18 else 'N/A')}")
            print(f"  Field 19 (image_url): {repr(row[19] if len(row) > 19 else 'N/A')}")
            print(f"  Field 20 (is_active): {repr(row[20] if len(row) > 20 else 'N/A')}")
        if i >= 2:
            break
