CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  entity_id UUID,
  entity_type TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_insert_notifications" ON public.notifications;
CREATE POLICY "system_insert_notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "users_update_own_notifications" ON public.notifications;
CREATE POLICY "users_update_own_notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
