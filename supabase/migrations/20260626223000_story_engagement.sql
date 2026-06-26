ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS replies_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.story_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.story_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer_id ON public.story_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_story_id ON public.story_likes(story_id);
CREATE INDEX IF NOT EXISTS idx_story_likes_user_id ON public.story_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_story_id ON public.story_replies(story_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_user_id ON public.story_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_story_replies_created_at ON public.story_replies(created_at DESC);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_story_views" ON public.story_views;
CREATE POLICY "public_read_story_views"
ON public.story_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_story_views" ON public.story_views;
CREATE POLICY "users_insert_story_views"
ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid());

DROP POLICY IF EXISTS "public_read_story_likes" ON public.story_likes;
CREATE POLICY "public_read_story_likes"
ON public.story_likes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_manage_own_story_likes" ON public.story_likes;
CREATE POLICY "users_manage_own_story_likes"
ON public.story_likes FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "public_read_story_replies" ON public.story_replies;
CREATE POLICY "public_read_story_replies"
ON public.story_replies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_story_replies" ON public.story_replies;
CREATE POLICY "users_insert_story_replies"
ON public.story_replies FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_story_replies" ON public.story_replies;
CREATE POLICY "users_update_own_story_replies"
ON public.story_replies FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_own_story_replies" ON public.story_replies;
CREATE POLICY "users_delete_own_story_replies"
ON public.story_replies FOR DELETE TO authenticated
USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_story_replies_updated_at ON public.story_replies;
CREATE TRIGGER update_story_replies_updated_at
BEFORE UPDATE ON public.story_replies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_story_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_story_id UUID;
BEGIN
  target_story_id := COALESCE(NEW.story_id, OLD.story_id);

  UPDATE public.stories
  SET
    views_count = (
      SELECT COUNT(*)::INTEGER FROM public.story_views WHERE story_id = target_story_id
    ),
    likes_count = (
      SELECT COUNT(*)::INTEGER FROM public.story_likes WHERE story_id = target_story_id
    ),
    replies_count = (
      SELECT COUNT(*)::INTEGER FROM public.story_replies WHERE story_id = target_story_id
    ),
    updated_at = now()
  WHERE id = target_story_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_story_counts_on_story_view_insert ON public.story_views;
CREATE TRIGGER sync_story_counts_on_story_view_insert
AFTER INSERT ON public.story_views
FOR EACH ROW EXECUTE FUNCTION public.sync_story_counts();

DROP TRIGGER IF EXISTS sync_story_counts_on_story_like_insert ON public.story_likes;
CREATE TRIGGER sync_story_counts_on_story_like_insert
AFTER INSERT ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_story_counts();

DROP TRIGGER IF EXISTS sync_story_counts_on_story_like_delete ON public.story_likes;
CREATE TRIGGER sync_story_counts_on_story_like_delete
AFTER DELETE ON public.story_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_story_counts();

DROP TRIGGER IF EXISTS sync_story_counts_on_story_reply_insert ON public.story_replies;
CREATE TRIGGER sync_story_counts_on_story_reply_insert
AFTER INSERT ON public.story_replies
FOR EACH ROW EXECUTE FUNCTION public.sync_story_counts();

DROP TRIGGER IF EXISTS sync_story_counts_on_story_reply_delete ON public.story_replies;
CREATE TRIGGER sync_story_counts_on_story_reply_delete
AFTER DELETE ON public.story_replies
FOR EACH ROW EXECUTE FUNCTION public.sync_story_counts();

UPDATE public.stories s
SET
  views_count = COALESCE((SELECT COUNT(*)::INTEGER FROM public.story_views WHERE story_id = s.id), 0),
  likes_count = COALESCE((SELECT COUNT(*)::INTEGER FROM public.story_likes WHERE story_id = s.id), 0),
  replies_count = COALESCE((SELECT COUNT(*)::INTEGER FROM public.story_replies WHERE story_id = s.id), 0);
