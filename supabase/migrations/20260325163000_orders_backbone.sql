-- ============================================================
-- InHouse: Orders backbone for checkout + vendor tools
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  fulfillment_type TEXT NOT NULL DEFAULT 'delivery',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  address TEXT,
  apt TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  instructions TEXT,
  delivery_time TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  promo_discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  meal_id UUID REFERENCES public.meals(id) ON DELETE SET NULL,
  meal_title TEXT NOT NULL,
  meal_description TEXT,
  meal_image_url TEXT,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  customizations JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_chef_id ON public.orders(chef_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_view_related_orders" ON public.orders;
CREATE POLICY "users_view_related_orders"
ON public.orders FOR SELECT TO authenticated
USING (customer_id = auth.uid() OR chef_id = auth.uid());

DROP POLICY IF EXISTS "customers_insert_own_orders" ON public.orders;
CREATE POLICY "customers_insert_own_orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "related_users_update_orders" ON public.orders;
CREATE POLICY "related_users_update_orders"
ON public.orders FOR UPDATE TO authenticated
USING (customer_id = auth.uid() OR chef_id = auth.uid())
WITH CHECK (customer_id = auth.uid() OR chef_id = auth.uid());

DROP POLICY IF EXISTS "users_view_related_order_items" ON public.order_items;
CREATE POLICY "users_view_related_order_items"
ON public.order_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND (o.customer_id = auth.uid() OR o.chef_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "customers_insert_order_items" ON public.order_items;
CREATE POLICY "customers_insert_order_items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_id
      AND o.customer_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
