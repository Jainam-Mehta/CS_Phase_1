import csv

csv_path = '..\\datasets\\processed\\products.csv'

# Read all rows
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    rows = list(reader)

print(f'Header: {len(header)} fields')
print(f'First data row: {len(rows[0])} fields')
print(f'Total rows: {len(rows)}')

# The issue: data has 20 fields but field 18 contains is_active value (should be field 19)
# Fix: shift the last field - move the is_active value to the correct position
fixed_rows = []
for row in rows:
    if len(row) == 20:
        # Row has: [...fields..., icon_data, is_active_value, trailing_empty]
        # Should be: [...fields..., icon_data, image_url_data, is_active_value]
        # So we need to insert empty string at position 18 (image_url)
        # and move current field 18 to field 19
        
        # Actually, let's just reorder the last 2 fields
        # Current: [..., field_17, field_18(=1), field_19(=empty)]
        # Desired: [..., field_17(icon), field_18(image_url), field_19(is_active=1)]
        
        # field_17 is icon (should be empty based on original)
        # field_18 is currently is_active value (1)
        # field_19 is currently empty (from trailing comma)
        
        # So we need: field_17='', field_18='', field_19=field_18_old
        fixed_row = row[:18] + ['', row[18]]  # Insert empty for image_url, keep is_active
    else:
        fixed_row = row
    
    fixed_rows.append(fixed_row)

# Write back
with open(csv_path, 'w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(fixed_rows)

print(f'Fixed and wrote back {len(fixed_rows)} rows')

# Verify
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    rows_list = list(reader)
    
    print('\nVerification:')
    for i, row in enumerate(rows_list[:3]):
        print(f'  {i}: name={row["name"]}, is_active={repr(row["is_active"])}')
    
    active = sum(1 for row in rows_list if row['is_active'].strip() == '1')
    print(f'\nActive products: {active}/{len(rows_list)}')
