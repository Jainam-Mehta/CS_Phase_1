import os
import httpx
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Content-Type": "application/json"
}

print("Testing Supabase REST endpoints...")

# Check rest schema / rpc
r = httpx.get(f"{url}/rest/v1/", headers=headers)
print("Root REST status:", r.status_code)

# Check if sql or pg endpoints exist
r_pg = httpx.post(f"{url}/rest/v1/rpc", headers=headers, json={})
print("RPC endpoint status:", r_pg.status_code, r_pg.text)
