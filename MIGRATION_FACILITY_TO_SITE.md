# Facility → Site Architecture Migration Guide

## Overview
Renaming the architecture from "1 Facility = 1 Cold Storage" to "1 Site = 1+ Rooms" with complete renaming of:
- Table: `facilities` → `sites`
- Column: `facility_id` → `site_id`
- UI: "Facility" → "Site"

## Why This Won't Break Past Modifications

✅ **Pure Rename - No Schema Changes**
- All foreign key constraints renamed automatically
- All data preserved 1:1
- All existing queries will work with renamed columns
- Existing activity logs, expenses, investments all preserved with new `site_id` column

✅ **Backward Compatible Data**
- No data deletion
- No data transformation
- All batches, rooms, sensor readings untouched
- All historical records preserved

---

## Complete facility_id Usage Map

### DATABASE TABLES (6 tables affected)

| Table | Column | Current Usage | New Usage |
|-------|--------|---------------|-----------|
| `facilities` | `id` (PK) | Owner's facility ID | Owner's site ID |
| `cold_storage_rooms` | `facility_id` (FK) | Room belongs to facility | Room belongs to site |
| `stakeholder_investments` | `facility_id` (FK) | Investment in facility | Investment in site |
| `activity_logs` | `facility_id` (FK) | Log for facility action | Log for site action |
| `alerts` | `facility_id` (FK) | Alert for facility | Alert for site |
| `expenses` | `facility_id` (FK) | Expense for facility | Expense for site |

### BACKEND API ENDPOINTS

#### energy.py
- **Line 51**: `@router.get("/facility/{facility_id}/summary")`
  - **Change to**: `@router.get("/site/{site_id}/summary")`
  - **Line 62**: `.eq("facility_id", facility_id)` → `.eq("site_id", site_id)`

#### storage.py
- **Line 48**: `@router.get("/rooms/facility/{facility_id}")`
  - **Change to**: `@router.get("/rooms/site/{site_id}")`
  - **Line 55**: `.eq("facility_id", facility_id)` → `.eq("site_id", site_id)`

#### sites.py
- **Line 41**: `def _get_facility_telemetry(facility_id: str)`
  - **Change to**: `def _get_site_telemetry(site_id: str)`
  - **Line 44**: `.eq("facility_id", facility_id)` → `.eq("site_id", site_id)`

#### seed.py (Demo data)
- **Line 66**: `facility_id = facility['id']`
  - **Change to**: `site_id = facility['id']` (or rename variable entirely)
- **Lines 72, 79, 86**: `"facility_id": facility_id` → `"site_id": site_id`
- **Line 232**: Response includes `"facility_id": facility_id` → `"site_id": site_id`

#### auth.py
- **Line 176**: `async def get_owner_facilities(profile_id: str)`
  - **Change to**: `async def get_owner_sites(profile_id: str)`
  - Query updates same table name change

### FRONTEND TSX FILES (Major files, ~100+ references)

#### OwnerApprovals.tsx (~50 references)
- `selectedFacilityId` → `selectedSiteId`
- `facilitiesData` → `sitesData`
- `facilityIds` → `siteIds`
- `facilityMap` → `siteMap`
- `roomToFacilityMap` → `roomToSiteMap`
- `facility_id` in queries → `site_id`
- "Facility" labels → "Site"
- Line 547, 635: "Facility" UI text → "Site"

#### OwnerDashboard.tsx (~30 references)
- `selectedFacilityId` state → `selectedSiteId`
- Facility queries → Site queries
- `.eq('owner_profile_id', profile.id)` on `facilities` table (now `sites`)

#### OwnerInventory.tsx (~20 references)
- `selectedFacility` → `selectedSite`
- Capacity queries with `facility_id` → `site_id`

#### OwnerMonitoring.tsx (~25 references)
- `selectedFacilityId` → `selectedSiteId`
- Sensor queries by facility → by site
- UI labels "Facility" → "Site"

#### OwnerAlerts.tsx (~15 references)
- `facilitiesData` → `sitesData`
- `facility_id` in queries → `site_id`
- `facility_name` → `site_name`

#### StakeholderDashboard.tsx (~15 references)
- `facilityId` → `siteId`
- Facility telemetry → Site telemetry

#### FarmerInventory.tsx (~20 references)
- Room selection by facility → by site
- `facility_id` in batch allocation → `site_id`

---

## Migration Steps (In Order)

### Phase 1: Database Rename (NO DATA LOSS)
```sql
-- Step 1: Rename table
ALTER TABLE facilities RENAME TO sites;

-- Step 2: Rename primary key columns in dependent tables
ALTER TABLE cold_storage_rooms RENAME COLUMN facility_id TO site_id;
ALTER TABLE stakeholder_investments RENAME COLUMN facility_id TO site_id;
ALTER TABLE activity_logs RENAME COLUMN facility_id TO site_id;
ALTER TABLE alerts RENAME COLUMN facility_id TO site_id;
ALTER TABLE expenses RENAME COLUMN facility_id TO site_id;

-- Step 3: Update foreign key constraints (auto-handled by Supabase RLS)
```

### Phase 2: Backend API Updates
1. `energy.py`: Update endpoint + query
2. `storage.py`: Update endpoint + query
3. `sites.py`: Update function names + queries
4. `seed.py`: Update demo data
5. `auth.py`: Update function names

### Phase 3: Frontend Updates
1. Global text replacement: "Facility" → "Site" (careful to avoid class names)
2. Variable renames: `facilityId` → `siteId`, `facilities` → `sites`
3. Update all Supabase queries: `.eq('facility_id', ...)` → `.eq('site_id', ...)`
4. Update UI labels and placeholders

### Phase 4: New Features
1. Owner site creation: Add "number of rooms" input
2. Farmer flow: Add Site → Room selection hierarchy
3. Multiple farmers per room: Show all approved farmers for each room

---

## Will This Affect Past Modifications?

### ✅ NO - Safe Operations:
- All data preserved exactly as-is
- All timestamps preserved
- All relationships preserved
- All historical records (logs, expenses, investments) preserved
- All sensor data preserved
- No data migration needed

### ⚠️ What Changes:
- **Column names** in Supabase queries (WILL need code updates)
- **API endpoint URLs** (WILL need frontend URL updates)
- **Variable names** in code (IDE can help with refactor)
- **UI text labels** (visible change but no data impact)

### ✅ What Doesn't Change:
- Batches, room allocations, sensor readings
- Activity log history (just the column name)
- Past approvals, investments, expenses
- User profiles, authentication
- Any file structure or relationships

---

## Backward Compatibility Verification

After migration, verify:
```
✅ All existing sites appear with same name, location, capacity
✅ All rooms under each site preserved
✅ All batches still assigned to correct rooms
✅ All sensor readings still readable
✅ All activity logs still visible (with site_id column)
✅ All investments/expenses still showing correct site
✅ All farmer approvals still valid
```

---

## Expected Timeline

| Phase | Files | Complexity | Time |
|-------|-------|-----------|------|
| DB Rename | Supabase SQL | 5 min | Low |
| Backend API | 5 files | 15 min | Medium |
| Frontend | 7 files | 30-45 min | High (many references) |
| New Features | Owner/Farmer flows | 45-60 min | High |
| Testing | All pages | 15-20 min | Medium |
| **Total** | | | **~2 hours** |

---

## Key Points Summary

✅ **No data loss** - Pure rename operation  
✅ **No schema redesign** - Same 1:N structure  
✅ **Existing data preserved** - All activity, investments, logs kept  
✅ **Backward compatible** - All queries just need column name updates  
✅ **Multiple farmers per room already supported** - Via batch_room_allocations  
✅ **Sensors per room** - Each room can have independent sensors (no changes needed)  

---

## Next Steps

1. ✅ Run Supabase SQL migration (Phase 1)
2. Update backend (5 files)
3. Update frontend (7+ files) - use Find/Replace for efficiency
4. Add new features (site creation with rooms, site→room selection)
5. Test backward compatibility
6. Commit with this migration document



---

## Backward Compatibility Verification Checklist

After running the database migration, verify these items to confirm all data is intact and everything works:

### ✅ Data Integrity Checks

1. **Sites table populated**
   ```sql
   SELECT COUNT(*) FROM sites;
   ```
   Should match the old facilities count (all data preserved 1:1)

2. **All rooms have valid site references**
   ```sql
   SELECT COUNT(*) FROM cold_storage_rooms WHERE site_id IS NULL;
   ```
   Should return 0 (all FK constraints valid)

3. **Activity logs preserved**
   ```sql
   SELECT COUNT(*) FROM activity_logs;
   ```
   All historical activity records intact

4. **All sensor data accessible**
   ```sql
   SELECT COUNT(*) FROM sensor_devices WHERE room_id IS NULL;
   ```
   Should return 0 (all sensors still linked to rooms)

5. **Batch allocations work with multiple farmers**
   ```sql
   SELECT room_id, COUNT(DISTINCT batches.farmer_id) as farmer_count 
   FROM batch_room_allocations bra
   JOIN batches ON bra.batch_id = batches.id
   GROUP BY room_id;
   ```
   Shows rooms with multiple farmers (proof of multi-farmer support)

### ✅ Application-Level Checks

- [ ] Owner can view all sites (previously facilities)
- [ ] Owner can create new site with multiple rooms
- [ ] Farmer can select site → room hierarchically
- [ ] Farmer can add inventory to multiple rooms
- [ ] Sensor readings still display correctly
- [ ] Activity logs show on owner/farmer dashboards
- [ ] Energy consumption queries work (/site/{site_id}/summary endpoint)
- [ ] Stakeholder investments display by site
- [ ] Approvals page shows site names correctly
- [ ] All alerts reference correct site
- [ ] Dashboard metrics calculated correctly

### ✅ Backend API Testing

After deployment, test these endpoints:

```bash
# Get all sites (replaces /api/facilities)
GET /api/sites/

# Get specific site
GET /api/sites/{site_id}

# Get user's sites
GET /api/sites/user/{user_id}

# Get rooms in site (replaces /api/storage/rooms/facility/{facility_id})
GET /api/storage/rooms/site/{site_id}

# Get site energy summary (replaces /facility/{facility_id}/summary)
GET /api/energy/site/{site_id}/summary

# Get owner's sites (replaces /api/auth/facilities/{profile_id})
GET /api/auth/sites/{profile_id}
```

---

## Success Criteria

✅ **All tests pass:**
- Zero data loss verified
- All relationships maintained
- All queries execute correctly
- Frontend displays "Site" instead of "Facility"
- Farmer site→room selection works
- Multiple farmers can store in same room
- Each room has independent sensors
- Activity logs capture all actions correctly

✅ **Performance:**
- No performance degradation
- All indexes still functional
- Views and policies still working

---

## Rollback Plan (if needed)

If issues arise, the old `facilities` table can be recreated from backups since we only renamed tables (no data was deleted). Supabase automatically maintains backups.

**Important:** Do NOT need to rollback - the migration is reversible. All data is preserved with just table/column names changed.

---

