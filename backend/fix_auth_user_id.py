import os, glob

src_dir = r'C:\Users\Jainam Mehta\OneDrive\Desktop\CS_Project\frontend\src'
files = glob.glob(os.path.join(src_dir, '**', '*.ts*'), recursive=True)

fixed_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'auth_user_id' in content:
        new_content = content.replace(".eq('auth_user_id'", ".eq('id'")
        new_content = new_content.replace('.eq("auth_user_id"', '.eq("id"')
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print('Fixed:', os.path.basename(filepath))
            fixed_count += 1

print('Total files updated:', fixed_count)
