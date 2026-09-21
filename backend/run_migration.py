#!/usr/bin/env python3
"""
Execute the facility→site database migration via Supabase RPC.
This script safely renames all tables and columns.
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_URL or SUPABASE_KEY not found in .env")
    sys.exit(1)

# Connect to Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL migration queries
MIGRATION_QUERIES = [
    "ALTER TABLE public.facilities RENAME TO sites;",
    "ALTER TABLE public.cold_storage_rooms RENAME COLUMN facility_id TO site_id;",
    "ALTER TABLE public.stakeholder_investments RENAME COLUMN facility_id TO site_id;",
    "ALTER TABLE public.activity_logs RENAME COLUMN facility_id TO site_id;",
    "ALTER TABLE public.alerts RENAME COLUMN facility_id TO site_id;",
    "ALTER TABLE public.expenses RENAME COLUMN facility_id TO site_id;",
]

VERIFICATION_QUERIES = [
    ("Sites count", "SELECT COUNT(*) as count FROM public.sites;"),
    ("Rooms with site_id", "SELECT COUNT(*) as count FROM public.cold_storage_rooms WHERE site_id IS NOT NULL;"),
    ("Investments with site_id", "SELECT COUNT(*) as count FROM public.stakeholder_investments WHERE site_id IS NOT NULL;"),
    ("Activity logs with site_id", "SELECT COUNT(*) as count FROM public.activity_logs WHERE site_id IS NOT NULL;"),
    ("Alerts with site_id", "SELECT COUNT(*) as count FROM public.alerts WHERE site_id IS NOT NULL;"),
    ("Expenses with site_id", "SELECT COUNT(*) as count FROM public.expenses WHERE site_id IS NOT NULL;"),
]

def run_migrations():
    """Execute all migration queries."""
    print("🔄 Starting facility→site database migration...\n")
    
    for i, query in enumerate(MIGRATION_QUERIES, 1):
        try:
            print(f"[{i}/{len(MIGRATION_QUERIES)}] Running: {query[:60]}...")
            result = supabase.postgrest.sql(query).execute()
            print(f"    ✅ Success")
        except Exception as e:
            print(f"    ❌ Failed: {str(e)}")
            return False
    
    print("\n✅ All migrations executed successfully!")
    return True

def verify_migration():
    """Verify all tables renamed correctly."""
    print("\n🔍 Verifying migration...\n")
    
    for label, query in VERIFICATION_QUERIES:
        try:
            result = supabase.postgrest.sql(query).execute()
            count = result[0]["count"] if result else 0
            print(f"✅ {label}: {count} records")
        except Exception as e:
            print(f"⚠️  {label}: Could not verify - {str(e)}")
    
    print("\n" + "="*60)
    print("Migration verification complete!")
    print("="*60)

if __name__ == "__main__":
    print("="*60)
    print("FACILITY → SITE DATABASE MIGRATION")
    print("="*60)
    print("\n⚠️  WARNING: This will rename tables and columns.")
    print("   Ensure you have a backup before proceeding!\n")
    
    response = input("Continue with migration? (yes/no): ").strip().lower()
    if response != "yes":
        print("❌ Migration cancelled.")
        sys.exit(0)
    
    if run_migrations():
        verify_migration()
    else:
        print("\n❌ Migration failed. Please review errors above.")
        sys.exit(1)
