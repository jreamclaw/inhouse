ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payout_schedule_updated_at TIMESTAMPTZ;

UPDATE public.user_profiles
SET payout_schedule_updated_at = COALESCE(payout_schedule_updated_at, updated_at, created_at, now())
WHERE payout_schedule_updated_at IS NULL;
