# Database Migrations

This folder contains SQL migration scripts for database schema changes.

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL from the migration file
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI
```bash
# Make sure you're in the backend directory
cd backend

# Run a specific migration
supabase db execute --file migrations/add_price_per_crate_column.sql
```

### Option 3: Using psql (PostgreSQL CLI)
```bash
# Connect to your database
psql "your-database-connection-string"

# Run the migration file
\i migrations/add_price_per_crate_column.sql
```

## Migration Files

### `add_price_per_crate_column.sql`
**Purpose:** Adds `price_per_crate` column to `farmer_room_access` table

**What it does:**
- Adds a `DECIMAL(10, 2)` column to store pricing per crate per farmer
- Creates an index for better query performance
- Safe to run multiple times (checks if column exists first)

**When to run:** Before using the Facilities Details feature in Settings page

## Notes
- All migrations are idempotent (safe to run multiple times)
- Always backup your database before running migrations
- Test migrations on a development/staging environment first
