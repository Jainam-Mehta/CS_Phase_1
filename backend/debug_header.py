import csv

csv_path = '..\\datasets\\processed\\products.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)
    
    print("Header fields:")
    for i, field in enumerate(header):
        print(f"  {i}: {repr(field)}")
    
    print(f"\nTotal: {len(header)} fields")
    
    # Check field 17-19
    print(f"\nField 17: {repr(header[17])}")
    print(f"Field 18: {repr(header[18])}")
    print(f"Field 19: {repr(header[19])}")
