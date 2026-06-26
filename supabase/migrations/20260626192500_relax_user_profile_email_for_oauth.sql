-- Allow OAuth providers like Apple to create auth users even when email is
-- unavailable or withheld on first return. Keep app profile bootstrap resilient.
ALTER TABLE public.user_profiles
  ALTER COLUMN email DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role public.user_role;
    resolved_email TEXT;
    resolved_name TEXT;
    resolved_username TEXT;
BEGIN
    user_role := CASE
        WHEN (NEW.raw_user_meta_data->>'role') IN ('chef', 'customer')
            THEN (NEW.raw_user_meta_data->>'role')::public.user_role
        ELSE NULL
    END;

    resolved_email := COALESCE(
        NULLIF(NEW.email, ''),
        NULLIF(NEW.raw_user_meta_data->>'email', '')
    );

    resolved_name := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(split_part(COALESCE(resolved_email, ''), '@', 1), ''),
        'user'
    );

    resolved_username := CONCAT('user_', replace(NEW.id::text, '-', ''));

    INSERT INTO public.user_profiles (
        id,
        email,
        full_name,
        avatar_url,
        role,
        username,
        vendor_onboarding_complete
    )
    VALUES (
        NEW.id,
        resolved_email,
        resolved_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        user_role,
        resolved_username,
        false
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;
