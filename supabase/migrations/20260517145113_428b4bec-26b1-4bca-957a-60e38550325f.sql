
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'director');
CREATE TYPE public.task_status AS ENUM ('pending', 'ongoing', 'completed');
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.event_type AS ENUM ('meeting', 'event', 'schedule');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- Events / calendar
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'meeting',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  attachment_url TEXT,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  progress INT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users,
  created_by UUID NOT NULL REFERENCES auth.users,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Audit log
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users,
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Auto profile + default role on signup. Default role = 'director', admins promote later.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  desired_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );

  desired_role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role','')::app_role, 'director');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, desired_role)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS POLICIES ----------------------------------------------------------

-- profiles: all authenticated can read; user can update own; admin can update any
CREATE POLICY "profiles_read_all_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- user_roles: read own and admin reads all; only admin writes
CREATE POLICY "roles_read_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- events: all auth read; admin full write
CREATE POLICY "events_read" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "events_admin_insert" ON public.events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "events_admin_update" ON public.events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "events_admin_delete" ON public.events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- tasks: all read; admin full; directors update tasks assigned to them (progress/status)
CREATE POLICY "tasks_read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_admin_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tasks_admin_update" ON public.tasks FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "tasks_assignee_update" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = assigned_to);
CREATE POLICY "tasks_admin_delete" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- comments: all read; any auth user inserts as themselves; own update/delete or admin
CREATE POLICY "comments_read" ON public.task_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.task_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comments_delete_own" ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- audit_logs: admin reads all; any user inserts their own
CREATE POLICY "audit_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);

-- notifications: owner only
CREATE POLICY "notif_read" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert_any_auth" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
