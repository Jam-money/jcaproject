
-- Add new event_type enum values
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'staff_meeting';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'training';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'field_supervision';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'data_dissemination';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'press_conference';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'official_business';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'interagency_meeting';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'courtesy_visit';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'lcro_audit';
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'on_leave';
