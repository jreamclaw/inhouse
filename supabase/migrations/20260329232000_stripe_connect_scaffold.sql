-- InHouse: Stripe Connect + payment scaffolding

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_last4 TEXT;
