#!/usr/bin/env python3
"""
Count total records in market_prices table
"""

import sys
from app.database.supabase import supabase

def count_records():
    try:
        print("Counting total records in market_prices table...")
        
        # Query to count all records
        result = supabase.table('market_prices').select('id', count='exact').execute()
        
        total_count = result.count if hasattr(result, 'count') else 0
        print(f"Total records in market_prices: {total_count}")
        
        # Get breakdown by state
        print("\nGetting record count by state...")
        result = supabase.table('market_prices').select('state').execute()
        
        if result.data:
            state_counts = {}
            for record in result.data:
                state = record.get('state', 'Unknown')
                state_counts[state] = state_counts.get(state, 0) + 1
            
            print(f"\nRecords by state ({len(state_counts)} states):")
            for state in sorted(state_counts.keys()):
                print(f"  {state}: {state_counts[state]}")
            
            print(f"\nTotal: {sum(state_counts.values())} records")
        
        return 0
        
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(count_records())
