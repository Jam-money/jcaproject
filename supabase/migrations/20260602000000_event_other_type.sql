ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'other';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_type text NULL;
