-- Permanent public chef discovery source for Nearby and public chef listing.
-- Exposes only discovery-safe chef fields instead of the full user_profiles table.

create or replace view public.public_chef_discovery as
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
