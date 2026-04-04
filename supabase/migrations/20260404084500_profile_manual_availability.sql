ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS availability_override TEXT;
