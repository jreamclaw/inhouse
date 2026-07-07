CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_reports_target_type_check CHECK (target_type IN ('user', 'post', 'story', 'comment')),
  CONSTRAINT content_reports_status_check CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker_id ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON public.content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target_user_id ON public.content_reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target_type_target_id ON public.content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_blocks" ON public.user_blocks;
CREATE POLICY "users_read_own_blocks"
ON public.user_blocks FOR SELECT TO authenticated
USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_blocks" ON public.user_blocks;
CREATE POLICY "users_insert_own_blocks"
ON public.user_blocks FOR INSERT TO authenticated
WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_blocks" ON public.user_blocks;
CREATE POLICY "users_delete_own_blocks"
ON public.user_blocks FOR DELETE TO authenticated
USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "users_read_own_reports" ON public.content_reports;
CREATE POLICY "users_read_own_reports"
ON public.content_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_reports" ON public.content_reports;
CREATE POLICY "users_insert_own_reports"
ON public.content_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP TRIGGER IF EXISTS update_content_reports_updated_at ON public.content_reports;
CREATE TRIGGER update_content_reports_updated_at
BEFORE UPDATE ON public.content_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
