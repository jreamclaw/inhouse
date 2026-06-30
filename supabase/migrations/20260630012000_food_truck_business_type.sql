alter table public.user_profiles
  add column if not exists business_type text;

update public.user_profiles
set business_type = coalesce(business_type, 'personal_chef')
where role = 'chef';
