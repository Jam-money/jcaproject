-- LGU and GIP are separate employment types (replaces the combined 'lgu_gip').
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%employment_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.profiles SET employment_type = 'lgu' WHERE employment_type = 'lgu_gip';

ALTER TABLE public.profiles ADD CONSTRAINT profiles_employment_type_check
  CHECK (employment_type IN ('regular','cosw','jo','lgu','gip'));
