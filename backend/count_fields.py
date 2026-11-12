import csv

csv_path = '..\\datasets\\processed\\products.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check raw data row 1
raw_line = lines[1]
print("Raw line 1:")
print(repr(raw_line))

# Split by comma manually
parts = raw_line.split(',')
print(f"\nManual split: {len(parts)} parts")
for i, part in enumerate(parts):
    print(f"  {i}: {repr(part)}")

# Now with csv.reader
print("\n\nUsing csv.reader:")
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    next(reader)  # skip header
    row1 = next(reader)
    for i, field in enumerate(row1):
        print(f"  {i}: {repr(field)}")
