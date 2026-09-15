#!/usr/bin/env python3
"""
Run database migrations via Supabase SQL Editor
Usage: python run_migrations.py
"""

import os
from pathlib import Path
from app.database.supabase import supabase

def run_migration(migration_file: str) -> bool:
    """
    Execute a SQL migration file
    """
    try:
        migration_path = Path(__file__).parent / "migrations" / migration_file
        if not migration_path.exists():
            print(f"❌ Migration file not found: {migration_path}")
            return False
        
        with open(migration_path, 'r') as f:
            sql = f.read()
        
        # Execute SQL via Supabase
        # Note: This requires the service role key with admin privileges
        result = supabase.postgrest.raw(sql)
        print(f"✅ Migration '{migration_file}' executed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Migration '{migration_file}' failed: {str(e)}")
        return False

def main():
    print("🔄 Running ColdSense database migrations...\n")
    
    migrations = [
        "001_create_roles_table.sql",
        "002_add_role_id_to_profiles.sql",
        "003_verify_facilities_schema.sql"
    ]
    
    results = []
    for migration in migrations:
        print(f"Running: {migration}")
        success = run_migration(migration)
        results.append((migration, success))
        print()
    
    print("=" * 60)
    print("Migration Summary:")
    print("=" * 60)
    
    passed = sum(1 for _, success in results if success)
    failed = sum(1 for _, success in results if not success)
    
    for migration, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {migration}")
    
    print(f"\nTotal: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 All migrations completed successfully!")
        return 0
    else:
        print(f"\n⚠️  {failed} migration(s) failed. Please review and retry.")
        return 1

if __name__ == "__main__":
    exit(main())
