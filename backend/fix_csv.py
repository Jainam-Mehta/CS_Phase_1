import csv

csv_path = '..\\datasets\\processed\\products.csv'

# Read all rows with explicit newline handling
with open(csv_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    
# Parse manually to handle trailing commas
header_line = lines[0].strip()
header = header_line.split(',')

print(f'Header: {len(header)} fields')

# Process data rows
fixed_rows = []
for line_num, line in enumerate(lines[1:], 1):
    line = line.strip()
    if not line:
        continue
    
    # Remove trailing comma if present
    if line.endswith(','):
        line = line[:-1]
    
    fields = line.split(',')
    
    # Ensure 20 fields
    while len(fields) < len(header):
        fields.append('')
    while len(fields) > len(header):
        fields.pop()
    
    fixed_rows.append(fields)

print(f'Fixed {len(fixed_rows)} rows')

# Write back with csv.writer
with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(fixed_rows)

# Verify
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows_list = list(reader)
    
    print('\nSample rows:')
    for i, row in enumerate(rows_list[:3]):
        print(f'  {i}: {row["name"]:15} is_active={repr(row["is_active"])}')
    
    active_count = sum(1 for row in rows_list if row['is_active'].strip() == '1')
    print(f'\nTotal active: {active_count}/{len(rows_list)}')
