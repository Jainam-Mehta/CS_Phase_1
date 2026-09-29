"""Fix all .single() patterns in seed_demo_profiles.py"""
content = open('seed_demo_profiles.py', 'r', encoding='utf-8').read()
fixed = content.replace('.select().single().execute()', '.select().execute()')
# Fix data access patterns: .data['id'] -> .data[0]['id']  and .data['key'] -> .data[0]['key']
import re
# Fix patterns like:  res.data['id']  ->  res.data[0]['id']
fixed = re.sub(r'(admin\.table\(.*?\)(?:.*?\n)*?.*?)\.data\[\'(\w+)\'\]',
               lambda m: m.group(0).replace(f".data['{m.group(2)}']", f".data[0]['{m.group(2)}']"),
               fixed)
open('seed_demo_profiles.py', 'w', encoding='utf-8').write(fixed)
print("Done")
