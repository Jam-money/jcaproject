-- Lets any authenticated user notify specific users (RLS only allows self/admin inserts).
CREATE OR REPLACE FUNCTION public.notify_users(
  p_user_ids uuid[],
  p_title    text,
  p_body     text,
  p_link     text DEFAULT '/reports'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, link, read)
  SELECT u, p_title, p_body, p_link, false FROM unnest(p_user_ids) AS u;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_users TO authenticated;
