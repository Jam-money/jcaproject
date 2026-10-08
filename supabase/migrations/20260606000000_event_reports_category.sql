ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS category text NULL
  CHECK (category IS NULL OR category IN ('pl','info_dissemination'));
