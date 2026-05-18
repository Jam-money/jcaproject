
-- Fix mutable search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Restrict execution of SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten notification insert: admins, or user inserting for self
DROP POLICY IF EXISTS "notif_insert_any_auth" ON public.notifications;
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
