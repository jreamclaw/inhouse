CREATE OR REPLACE FUNCTION public.sync_user_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);

  UPDATE public.user_profiles
  SET posts_count = (
    SELECT COUNT(*)::INTEGER
    FROM public.posts
    WHERE user_id = target_user_id
  ),
  updated_at = now()
  WHERE id = target_user_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_user_posts_count_on_insert ON public.posts;
CREATE TRIGGER sync_user_posts_count_on_insert
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_user_posts_count();

DROP TRIGGER IF EXISTS sync_user_posts_count_on_delete ON public.posts;
CREATE TRIGGER sync_user_posts_count_on_delete
AFTER DELETE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.sync_user_posts_count();
