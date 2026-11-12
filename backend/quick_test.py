#!/usr/bin/env python3
import sys
sys.path.insert(0, '/app')

from app.database.supabase import supabase
from datetime import datetime, timezone

print("Testing Supabase connection and batch insert...")

# Try a simple insert
try:
    record = {
        "product_id": None,
        "state": "Test",
        "city": "Test City",
        "market_name": "Test Market",
        "price_per_kg": 50.0,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "source": "test",
        "api_source": "test",
        "is_verified": True,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    
    result = supabase.table('market_prices').insert([record]).execute()
    print(f"✓ Insert test successful: {len(result.data)} records")
    
except Exception as e:
    print(f"✗ Error: {str(e)}")
    sys.exit(1)
