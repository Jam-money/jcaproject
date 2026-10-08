-- unit is an app_unit enum — add ORD as a valid value
ALTER TYPE public.app_unit ADD VALUE IF NOT EXISTS 'ORD';

-- position may have been added directly in the DB; make sure it exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text NULL;

-- Not needed on an enum column; drop if a previous attempt created it
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_unit_check;
