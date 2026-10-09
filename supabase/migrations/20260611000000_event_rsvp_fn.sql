-- Lets management (RD, JBT, SBB) save their own RSVP / note on an event they are invited to,
-- regardless of the events UPDATE policy. Each key is only writable by its matching person.
CREATE OR REPLACE FUNCTION public.set_event_rsvp(
  p_event_id uuid,
  p_key text,
  p_status text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_set_note boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_key NOT IN ('RD', 'JBT', 'SBB') THEN RAISE EXCEPTION 'Invalid RSVP key'; END IF;

  SELECT lower(coalesce(full_name, '')) INTO v_name FROM public.profiles WHERE id = auth.uid();

  IF NOT (
    (p_key = 'RD'  AND public.has_role(auth.uid(), 'director')) OR
    (p_key = 'JBT' AND v_name LIKE '%tuason%') OR
    (p_key = 'SBB' AND v_name LIKE '%balagbis%')
  ) THEN
    RAISE EXCEPTION 'You cannot respond on behalf of %', p_key;
  END IF;

  IF p_set_note THEN
    UPDATE public.events
       SET rsvp_notes = coalesce(rsvp_notes, '{}'::jsonb) || jsonb_build_object(p_key, p_note)
     WHERE id = p_event_id;
  ELSE
    UPDATE public.events
       SET rsvp_responses = coalesce(rsvp_responses, '{}'::jsonb) || jsonb_build_object(p_key, p_status)
     WHERE id = p_event_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_event_rsvp(uuid, text, text, text, boolean) TO authenticated;
