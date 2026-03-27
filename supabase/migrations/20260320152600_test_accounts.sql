-- Test Accounts Migration
-- Creates 4 test accounts covering every post-login routing scenario:
--
--  1. test.norole@inhouse.app       / Test1234!  → no role set          → /role-selection
--  2. test.customer@inhouse.app     / Test1234!  → customer, no onboard → /onboarding
--  3. test.customer.done@inhouse.app/ Test1234!  → customer, onboarded  → /home-feed
--  4. test.chef@inhouse.app         / Test1234!  → chef, no onboard     → /onboarding
--  5. test.chef.done@inhouse.app    / Test1234!  → chef, fully onboarded→ /chef-menu

DO $$
DECLARE
  v_norole_id   UUID := gen_random_uuid();
  v_cust_id     UUID := gen_random_uuid();
  v_cust_done   UUID := gen_random_uuid();
  v_chef_id     UUID := gen_random_uuid();
  v_chef_done   UUID := gen_random_uuid();
BEGIN

  -- ----------------------------------------------------------------
  -- 1. Insert auth.users rows
  -- ----------------------------------------------------------------
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous,
    confirmation_token, confirmation_sent_at,
    recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    email_change_token_current, email_change_confirm_status,
    reauthentication_token, reauthentication_sent_at,
    phone, phone_change, phone_change_token, phone_change_sent_at
  ) VALUES
    -- 1. No role
    (v_norole_id,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.norole@inhouse.app',
     crypt('Test1234!', gen_salt('bf', 10)),
     now(), now(), now(),
     jsonb_build_object('full_name', 'Test NoRole'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),

    -- 2. Customer, onboarding NOT complete
    (v_cust_id,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.customer@inhouse.app',
     crypt('Test1234!', gen_salt('bf', 10)),
     now(), now(), now(),
     jsonb_build_object('full_name', 'Test Customer'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),

    -- 3. Customer, onboarding complete
    (v_cust_done,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.customer.done@inhouse.app',
     crypt('Test1234!', gen_salt('bf', 10)),
     now(), now(), now(),
     jsonb_build_object('full_name', 'Test Customer Done'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),

    -- 4. Chef, onboarding NOT complete
    (v_chef_id,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.chef@inhouse.app',
     crypt('Test1234!', gen_salt('bf', 10)),
     now(), now(), now(),
     jsonb_build_object('full_name', 'Test Chef'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),

    -- 5. Chef, fully onboarded (onboarding_complete + vendor_onboarding_complete)
    (v_chef_done,
     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'test.chef.done@inhouse.app',
     crypt('Test1234!', gen_salt('bf', 10)),
     now(), now(), now(),
     jsonb_build_object('full_name', 'Test Chef Done'),
     jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
     false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null)

  ON CONFLICT (id) DO NOTHING;

  -- ----------------------------------------------------------------
  -- 2. Insert user_profiles rows with the correct routing state
  --    (app does NOT have a trigger, so we insert manually)
  -- ----------------------------------------------------------------
  INSERT INTO public.user_profiles (
    id, email, full_name, username,
    role, onboarding_complete, vendor_onboarding_complete,
    created_at, updated_at
  ) VALUES
    -- 1. No role → /role-selection
    (v_norole_id,
     'test.norole@inhouse.app', 'Test NoRole', 'test_norole',
     null, false, false,
     now(), now()),

    -- 2. Customer, onboarding NOT complete → /onboarding
    (v_cust_id,
     'test.customer@inhouse.app', 'Test Customer', 'test_customer',
     'customer'::public.user_role, false, false,
     now(), now()),

    -- 3. Customer, onboarding complete → /home-feed
    (v_cust_done,
     'test.customer.done@inhouse.app', 'Test Customer Done', 'test_customer_done',
     'customer'::public.user_role, true, false,
     now(), now()),

    -- 4. Chef, onboarding NOT complete → /onboarding
    (v_chef_id,
     'test.chef@inhouse.app', 'Test Chef', 'test_chef',
     'chef'::public.user_role, false, false,
     now(), now()),

    -- 5. Chef, fully onboarded → /chef-menu
    (v_chef_done,
     'test.chef.done@inhouse.app', 'Test Chef Done', 'test_chef_done',
     'chef'::public.user_role, true, true,
     now(), now())

  ON CONFLICT (id) DO NOTHING;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test account creation failed: %', SQLERRM;
END $$;
