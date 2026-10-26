-- ColdSense Locality-Code Architecture Migration
-- Phase 1: Create new immutable TEXT-PK tables
-- Author: Kiro
-- Date: 2026-10-21

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. NEW SITES TABLE (TEXT PK: locality_code)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites_v2 (
  code TEXT PRIMARY KEY,                    -- Locality code: "MHNKIGP01" (immutable)
  site_code TEXT NOT NULL UNIQUE,           -- "S01", "S02", ... (auto-assigned per locality)
  facility_name TEXT,
  address TEXT,
  owner_profile_id UUID NOT NULL,           -- FK to profiles table
  state_code TEXT,                          -- "MH" (Maharashtra)
  district_code TEXT,                       -- "IGATP" (Igatpuri)
  locality_numeric INT,                     -- 01=Igatpuri, 66=Borivali, 99=Borivali Link
  total_capacity_kg FLOAT DEFAULT 50000,
  current_utilization_kg FLOAT DEFAULT 0,
  category TEXT DEFAULT 'Cold Storage',
  deleted_at TIMESTAMP NULL,                -- Soft delete timestamp
  deletion_reason TEXT,                     -- "Incorrect locality code, recreating"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by site_code
CREATE INDEX idx_sites_v2_site_code ON sites_v2(site_code);
CREATE INDEX idx_sites_v2_owner_profile_id ON sites_v2(owner_profile_id);
CREATE INDEX idx_sites_v2_state_district ON sites_v2(state_code, district_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. NEW COLD STORAGE ROOMS TABLE (TEXT PK: composite locality_code + room_code)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cold_storage_rooms_v2 (
  code TEXT PRIMARY KEY,                    -- "MHNKIGP01_R01" (immutable composite)
  room_code TEXT NOT NULL,                  -- "R01", "R02", ... (auto-assigned per site)
  site_code TEXT NOT NULL,                  -- FK to sites_v2.site_code
  locality_code TEXT NOT NULL,              -- FK to sites_v2.code (for quick lookup)
  room_name TEXT,
  capacity_kg FLOAT DEFAULT 10000,
  deleted_at TIMESTAMP NULL,                -- Soft delete timestamp
  deletion_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (site_code) REFERENCES sites_v2(site_code) ON DELETE CASCADE,
  FOREIGN KEY (locality_code) REFERENCES sites_v2(code) ON DELETE CASCADE,
  UNIQUE(site_code, room_code)              -- Prevent duplicate room codes per site
);

-- Indexes for fast lookups
CREATE INDEX idx_rooms_v2_site_code ON cold_storage_rooms_v2(site_code);
CREATE INDEX idx_rooms_v2_locality_code ON cold_storage_rooms_v2(locality_code);
CREATE INDEX idx_rooms_v2_room_code ON cold_storage_rooms_v2(room_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. NEW MQTT LOCALITY ROUTES (Direct TEXT key mapping, no UUID resolution)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mqtt_locality_routes (
  locality_code TEXT NOT NULL,              -- "MHNKIGP01" (from MQTT topic)
  site_code TEXT NOT NULL,                  -- "S01" (from MQTT topic)
  room_code TEXT NOT NULL,                  -- "R01" (from MQTT topic)
  site_id_legacy UUID,                      -- Optional: FK to old sites table (migration)
  room_id_legacy UUID,                      -- Optional: FK to old cold_storage_rooms table
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (locality_code, site_code, room_code)
);

-- Indexes for O(1) MQTT topic lookup
CREATE INDEX idx_mqtt_routes_site_code ON mqtt_locality_routes(site_code);
CREATE INDEX idx_mqtt_routes_locality_code ON mqtt_locality_routes(locality_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. NEW SENSOR INGESTION RAW (JSONB payload storage, UTC normalized)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sensor_ingestion_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locality_code TEXT NOT NULL,              -- From MQTT topic
  site_code TEXT NOT NULL,                  -- From MQTT topic
  room_code TEXT NOT NULL,                  -- From MQTT topic
  raw_payload JSONB NOT NULL,               -- Full MQTT message (any structure)
  temperature FLOAT,                        -- Extracted from payload (°C)
  humidity FLOAT,                           -- Extracted from payload (%)
  recorded_at TIMESTAMP NOT NULL,           -- When reading was taken (normalized to UTC)
  gmt_offset_hours SMALLINT,                -- GMT offset (e.g., +5 for IST)
  received_at TIMESTAMP DEFAULT NOW(),      -- When message arrived at backend
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (locality_code, site_code, room_code)
    REFERENCES mqtt_locality_routes(locality_code, site_code, room_code) ON DELETE RESTRICT
);

-- Indexes for efficient time-series queries
CREATE INDEX idx_sensor_ingest_raw_timestamp ON sensor_ingestion_raw(recorded_at DESC);
CREATE INDEX idx_sensor_ingest_raw_locality_site_room ON sensor_ingestion_raw(locality_code, site_code, room_code);
CREATE INDEX idx_sensor_ingest_raw_site_code ON sensor_ingestion_raw(site_code);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NEW DELETION AUDIT LOG (Track soft deletes with reasons)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deletion_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_entity_type TEXT NOT NULL,        -- 'site', 'room', 'sensor'
  deleted_entity_code TEXT NOT NULL,        -- site_code, room_code, or sensor_id
  deletion_reason TEXT,                     -- "Incorrect locality code, need to recreate"
  deleted_by UUID NOT NULL,                 -- FK to profiles (user who deleted)
  deleted_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                           -- {"old_values": {...}, "context": "..."}
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_deletion_audit_entity_type ON deletion_audit_log(deleted_entity_type);
CREATE INDEX idx_deletion_audit_deleted_by ON deletion_audit_log(deleted_by);
CREATE INDEX idx_deletion_audit_timestamp ON deletion_audit_log(deleted_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTES FOR MIGRATION:
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. These are NEW tables. The old tables (sites, cold_storage_rooms) remain unchanged.
-- 2. Gradually migrate data:
--    - Create site in sites_v2 when owner submits locality_code + facility_name
--    - Create room in cold_storage_rooms_v2
--    - Create MQTT route in mqtt_locality_routes
--    - Keep old tables for backward compatibility until migration complete
-- 3. MQTT subscriber will use mqtt_locality_routes for O(1) lookup (no UUID resolution)
-- 4. sensor_ingestion_raw is new; cold_storage_conditions still updated for backward compatibility
-- 5. Soft deletes: Use deleted_at = NOW(), never hard delete
-- 6. Audit trail: Always insert to deletion_audit_log before soft delete
