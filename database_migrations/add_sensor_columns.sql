-- ========================================================================
-- Migration: Add missing columns to sensor_devices table
-- Date: August 26, 2026
-- Purpose: Fix "Could not find 'last_reading_unit' column" error
-- ========================================================================

-- Add last_reading_unit column (REQUIRED for sensor addition to work)
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_reading_unit TEXT;

-- Add last_reading_value column (for storing actual sensor readings)
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_reading_value NUMERIC;

-- Add last_seen column (for tracking sensor activity)
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE;

-- Add created_at column with default value
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column with default value
ALTER TABLE sensor_devices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN sensor_devices.last_reading_unit IS 'Unit of measurement (e.g., °C, %, ppm, Psi)';
COMMENT ON COLUMN sensor_devices.last_reading_value IS 'Latest sensor reading value';
COMMENT ON COLUMN sensor_devices.last_seen IS 'Last time sensor sent data';
COMMENT ON COLUMN sensor_devices.created_at IS 'When sensor was registered';
COMMENT ON COLUMN sensor_devices.updated_at IS 'Last time sensor record was modified';

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sensor_devices'
ORDER BY ordinal_position;
