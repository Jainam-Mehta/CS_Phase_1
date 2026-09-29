-- Create activity_logs table for tracking all farmer activities and events
-- Events: room requests (submitted/approved/rejected), batch storage, inventory movements, alerts, etc.

CREATE TABLE public.farmer_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  
  -- Core references
  farmer_id uuid NOT NULL,
  site_id uuid,
  room_id uuid,
  
  -- Event classification
  event_type text NOT NULL CHECK (event_type IN (
    'request_submitted',      -- Farmer submitted room access request
    'request_approved',       -- Owner approved the request
    'request_rejected',       -- Owner rejected the request
    'batch_stored',          -- Batch/product stored in room
    'batch_removed',         -- Batch/product removed from room
    'inventory_update',      -- Inventory quantity changed
    'sensor_alert',          -- Sensor alert triggered
    'door_alert',            -- Door alert
    'temperature_alert',     -- Temperature threshold breached
    'humidity_alert',        -- Humidity threshold breached
    'system_message'         -- General system message
  )),
  
  -- Event metadata
  title text NOT NULL,
  description text,
  
  -- Optional relation to specific batch
  batch_id uuid,
  
  -- Severity level for alerts
  severity text CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Indexes for common queries
  CONSTRAINT farmer_activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT farmer_activity_logs_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT farmer_activity_logs_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites(id) ON DELETE CASCADE,
  CONSTRAINT farmer_activity_logs_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.cold_storage_rooms(id) ON DELETE CASCADE,
  CONSTRAINT farmer_activity_logs_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_farmer_activity_logs_farmer_id ON public.farmer_activity_logs(farmer_id);
CREATE INDEX idx_farmer_activity_logs_site_id ON public.farmer_activity_logs(site_id);
CREATE INDEX idx_farmer_activity_logs_room_id ON public.farmer_activity_logs(room_id);
CREATE INDEX idx_farmer_activity_logs_created_at ON public.farmer_activity_logs(created_at DESC);
CREATE INDEX idx_farmer_activity_logs_event_type ON public.farmer_activity_logs(event_type);
CREATE INDEX idx_farmer_activity_logs_farmer_created ON public.farmer_activity_logs(farmer_id, created_at DESC);

-- Disable RLS for now (consistent with your existing setup)
ALTER TABLE public.farmer_activity_logs DISABLE ROW LEVEL SECURITY;
