-- Create notifications table for sending alerts to farmers
-- Notifications are created when room requests are approved/rejected/submitted

CREATE TABLE public.farmer_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Core references
  farmer_id uuid NOT NULL,
  
  -- Notification details
  notification_type text NOT NULL CHECK (notification_type IN (
    'request_submitted',      -- Confirmation that request was submitted
    'request_approved',       -- Owner approved room request
    'request_rejected',       -- Owner rejected room request
    'batch_stored',          -- Batch stored notification
    'batch_removed',         -- Batch removed notification
    'alert_triggered',       -- Sensor/system alert
    'system_message'         -- General system message
  )),
  
  title text NOT NULL,
  message text,
  
  -- Related entities
  site_id uuid,
  room_id uuid,
  request_id uuid,
  
  -- Status
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT farmer_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT farmer_notifications_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT farmer_notifications_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE,
  CONSTRAINT farmer_notifications_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
  CONSTRAINT farmer_notifications_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.farmer_room_access(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_farmer_notifications_farmer_id ON public.farmer_notifications(farmer_id);
CREATE INDEX idx_farmer_notifications_is_read ON public.farmer_notifications(is_read);
CREATE INDEX idx_farmer_notifications_created_at ON public.farmer_notifications(created_at DESC);
CREATE INDEX idx_farmer_notifications_farmer_unread ON public.farmer_notifications(farmer_id, is_read);
CREATE INDEX idx_farmer_notifications_type ON public.farmer_notifications(notification_type);

-- Disable RLS for now (consistent with existing setup)
ALTER TABLE public.farmer_notifications DISABLE ROW LEVEL SECURITY;
