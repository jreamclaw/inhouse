ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS business_hours TEXT,
ADD COLUMN IF NOT EXISTS closed_days TEXT[] NOT NULL DEFAULT '{}'::text[];
