import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(url, key)

# Fetch stakeholder investments
response = supabase.table("stakeholder_investments").select("*").execute()

print("=== Stakeholder Investments ===")
for inv in response.data:
    print(f"ID: {inv['id']}, Site: {inv['site_id']}, Status: '{inv['status']}', Stakeholder: {inv['stakeholder_id']}")

print(f"\nTotal: {len(response.data)} investments")
