-- ============================================================
-- InHouse: Role Routing Fix — Add vendor_onboarding_complete
-- ============================================================

-- 1. Add vendor_onboarding_complete column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS vendor_onboarding_complete BOOLEAN DEFAULT false;

-- 2. Update handle_new_user trigger to correctly read role from metadata
--    and NOT default to customer when a role is explicitly provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role public.user_role;
BEGIN
    -- Read role from metadata; only fall back to 'customer' if not provided
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::public.user_role,
        'customer'::public.user_role
    );

    INSERT INTO public.user_profiles (
        id, email, full_name, avatar_url, role, username, vendor_onboarding_complete
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        user_role,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- 3. Re-create trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
