-- ============================================================
-- Monetization: platform fee tracking per order
-- ============================================================
CREATE TABLE IF NOT EXISTS public.order_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  chef_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  platform_fee_rate NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  platform_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  chef_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.order_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_own_orders" ON public.order_revenue;
CREATE POLICY "users_view_own_orders"
ON public.order_revenue FOR SELECT TO authenticated
USING (user_id = auth.uid() OR chef_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_orders" ON public.order_revenue;
CREATE POLICY "users_insert_own_orders"
ON public.order_revenue FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_order_revenue_user_id ON public.order_revenue(user_id);
CREATE INDEX IF NOT EXISTS idx_order_revenue_chef_id ON public.order_revenue(chef_id);

-- ============================================================
-- Social: follows table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_follows" ON public.user_follows;
CREATE POLICY "users_manage_own_follows"
ON public.user_follows FOR ALL TO authenticated
USING (follower_id = auth.uid())
WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "users_view_follows" ON public.user_follows;
CREATE POLICY "users_view_follows"
ON public.user_follows FOR SELECT TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON public.user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON public.user_follows(following_id);

-- ============================================================
-- Onboarding: track completion state
-- ============================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS location_permission_granted BOOLEAN DEFAULT false;
