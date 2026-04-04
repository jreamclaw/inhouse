CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON public.post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_post_comments" ON public.post_comments;
CREATE POLICY "public_read_post_comments"
ON public.post_comments FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "users_manage_own_post_comments" ON public.post_comments;
CREATE POLICY "users_manage_own_post_comments"
ON public.post_comments FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "public_read_saved_posts" ON public.saved_posts;
CREATE POLICY "public_read_saved_posts"
ON public.saved_posts FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_saved_posts" ON public.saved_posts;
CREATE POLICY "users_manage_own_saved_posts"
ON public.saved_posts FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON public.post_comments;
CREATE TRIGGER update_post_comments_updated_at
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.sync_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_post_id UUID;
BEGIN
  target_post_id := COALESCE(NEW.post_id, OLD.post_id);

  UPDATE public.posts
  SET comments_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.post_comments
    WHERE post_id = target_post_id
  ),
  updated_at = now()
  WHERE id = target_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_post_comments_count_on_insert ON public.post_comments;
CREATE TRIGGER sync_post_comments_count_on_insert
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();

DROP TRIGGER IF EXISTS sync_post_comments_count_on_delete ON public.post_comments;
CREATE TRIGGER sync_post_comments_count_on_delete
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.sync_post_comments_count();
