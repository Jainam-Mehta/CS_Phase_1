# ColdSense Next Steps - TODO List

## COMPLETED ✅

### Owner Dashboard Revenue Chart Scaling (Sep 19, 2026)
- **Fixed:** Revenue chart was showing ₹0.0L instead of ₹25.2
- **Root cause:** Division by 100000 (for lakhs) when total_amount is already in rupees
- **Solution:** Keep amounts in raw rupees, update chart label to "₹", show with 2 decimal places
- **Files changed:** OwnerDashboard.tsx (revenue calculation & display)
- **Verified:** All dashboard data reads from database (farmer_payments, batch_room_allocations, energy_consumption, sensor_devices, cold_storage_rooms tables)
- **Result:** Chart now displays actual ₹25.2 revenue correctly

---

## TODO - PENDING

## 1. Implement Verified Farmer Payment System (Monthly Settlement)

**Status:** Design Complete - Pending Implementation

**Payment Flow (Anti-Scam):**
```
Month End (e.g., Sept 30)
  ↓
1. SYSTEM AUTO-CALCULATES
   - Query all batches stored by farmer in this month
   - Calculate: total_kg × rate_per_kg = amount_owed
   - Status: "Pending Verification"

2. OWNER VERIFIES
   - Reviews batch list with quantities
   - Approves OR disputes
   - Status: "Owner Approved" or "Pending Farmer Review"

3. FARMER VERIFIES  
   - Reviews same batch list
   - Approves OR disputes
   - Status: "Farmer Approved" or "Dispute Pending"

4. BOTH APPROVED = VERIFIED
   - Status: "Verified - Ready for Payment"
   - Payment can be processed
   - Status: "Payment Initiated" → "Received"

5. IF DISPUTE
   - System flags for manual review
   - Can use sensor data as tiebreaker
```

**Database Tables Needed:**
- `farmer_payments` - Monthly settlement records with verification status
- `farmer_payment_disputes` - If owner/farmer disagree on amounts

**Key Questions to Decide:**
1. Calculate by batch **storage date** or **removal date**?
2. Allow **partial withdrawals** or all-or-nothing?
3. **Tiebreaker** on disputes - manual review or sensor data?
4. **Block payment** until farmer approves?

**Files to Update:**
- Backend: Payment calculation & verification logic
- Frontend: Owner approval UI + Farmer approval UI
- Database: Add status tracking columns

---

## 2. Create Expenses Table in Supabase

**Status:** Pending

**What to do:**
- Navigate to Supabase Dashboard → SQL Editor
- Create a new query and run this SQL:

```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  facility_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (room_id) REFERENCES cold_storage_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
);

CREATE INDEX expenses_room_id_idx ON expenses(room_id);
CREATE INDEX expenses_facility_id_idx ON expenses(facility_id);
CREATE INDEX expenses_created_at_idx ON expenses(created_at);
```

**Why this matters:**
- Currently the Profits page shows 404 errors when querying expenses (table doesn't exist)
- Once created, these errors will disappear
- The expense data is already being queried but returns empty gracefully
- Table structure aligns with how OwnerFinance.tsx queries it: `expenses.select('category, amount').in('room_id', roomIds)`

**Columns explained:**
- `category`: Must be one of: "Energy Costs", "Maintenance", "Parts & Equipment", "Other Expenses"
- `amount`: Cost in rupees (NUMERIC for precision with decimals)
- `room_id`: Links expense to specific cold storage room for granular tracking
- `facility_id`: Also tracks at facility level
- `description`: Optional notes about the expense

**Impact on Profits page:**
- Expense Breakdown donut chart will show actual data instead of all zeros
- Monthly trend chart will include expense data
- Net Profit calculation will be more accurate

---

## 2. Check & Fix Facilities Monitoring Page (Owner Dashboard)

**Status:** Pending (needs investigation)

**What to do:**
- Navigate to Owner Dashboard → Monitoring tab
- Check the "Facilities Monitoring" page at `/owner/monitoring`
- Verify all sensor data reads from database (not hardcoded)
- Check if there are any display irrelevances or hardcoded values

**Current observations:**
- Shows 12 active sensors (AmbientHumidity, Temperature, Door, Battery, etc.)
- Most sensors show "No Telemetry" 
- Battery shows "100%"
- Need to verify if these readings come from actual MQTT/sensor data in database

**Questions to answer:**
- Are sensor readings being pulled from database in real-time?
- Is MQTT data actually being received and stored?
- Are there any hardcoded placeholder values?
- Should sensors without telemetry be hidden or kept visible?
- Is the sensor list dynamic from database or static?

**Files to check:**
- Find Monitoring component (likely in `frontend/src/features/monitoring/` or similar)
- Check database schema for sensors table
- Verify MQTT publisher/subscriber integration in backend

---

## 3. Build Maintenance Tab for Owner Dashboard

**Status:** Pending (needs design investigation)

**What to investigate first:**
- Go to Owner Dashboard → Click "Maintenance" tab
- Understand current state: Does it exist? Is it empty? Does it have placeholder content?
- Document what's currently there

**Expected features (to be confirmed):**
- List all maintenance records for owner's facility
- Show maintenance history by cold storage room
- Track maintenance types (cleaning, repairs, preventive maintenance, etc.)
- Link to expenses table (maintenance expenses)
- Ability to log new maintenance activities
- Schedule/calendar view for maintenance tasks
- Alert system for maintenance that needs attention
- Cost tracking per maintenance activity

**Database considerations:**
- May need a `maintenance_logs` table with:
  - id, facility_id, room_id, maintenance_type, description, performed_by, performed_date, cost, notes
  - Links to expenses table for cost tracking
  - Status tracking (scheduled, in-progress, completed)

**UI/UX considerations:**
- Should show maintenance history timeline
- Option to add new maintenance record
- Filter by room, date, type
- Display associated costs
- Show maintenance alerts (e.g., "Filter cleaning due in X days")

**Frontend file location:**
- Likely at: `frontend/src/features/maintenance/OwnerMaintenance.tsx` or similar
- Check the owner dashboard routing to find exact file

**Integration points:**
- Link maintenance costs to expenses table
- Show in Profits → Expense Breakdown as "Maintenance" category
- Display in OwnerDashboard for quick status check
- Alert system integration

---

## Notes for Future Reference

### Dates & Context:
- Last updated: September 19, 2026
- Project: ColdSense - Cold Storage Management System
- Current phase: Completing financial dashboards and setting up operational tracking

### Current Status Summary:
- ✅ Profits tab complete with stakeholder + farmer revenue
- ✅ Activity logs & alerts integrated
- ✅ Owner approvals workflow working
- ✅ Settings showing stakeholder investments + farmer storage
- ⏳ Expenses table needed
- ⏳ Maintenance tab to be designed and built

### Console Error to Watch For:
- 404 errors on `/expenses` queries will disappear once table is created
- Currently handled gracefully, shows ₹0 expenses
