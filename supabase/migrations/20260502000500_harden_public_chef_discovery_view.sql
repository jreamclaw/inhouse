-- Recreate public chef discovery view with explicit invoker semantics and safe grants.
-- This avoids retaining unsafe live object attributes from prior DB state.

drop view if exists public.public_chef_discovery;

create view public.public_chef_discovery
with (security_invoker = true)
as
select
  id,
  full_name,
  bio,
  location,
  avatar_url,
  latitude,
  longitude,
  service_radius_miles,
  business_hours,
  availability_override,
  trust_score,
  trust_label,
  approved_credentials_count,
  email_verified,
  phone_verified,
  identity_verified,
  completed_orders,
  complaints_count,
  rating_avg,
  rating_count,
  is_verified,
  is_certified,
  is_licensed,
  is_top_rated,
  is_pro_chef,
  vendor_onboarding_complete,
  updated_at
from public.user_profiles
where role = 'chef'
  and vendor_onboarding_complete = true
  and latitude is not null
  and longitude is not null;

grant select on public.public_chef_discovery to anon, authenticated;
