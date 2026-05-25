-- Secure server-side function to notify all users of a given role.
-- SECURITY DEFINER bypasses RLS so any authenticated user can trigger it.
CREATE OR REPLACE FUNCTION public.notify_role(
  p_role  text,
  p_title text,
  p_body  text,
  p_link  text DEFAULT '/calendar'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link, read)
  SELECT ur.user_id, p_title, p_body, p_link, false
  FROM   public.user_roles ur
  WHERE  ur.role::text = p_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_role TO authenticated;
