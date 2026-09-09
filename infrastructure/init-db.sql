-- ColdSense Database Initialization Script
-- This script runs automatically when PostgreSQL starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (if they don't exist from migrations)
-- The actual schema should come from your Supabase export or Alembic migrations

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE coldsense TO coldsense_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO coldsense_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO coldsense_user;

-- Print success message
SELECT 'Database initialized successfully!' as message;
