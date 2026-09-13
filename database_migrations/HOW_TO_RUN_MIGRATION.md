# 🗄️ How to Fix Database Schema Error

## Error You're Seeing:
```
Failed to add sensors: Could not find the 'last_reading_unit' column of 'sensor_devices' in the schema cache
```

---

## ✅ **SOLUTION: Run SQL Migration**

### **Step 1: Open Supabase Dashboard**

1. Go to: https://supabase.com/dashboard
2. Login with your account
3. Select your project: **vzoypfctadgyflzwodmp**

---

### **Step 2: Open SQL Editor**

1. Click **"SQL Editor"** in the left sidebar
2. Click **"+ New query"** button (top right)

---

### **Step 3: Copy & Paste SQL**

Copy this ENTIRE SQL script and paste it into the SQL editor:

```sql
-- Add missing columns to sensor_devices table
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_reading_unit TEXT;

ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_reading_value NUMERIC;

ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

---

### **Step 4: Run the Query**

1. Click the **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for "Success" message
3. You should see: **"Success. No rows returned"**

---

### **Step 5: Verify Columns Were Added**

Run this verification query:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'sensor_devices'
ORDER BY ordinal_position;
```

**Expected Output - You should see these columns:**
- `id`
- `room_id`
- `sensor_type`
- `sensor_name`
- `sensor_code`
- `status`
- `battery_percentage`
- `last_reading_unit` ← NEW!
- `last_reading_value` ← NEW!
- `last_seen` ← NEW!
- `created_at` ← NEW!
- `updated_at` ← NEW!

---

### **Step 6: Test Adding a Sensor**

1. Go back to your ColdSense app (localhost:5173)
2. Navigate to Monitoring page (Owner view)
3. Click **"Add Sensor"**
4. Select **"Temperature+Humidity Sensor (Combined)"**
5. Click **"Add Sensor"**
6. **Expected:** Success! Both sensors should be created

---

## 🎯 **What These Columns Do:**

| Column | Purpose | Example Value |
|--------|---------|---------------|
| `last_reading_unit` | Unit of measurement | `°C`, `%`, `ppm`, `Psi` |
| `last_reading_value` | Latest sensor reading | `5.2`, `85.3`, `1200` |
| `last_seen` | Last telemetry time | `2026-08-26 14:30:00` |
| `created_at` | When sensor was added | `2026-08-26 10:00:00` |
| `updated_at` | Last modification time | `2026-08-26 14:30:00` |

---

## 🐛 **If You Still Get Errors:**

### Error: "relation 'sensor_devices' does not exist"
**Solution:** Your table might have a different name. Check table names:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Error: "permission denied"
**Solution:** You need admin/owner permissions on the Supabase project. Contact the project owner.

### Error: "column already exists"
**Solution:** That's fine! The `IF NOT EXISTS` clause prevents errors. Just continue.

---

## 📸 **Screenshots to Help:**

### Where to find SQL Editor:
```
Supabase Dashboard
├── Project: vzoypfctadgyflzwodmp
├── Left Sidebar
│   ├── Table Editor
│   ├── Authentication
│   ├── Storage
│   └── SQL Editor ← Click here!
```

### What SQL Editor looks like:
```
┌─────────────────────────────────────────┐
│ + New query                             │
├─────────────────────────────────────────┤
│ [SQL query editor box]                  │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│ [Run] button                            │
└─────────────────────────────────────────┘
```

---

## ✅ **After Running Migration:**

Your `sensor_devices` table will be ready and you can:
- ✅ Add Temperature sensors
- ✅ Add Humidity sensors  
- ✅ Add Temperature+Humidity combined sensors
- ✅ Add any other sensor type
- ✅ No more schema errors!

---

**Need help? Let me know which step you're stuck on!**
