ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS employment_type text NOT NULL DEFAULT 'regular'
  CHECK (employment_type IN ('regular','cosw','jo'));
