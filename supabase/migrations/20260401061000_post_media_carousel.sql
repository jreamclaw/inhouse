CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_view_post_media" ON public.post_media;
CREATE POLICY "anyone_view_post_media"
ON public.post_media FOR SELECT
USING (true);

DROP POLICY IF EXISTS "users_insert_own_post_media" ON public.post_media;
CREATE POLICY "users_insert_own_post_media"
ON public.post_media FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = post_id AND p.user_id = auth.uid()
  )
);
