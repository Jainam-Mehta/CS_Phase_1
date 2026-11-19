-- ============================================================================
-- MIGRATION 012: Fix Unscaled Sensor Values in cold_storage_conditions
-- ============================================================================
-- Problem: Some temperature/humidity values in cold_storage_conditions may be
-- unscaled (e.g., 1265 instead of 12.65, or 5670 instead of 56.70)
-- 
-- This migration detects and fixes values that are clearly unscaled by checking
-- if they're > 100 (impossible for typical -20 to 50°C range or 0-100% humidity)
-- 
-- Solution: For any value > 100 for temp or > 100 for humidity, divide by 100
-- ============================================================================

-- Fix temperature columns: if value > 100, divide by 100
UPDATE cold_storage_conditions
SET temperature_1 = ROUND(temperature_1 / 100, 2)
WHERE temperature_1 IS NOT NULL AND temperature_1 > 100;

UPDATE cold_storage_conditions
SET temperature_2 = ROUND(temperature_2 / 100, 2)
WHERE temperature_2 IS NOT NULL AND temperature_2 > 100;

UPDATE cold_storage_conditions
SET temperature_3 = ROUND(temperature_3 / 100, 2)
WHERE temperature_3 IS NOT NULL AND temperature_3 > 100;

UPDATE cold_storage_conditions
SET temperature_4 = ROUND(temperature_4 / 100, 2)
WHERE temperature_4 IS NOT NULL AND temperature_4 > 100;

-- Fix humidity columns: if value > 100, divide by 100
UPDATE cold_storage_conditions
SET humidity_1 = ROUND(humidity_1 / 100, 2)
WHERE humidity_1 IS NOT NULL AND humidity_1 > 100;

UPDATE cold_storage_conditions
SET humidity_2 = ROUND(humidity_2 / 100, 2)
WHERE humidity_2 IS NOT NULL AND humidity_2 > 100;

UPDATE cold_storage_conditions
SET humidity_3 = ROUND(humidity_3 / 100, 2)
WHERE humidity_3 IS NOT NULL AND humidity_3 > 100;

UPDATE cold_storage_conditions
SET humidity_4 = ROUND(humidity_4 / 100, 2)
WHERE humidity_4 IS NOT NULL AND humidity_4 > 100;

-- Fix ambient temperature if present
UPDATE cold_storage_conditions
SET ambient_temperature_1 = ROUND(ambient_temperature_1 / 100, 2)
WHERE ambient_temperature_1 IS NOT NULL AND ambient_temperature_1 > 100;

UPDATE cold_storage_conditions
SET ambient_temperature_2 = ROUND(ambient_temperature_2 / 100, 2)
WHERE ambient_temperature_2 IS NOT NULL AND ambient_temperature_2 > 100;

-- Fix ambient humidity if present
UPDATE cold_storage_conditions
SET ambient_humidity_1 = ROUND(ambient_humidity_1 / 100, 2)
WHERE ambient_humidity_1 IS NOT NULL AND ambient_humidity_1 > 100;

UPDATE cold_storage_conditions
SET ambient_humidity_2 = ROUND(ambient_humidity_2 / 100, 2)
WHERE ambient_humidity_2 IS NOT NULL AND ambient_humidity_2 > 100;

-- Log the fix
DO $$
DECLARE
  temp_count INTEGER;
  hum_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO temp_count FROM cold_storage_conditions 
  WHERE (temperature_1 IS NOT NULL AND temperature_1 <= 100)
     OR (temperature_2 IS NOT NULL AND temperature_2 <= 100)
     OR (temperature_3 IS NOT NULL AND temperature_3 <= 100)
     OR (temperature_4 IS NOT NULL AND temperature_4 <= 100);
  
  SELECT COUNT(*) INTO hum_count FROM cold_storage_conditions 
  WHERE (humidity_1 IS NOT NULL AND humidity_1 <= 100)
     OR (humidity_2 IS NOT NULL AND humidity_2 <= 100)
     OR (humidity_3 IS NOT NULL AND humidity_3 <= 100)
     OR (humidity_4 IS NOT NULL AND humidity_4 <= 100);
  
  RAISE NOTICE 'Fixed unscaled sensor values - Temp rows: %, Humidity rows: %', temp_count, hum_count;
END $$;
