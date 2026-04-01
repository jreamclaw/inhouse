ALTER TABLE public.meals
ADD COLUMN IF NOT EXISTS modifier_groups JSONB NOT NULL DEFAULT '[]'::jsonb;
