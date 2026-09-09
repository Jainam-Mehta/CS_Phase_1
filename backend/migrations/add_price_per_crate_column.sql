-- Add price_per_crate column to farmer_room_access table
-- This allows owners to set custom pricing per farmer per facility

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmer_room_access' 
        AND column_name = 'price_per_crate'
    ) THEN
        ALTER TABLE farmer_room_access 
        ADD COLUMN price_per_crate DECIMAL(10, 2) DEFAULT NULL;
        
        COMMENT ON COLUMN farmer_room_access.price_per_crate IS 'Price charged per crate (25kg) for this farmer at this facility';
    END IF;
END $$;

-- Create an index for faster queries when filtering by pricing
CREATE INDEX IF NOT EXISTS idx_farmer_room_access_price 
ON farmer_room_access(price_per_crate) 
WHERE price_per_crate IS NOT NULL;
