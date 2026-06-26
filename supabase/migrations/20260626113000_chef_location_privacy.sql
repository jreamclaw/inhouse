ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS chef_hide_exact_location BOOLEAN NOT NULL DEFAULT false;
