
-- Add meeting_link column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS meeting_link text NULL;
