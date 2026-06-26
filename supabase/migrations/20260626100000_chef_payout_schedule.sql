ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS payout_schedule TEXT NOT NULL DEFAULT 'daily';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_payout_schedule_check'
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_payout_schedule_check
      CHECK (payout_schedule IN ('daily', 'weekly'));
  END IF;
END $$;
