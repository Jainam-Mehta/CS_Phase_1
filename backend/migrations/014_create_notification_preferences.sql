-- ============================================================================
-- MIGRATION: Create notification preferences table for farmers and owners
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Door Alerts (both farmer and owner)
  door_alerts_enabled boolean DEFAULT true,
  door_alerts_via_email boolean DEFAULT false,
  door_alerts_via_push boolean DEFAULT true,
  
  -- Market Updates (farmer only)
  market_updates_enabled boolean DEFAULT true,
  market_updates_via_email boolean DEFAULT false,
  market_updates_via_push boolean DEFAULT true,
  market_update_threshold_percent numeric(5, 2) DEFAULT 10.0, -- Notify if price change > 10%
  
  -- Weekly Reports (both)
  weekly_reports_enabled boolean DEFAULT true,
  weekly_reports_via_email boolean DEFAULT true,
  weekly_reports_day_of_week varchar(10) DEFAULT 'Monday', -- Day to send report
  
  -- AI Recommendations (farmer: product insights, owner: to be planned)
  ai_recommendations_enabled boolean DEFAULT true,
  ai_recommendations_via_email boolean DEFAULT false,
  ai_recommendations_via_push boolean DEFAULT true,
  
  -- Owner-specific recommendations (to be planned)
  owner_insights_enabled boolean DEFAULT true,
  owner_insights_via_email boolean DEFAULT false,
  owner_insights_via_push boolean DEFAULT true,
  
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_prefs_profile ON public.notification_preferences(profile_id);

PRINT 'Created notification_preferences table for farmers and owners';
