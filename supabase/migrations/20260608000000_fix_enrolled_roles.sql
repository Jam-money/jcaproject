-- Enrolled COSW/JO/regular users were given the default 'director' role by the signup trigger.
-- Demote COSW/JO users to staff.
UPDATE public.user_roles ur
SET role = 'staff'
FROM public.profiles p
WHERE p.id = ur.user_id
  AND p.employment_type IN ('cosw','jo')
  AND ur.role = 'director';
