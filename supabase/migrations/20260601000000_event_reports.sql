CREATE TABLE IF NOT EXISTS public.event_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  deadline date NULL,
  progress_status text NOT NULL DEFAULT 'ongoing'
    CHECK (progress_status IN ('ongoing','for_review_css','endorsed_rd','approved_rd')),
  notes text NULL,
  updated_by uuid NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_reports_read" ON public.event_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "event_reports_insert" ON public.event_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "event_reports_update" ON public.event_reports FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.event_reports ADD COLUMN IF NOT EXISTS assignees jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE POLICY "event_reports_delete" ON public.event_reports FOR DELETE TO authenticated USING (true);
