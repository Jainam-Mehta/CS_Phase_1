# Database Migration Instructions - CRITICAL

## ❌ Problem

The original migration only renamed the `facilities` table to `sites`, but **did NOT rename the `facility_id` columns** in dependent tables.

**Current database state:**
- ✅ Table: `facilities` → `sites` (renamed)
- ❌ Columns: Still called `facility_id` in:
  - `cold_storage_rooms.facility_id` (should be `site_id`)
  - `stakeholder_investments.facility_id` (should be `site_id`)
  - `activity_logs.facility_id` (should be `site_id`)
  - `alerts.facility_id` (should be `site_id`)
  - `expenses.facility_id` (should be `site_id`)

**Error:** When trying to create a room:
```
null value in column "facility_id" of relation "cold_storage_rooms" violates not-null constraint
```

This happens because the frontend is sending `site_id: ...` but the database expects `facility_id: ...`

---

## ✅ Solution: Run the Complete Migration

### Step 1: Access Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your ColdSense project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Paste the Migration
Copy the entire contents of `DATABASE_MIGRATION_COMPLETE.sql` from this repository and paste it into the SQL editor.

### Step 3: Run the Migration
1. Click **Run** button (or Cmd+Enter / Ctrl+Enter)
2. Wait for the query to complete
3. You should see **No Errors** message

### Step 4: Verify the Migration
Run these verification queries one-by-one:

```sql
-- Check cold_storage_rooms has site_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cold_storage_rooms' AND column_name LIKE '%site%';
-- Should return: site_id

-- Check stakeholder_investments has site_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'stakeholder_investments' AND column_name LIKE '%site%';
-- Should return: site_id

-- Check activity_logs has site_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'activity_logs' AND column_name LIKE '%site%';
-- Should return: site_id

-- Check alerts has site_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'alerts' AND column_name LIKE '%site%';
-- Should return: site_id

-- Check expenses has site_id column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name LIKE '%site%';
-- Should return: site_id

-- Check that data still exists
SELECT COUNT(*) FROM public.sites;
SELECT COUNT(*) FROM public.cold_storage_rooms;
```

---

## 🚀 After Migration

1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart your frontend dev server
3. Try Owner Setup Wizard again
4. Should now work! ✅

---

## 🔍 What This Migration Does

1. **Drops dependent views** (they reference old column names)
2. **Renames `facilities` table** to `sites`
3. **Renames `facility_id` column to `site_id`** in 5 tables
4. **Recreates views** with new column names
5. **Updates RLS policies** to use `site_id`
6. **All data is preserved** - no deletions, just renaming

---

## ⚠️ If Something Goes Wrong

If the migration fails:

1. Check the error message in Supabase SQL editor
2. Most likely issue: A view or policy is blocking the rename
3. **Solution:** The complete migration file already handles this by dropping views first
4. If you still hit issues, contact support with the error message

---

## ❓ Why Did This Happen?

The original migration was too simplistic. It only renamed the table but forgot that:
- The `cold_storage_rooms` table still had `facility_id` column
- All 5 dependent tables still had `facility_id` column
- The views and policies still referenced old names

This complete migration fixes all of that.

---

**Next:** Run `DATABASE_MIGRATION_COMPLETE.sql` on your Supabase database, then test locally! 🚀
