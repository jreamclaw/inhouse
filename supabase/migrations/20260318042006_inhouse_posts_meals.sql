-- ============================================================
-- InHouse: Posts, Meals, User Profiles Migration
-- ============================================================

-- 1. TYPES
DROP TYPE IF EXISTS public.user_role CASCADE;
CREATE TYPE public.user_role AS ENUM ('chef', 'customer');

DROP TYPE IF EXISTS public.media_type CASCADE;
CREATE TYPE public.media_type AS ENUM ('image', 'video');

-- 2. CORE TABLES

-- User Profiles (intermediary for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    username TEXT UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    location TEXT,
    role public.user_role DEFAULT 'customer'::public.user_role,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure existing user_profiles tables get the columns this migration expects
ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS role public.user_role DEFAULT 'customer'::public.user_role,
    ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS posts_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    caption TEXT,
    media_url TEXT NOT NULL,
    media_type public.media_type DEFAULT 'image'::public.media_type,
    location TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Meals table (chef menu items)
CREATE TABLE IF NOT EXISTS public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chef_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT DEFAULT 'Mains',
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Post likes
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_chef_id ON public.meals(chef_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_unique ON public.post_likes(post_id, user_id);

-- 4. FUNCTIONS

-- Handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url, role, username)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Check if user is chef
CREATE OR REPLACE FUNCTION public.is_chef()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'chef'
)
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles: public read, own write
DROP POLICY IF EXISTS "public_read_user_profiles" ON public.user_profiles;
CREATE POLICY "public_read_user_profiles"
ON public.user_profiles FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles FOR ALL TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- posts: public read, owner write
DROP POLICY IF EXISTS "public_read_posts" ON public.posts;
CREATE POLICY "public_read_posts"
ON public.posts FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "users_manage_own_posts" ON public.posts;
CREATE POLICY "users_manage_own_posts"
ON public.posts FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- meals: public read, chef owner write
DROP POLICY IF EXISTS "public_read_meals" ON public.meals;
CREATE POLICY "public_read_meals"
ON public.meals FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "chefs_manage_own_meals" ON public.meals;
CREATE POLICY "chefs_manage_own_meals"
ON public.meals FOR ALL TO authenticated
USING (chef_id = auth.uid()) WITH CHECK (chef_id = auth.uid());

-- post_likes: authenticated read/write own
DROP POLICY IF EXISTS "public_read_post_likes" ON public.post_likes;
CREATE POLICY "public_read_post_likes"
ON public.post_likes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "users_manage_own_post_likes" ON public.post_likes;
CREATE POLICY "users_manage_own_post_likes"
ON public.post_likes FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_meals_updated_at ON public.meals;
CREATE TRIGGER update_meals_updated_at
    BEFORE UPDATE ON public.meals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. STORAGE BUCKETS (via SQL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('posts', 'posts', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime', 'video/webm']),
    ('meals', 'meals', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "public_read_posts_storage" ON storage.objects;
CREATE POLICY "public_read_posts_storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "auth_upload_posts_storage" ON storage.objects;
CREATE POLICY "auth_upload_posts_storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_delete_posts_storage" ON storage.objects;
CREATE POLICY "auth_delete_posts_storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'posts' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "public_read_meals_storage" ON storage.objects;
CREATE POLICY "public_read_meals_storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'meals');

DROP POLICY IF EXISTS "auth_upload_meals_storage" ON storage.objects;
CREATE POLICY "auth_upload_meals_storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meals' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_delete_meals_storage" ON storage.objects;
CREATE POLICY "auth_delete_meals_storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'meals' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 9. MOCK DATA
DO $$
DECLARE
    chef_uuid UUID := gen_random_uuid();
    customer_uuid UUID := gen_random_uuid();
    post1_uuid UUID := gen_random_uuid();
    post2_uuid UUID := gen_random_uuid();
    post3_uuid UUID := gen_random_uuid();
    meal1_uuid UUID := gen_random_uuid();
    meal2_uuid UUID := gen_random_uuid();
    meal3_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (chef_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'maya@inhouse.app', crypt('InHouse2026!', gen_salt('bf', 10)), now(), now(), now(),
         jsonb_build_object('full_name', 'Maya Chen', 'role', 'chef', 'username', 'chef_maya'),
         jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (customer_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'priya@inhouse.app', crypt('InHouse2026!', gen_salt('bf', 10)), now(), now(), now(),
         jsonb_build_object('full_name', 'Priya Sharma', 'role', 'customer', 'username', 'priya_eats'),
         jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)
    ON CONFLICT (id) DO NOTHING;

    -- Update chef profile with more details (trigger creates the basic profile)
    UPDATE public.user_profiles SET
        bio = 'Northern Italian cuisine with a California twist 🍝 Trained at Le Cordon Bleu, cooking for SF since 2018.',
        location = 'San Francisco, CA',
        avatar_url = 'https://img.rocket.new/generatedImages/rocket_gen_img_104cd512f-1773486840118.png'
    WHERE id = chef_uuid;

    -- Insert sample posts for chef
    INSERT INTO public.posts (id, user_id, caption, media_url, media_type, location, likes_count, comments_count)
    VALUES
        (post1_uuid, chef_uuid, 'Handmade tagliatelle with black truffle cream sauce 🍝 Every strand rolled by hand this morning. Available for order this weekend!',
         'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14', 'image', 'San Francisco, CA', 847, 42),
        (post2_uuid, chef_uuid, 'New on the menu: Mango Habanero Glazed Salmon 🥭🌶️ Sweet heat, perfectly seared. Pre-order opens tomorrow 6PM.',
         'https://img.rocket.new/generatedImages/rocket_gen_img_1cdc31a08-1772058323789.png', 'image', 'San Francisco, CA', 1203, 89),
        (post3_uuid, customer_uuid, 'Finally tried the Sunday thali and honestly cannot stop thinking about it 😭 The dal makhani alone is worth every penny!',
         'https://images.unsplash.com/photo-1568228780318-159300cb712d', 'image', 'Oakland, CA', 234, 18)
    ON CONFLICT (id) DO NOTHING;

    -- Insert sample meals for chef
    INSERT INTO public.meals (id, chef_id, title, description, price, image_url, category, available)
    VALUES
        (meal1_uuid, chef_uuid, 'Truffle Tagliatelle',
         'Handmade tagliatelle with Perigord black truffle cream sauce, aged Parmesan, and fresh chives.',
         38.00, 'https://images.unsplash.com/photo-1685022135825-b74ac61b5e14', 'Pasta', true),
        (meal2_uuid, chef_uuid, 'Mango Habanero Salmon',
         'Seared salmon with mango habanero glaze, microgreens, and jasmine rice.',
         44.00, 'https://img.rocket.new/generatedImages/rocket_gen_img_1cdc31a08-1772058323789.png', 'Mains', true),
        (meal3_uuid, chef_uuid, 'Mushroom Risotto',
         'Arborio rice with wild porcini, cremini, and chanterelle mushrooms, finished with truffle oil.',
         32.00, 'https://images.unsplash.com/photo-1724116380653-a5371c60944a', 'Pasta', true)
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
