-- ============================================================================
-- MIGRATION: Add Payment Support to Notifications & Create Owner Notifications
-- Date: November 4, 2026
-- Database: Supabase PostgreSQL
-- Purpose: Enable payment tracking and notifications for owners
-- ============================================================================
-- This migration adds:
-- 1. Payment notification types to farmer_notifications
-- 2. New owner_notifications table for owner payment tracking
-- 3. Proper indexes for performance
-- ============================================================================

-- ============================================================================
-- STEP 1: Update farmer_notifications Constraint
-- Add support for 'payment_received' and 'payment_recorded' notification types
-- ============================================================================

ALTER TABLE public.farmer_notifications 
DROP CONSTRAINT notification_type_valid;

ALTER TABLE public.farmer_notifications 
ADD CONSTRAINT notification_type_valid CHECK (notification_type IN (
  'request_submitted', 'request_approved', 'request_rejected',
  'batch_stored', 'batch_removed', 'alert_triggered', 'system_message',
  'payment_received', 'payment_recorded'
));

-- ============================================================================
-- STEP 2: Create owner_notifications Table
-- Purpose: Store notifications for facility owners (payments, alerts, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.owner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification Content
  notification_type character varying(100) NOT NULL,
  title text NOT NULL,
  message text,
  
  -- Context Information (optional)
  site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE,
  room_id uuid REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Read Status
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: Valid notification types
  CONSTRAINT owner_notification_type_valid CHECK (notification_type IN (
    'payment_recorded', 'farmer_request', 'room_alert', 'system_message'
  ))
);

-- ============================================================================
-- STEP 3: Create Indexes for owner_notifications
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_owner_notifications_owner_id 
ON public.owner_notifications(owner_id);

CREATE INDEX IF NOT EXISTS idx_owner_notifications_is_read 
ON public.owner_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_owner_notifications_created_at 
ON public.owner_notifications(created_at DESC);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Summary of Changes:
-- 1. ✅ Updated farmer_notifications.notification_type constraint
--    - Added: 'payment_received'
--    - Added: 'payment_recorded'
-- 
-- 2. ✅ Created new owner_notifications table
--    - Supports payment notifications for owners
--    - Has proper indexes for performance
--    - Proper foreign key constraints
-- 
-- 3. ✅ Created 3 indexes for query optimization
--    - idx_owner_notifications_owner_id
--    - idx_owner_notifications_is_read
--    - idx_owner_notifications_created_at
-- 
-- Total Tables in Schema: 34 (was 33)
-- ============================================================================
