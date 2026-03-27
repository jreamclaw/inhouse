-- User settings table for notification and privacy preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- Notification preferences
  notif_new_follower BOOLEAN DEFAULT true,
  notif_post_likes BOOLEAN DEFAULT true,
  notif_comments BOOLEAN DEFAULT true,
  notif_order_updates BOOLEAN DEFAULT true,
  notif_promotions BOOLEAN DEFAULT false,
  -- Privacy preferences
  privacy_public_profile BOOLEAN DEFAULT true,
  privacy_show_location BOOLEAN DEFAULT true,
  privacy_show_activity BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id_lookup ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_settings" ON public.user_settings;
CREATE POLICY "users_manage_own_settings"
ON public.user_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also add cover_url column to user_profiles if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS cover_url TEXT;
