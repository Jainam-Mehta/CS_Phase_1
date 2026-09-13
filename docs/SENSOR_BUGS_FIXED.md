# 🐛 Major Sensor Display Bugs - FIXED

## Date: August 26, 2026

---

## **Problems Reported:**

1. ❌ **Ambient Humidity shown as installed when only Ambient Temperature exists**
2. ❌ **Both pressure sensors show active when only 1 installed** (showing demo values 145 PSI, 210 PSI)
3. ❌ **Missing sensor type:** No "Ambient Temperature+Humidity Combined" sensor option
4. ❌ **Missing sensor split:** Only 1 "Pressure" sensor, but 2D diagram has 2 pressure points (Suction vs Discharge)
5. ❌ **Sensors shown in 2D diagram even when NOT installed in database**

---

## **Root Causes:**

### **1. Incorrect Sensor Detection Logic**
**File:** `OwnerDashboard.tsx` Line ~287-289

**Before (BROKEN):**
```typescript
const hasInstalledSensorType = (type: string) => {
  return dbSensors.some(s => s.sensor_type?.toLowerCase().includes(type.toLowerCase()));
};

const hasAmbientSensor = hasInstalledSensorType('ambient'); // ❌ WRONG!
```

**Problem:** 
- `'AmbientTemperature'.includes('ambient')` = TRUE ✅
- `'AmbientHumidity'.includes('ambient')` = TRUE ✅  
- If you have `AmbientTemperature` sensor, the check `hasInstalledSensorType('ambient')` returns TRUE
- Then BOTH `isAmbientTempInstalled` AND `isAmbientHumInstalled` are set to TRUE
- **Result:** Dashboard shows BOTH sensors as installed even if only 1 exists!

### **2. Hardcoded Demo Values**
**File:** `OwnerDashboard.tsx` Line ~390, ~410

**Before (BROKEN):**
```typescript
value: latestCondition?.suction_pressure ?? (hasPressureSensor ? 145 : null),  // ❌ Hardcoded!
value: latestCondition?.discharge_pressure ?? (hasPressureSensor ? 210 : null), // ❌ Hardcoded!
```

**Problem:**
- If you add 1 generic "Pressure" sensor, `hasPressureSensor` = TRUE
- BOTH suction (145) and discharge (210) show demo values
- **Result:** 2 pressure readings shown when only 1 sensor installed!

### **3. Missing Sensor Types**
- No "Ambient Combined" sensor (only had internal combined)
- No separate "Suction Pressure" and "Discharge Pressure" types

---

## **✅ Solutions Applied:**

### **Fix #1: Exact Sensor Type Matching**

**Changed from fuzzy matching to EXACT matching:**

```typescript
// ❌ OLD - Fuzzy (causes false positives)
const hasAmbientSensor = hasInstalledSensorType('ambient');

// ✅ NEW - Exact match only
const hasAmbientTempSensor = dbSensors.some(s => s.sensor_type === 'AmbientTemperature');
const hasAmbientHumSensor = dbSensors.some(s => s.sensor_type === 'AmbientHumidity');
```

**Now each sensor is checked individually:**
- `Temperature` - exact match
- `Humidity` - exact match  
- `AmbientTemperature` - exact match
- `AmbientHumidity` - exact match
- `SuctionPressure` - exact match
- `DischargePressure` - exact match
- `Door` - exact match

### **Fix #2: Remove ALL Hardcoded Demo Values**

```typescript
// ✅ NEW - No fallbacks, database-only
{
  id: 'suction-pressure-line',
  label: 'Suction Pressure',
  value: latestCondition?.suction_pressure ?? null, // ✅ null if no data
  status: latestCondition?.suction_pressure === undefined ? 'unknown' : 'optimal',
  isInstalled: isSuctionPressureInstalled, // ✅ Checks for EXACT sensor type
}
```

**Result:** If sensor not in database → Shows "Not Installed" in 2D diagram ✅

### **Fix #3: Add Missing Sensor Types**

**Added to `OwnerMonitoring.tsx`:**

```typescript
const AVAILABLE_SENSOR_TYPES = [
  // Internal Combined
  { value: 'Temperature+Humidity', label: 'Temperature+Humidity Sensor (Internal Combined)', isCombined: true, types: ['Temperature', 'Humidity'] },
  
  // ✅ NEW: Ambient Combined
  { value: 'AmbientTemperature+AmbientHumidity', label: 'Temperature+Humidity Sensor (Ambient Combined)', isCombined: true, types: ['AmbientTemperature', 'AmbientHumidity'] },
  
  // Individual sensors
  { value: 'Temperature', label: 'Temperature Sensor (Internal)', unit: '°C' },
  { value: 'Humidity', label: 'Humidity Sensor (Internal)', unit: '%' },
  { value: 'AmbientTemperature', label: 'Ambient Temperature Sensor', unit: '°C' },
  { value: 'AmbientHumidity', label: 'Ambient Humidity Sensor', unit: '%' },
  
  // ✅ NEW: Split pressure sensors
  { value: 'SuctionPressure', label: 'Suction Pressure Sensor', unit: 'Psi' },
  { value: 'DischargePressure', label: 'Discharge Pressure Sensor', unit: 'Psi' },
  
  // Other sensors...
];
```

### **Fix #4: Updated Combined Sensor Creation Logic**

**Now handles BOTH internal and ambient combined sensors:**

```typescript
if (isCombinedSensor) {
  if (addSensorForm.sensor_type === 'Temperature+Humidity') {
    // Create Temperature + Humidity (internal)
    sensorsToAdd.push({ sensor_type: 'Temperature', ... });
    sensorsToAdd.push({ sensor_type: 'Humidity', ... });
  } 
  else if (addSensorForm.sensor_type === 'AmbientTemperature+AmbientHumidity') {
    // ✅ NEW: Create AmbientTemperature + AmbientHumidity
    sensorsToAdd.push({ sensor_type: 'AmbientTemperature', ... });
    sensorsToAdd.push({ sensor_type: 'AmbientHumidity', ... });
  }
}
```

---

## **📊 Before vs After:**

### **Scenario 1: Only Ambient Temperature Installed**

| Sensor | Before (BROKEN) | After (FIXED) |
|--------|-----------------|---------------|
| Ambient Temperature | ✅ Shows as installed | ✅ Shows as installed |
| Ambient Humidity | ❌ **Shows as installed** (BUG!) | ✅ Shows "Not Installed" |

### **Scenario 2: Only 1 Pressure Sensor Installed**

| Sensor | Before (BROKEN) | After (FIXED) |
|--------|-----------------|---------------|
| Suction Pressure | ❌ Shows 145 PSI (demo value) | ✅ Shows "Not Installed" OR actual value if installed |
| Discharge Pressure | ❌ Shows 210 PSI (demo value) | ✅ Shows "Not Installed" OR actual value if installed |

---

## **🎯 Database Sensor Types (Post-Fix):**

Now the system recognizes these **EXACT** sensor types:

### **Internal Sensors:**
- `Temperature` - Internal storage temperature
- `Humidity` - Internal storage humidity

### **Ambient Sensors:**
- `AmbientTemperature` - Outdoor/ambient temperature
- `AmbientHumidity` - Outdoor/ambient humidity

### **Pressure Sensors:**
- `SuctionPressure` - Low-pressure refrigerant line (evaporator → compressor)
- `DischargePressure` - High-pressure refrigerant line (compressor → condenser)

### **Other Sensors:**
- `Door` - Door open/closed status
- `Battery` - Battery level monitor
- `CO2` - Carbon dioxide sensor
- `Oxygen` - Oxygen level sensor
- `Ammonia` - Ammonia gas sensor
- `Ethylene` - Ethylene gas sensor

---

## **✅ Files Modified:**

1. **`frontend/src/features/monitoring/OwnerMonitoring.tsx`**
   - Added `AmbientTemperature+AmbientHumidity` combined sensor
   - Split `Pressure` into `SuctionPressure` and `DischargePressure`
   - Updated creation logic for combined sensors
   - Updated preview display logic

2. **`frontend/src/features/dashboard/OwnerDashboard.tsx`**
   - Replaced fuzzy `hasInstalledSensorType()` with exact sensor type checks
   - Removed hardcoded demo values (145, 210 PSI)
   - Individual `isInstalled` checks for each sensor type
   - Proper status display ('unknown' when no data, not hardcoded 'optimal')

---

## **🧪 How to Test:**

### **Test 1: Ambient Sensor Detection**
1. Add only "Ambient Temperature" sensor
2. Go to Dashboard → Check 2D diagram
3. **Expected:** Only Ambient Temperature shows, Ambient Humidity shows "Not Installed"

### **Test 2: Pressure Sensor Split**
1. Add only "Suction Pressure" sensor
2. Go to Dashboard → Check 2D diagram
3. **Expected:** Only Suction Pressure shows value, Discharge shows "Not Installed"

### **Test 3: Combined Ambient Sensor**
1. Go to Monitoring → Add Sensor
2. Select "Temperature+Humidity Sensor (Ambient Combined)"
3. Add 1 sensor
4. **Expected:** Creates both `AmbientTemperature` and `AmbientHumidity` in database

### **Test 4: No Demo Values**
1. Fresh facility with NO sensors added
2. Go to Dashboard
3. **Expected:** ALL sensors show "Not Installed" or "No Telemetry" - NO hardcoded values

---

## **✅ Status: RESOLVED**

All sensor detection bugs are now fixed. The dashboard accurately reflects what sensors exist in the database, with no false positives and no hardcoded demo values.

---

**Fixed by:** Kiro AI  
**Date:** August 26, 2026  
**Files Changed:** 2  
**Lines Changed:** ~150  
**Bugs Fixed:** 5
