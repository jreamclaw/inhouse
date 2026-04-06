begin;

alter table public.user_profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists is_verified boolean not null default false,
  add column if not exists is_certified boolean not null default false,
  add column if not exists is_licensed boolean not null default false,
  add column if not exists is_top_rated boolean not null default false,
  add column if not exists is_pro_chef boolean not null default false,
  add column if not exists trust_score integer not null default 0,
  add column if not exists rating_avg numeric(3,2) not null default 0,
  add column if not exists rating_count integer not null default 0,
  add column if not exists completed_orders integer not null default 0,
  add column if not exists complaints_count integer not null default 0,
  add column if not exists approved_credentials_count integer not null default 0,
  add column if not exists approved_certificate_count integer not null default 0,
  add column if not exists approved_license_count integer not null default 0,
  add column if not exists trust_label text not null default 'Low trust';

create table if not exists public.chef_credentials (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.user_profiles(id) on delete cascade,
  credential_type text not null,
  title text not null,
  file_url text not null,
  file_name text not null,
  file_path text not null,
  file_bucket text not null,
  status text not null default 'pending',
  issued_by text,
  issue_date date,
  expiration_date date,
  review_notes text,
  reviewed_by uuid null references public.user_profiles(id) on delete set null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chef_credentials_status_check check (status in ('pending', 'approved', 'rejected', 'expired'))
);

create index if not exists chef_credentials_chef_id_idx on public.chef_credentials (chef_id);
create index if not exists chef_credentials_status_idx on public.chef_credentials (status);
create index if not exists chef_credentials_type_idx on public.chef_credentials (credential_type);

create table if not exists public.chef_badges (
  id uuid primary key default gen_random_uuid(),
  chef_id uuid not null references public.user_profiles(id) on delete cascade,
  badge_type text not null,
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  reason text,
  unique (chef_id, badge_type)
);

create index if not exists chef_badges_chef_id_idx on public.chef_badges (chef_id);
create index if not exists chef_badges_active_idx on public.chef_badges (is_active);

alter table public.chef_credentials enable row level security;
alter table public.chef_badges enable row level security;

create or replace function public.is_inhouse_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'email') in (
    'support@inhouseapp.net',
    'admin@inhouseapp.net'
  ), false);
$$;

create policy "chefs read own credentials"
on public.chef_credentials
for select
using (auth.uid() = chef_id or public.is_inhouse_admin());

create policy "chefs insert own credentials"
on public.chef_credentials
for insert
with check (auth.uid() = chef_id);

create policy "chefs update pending own credentials"
on public.chef_credentials
for update
using (auth.uid() = chef_id or public.is_inhouse_admin())
with check (
  public.is_inhouse_admin()
  or (
    auth.uid() = chef_id
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  )
);

create policy "admins delete credentials"
on public.chef_credentials
for delete
using (public.is_inhouse_admin());

create policy "public can read active badges"
on public.chef_badges
for select
using (is_active = true or auth.uid() = chef_id or public.is_inhouse_admin());

create policy "admins manage badges"
on public.chef_badges
for all
using (public.is_inhouse_admin())
with check (public.is_inhouse_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_chef_credentials_updated_at
before update on public.chef_credentials
for each row
execute function public.touch_updated_at();

create or replace function public.compute_trust_label(score integer)
returns text
language plpgsql
immutable
as $$
begin
  if score >= 85 then
    return 'Highly trusted';
  elsif score >= 70 then
    return 'Trusted chef';
  elsif score >= 40 then
    return 'Building trust';
  else
    return 'Low trust';
  end if;
end;
$$;

create or replace function public.refresh_chef_trust(chef_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.user_profiles%rowtype;
  approved_total integer := 0;
  approved_certificates integer := 0;
  approved_licenses integer := 0;
  menu_photo_count integer := 0;
  next_score integer := 0;
  next_rating_avg numeric(3,2) := 0;
  next_rating_count integer := 0;
begin
  select * into profile_row
  from public.user_profiles
  where id = chef_uuid;

  if not found then
    return;
  end if;

  update public.chef_credentials
  set status = 'expired', reviewed_at = coalesce(reviewed_at, now())
  where chef_id = chef_uuid
    and expiration_date is not null
    and expiration_date < current_date
    and status = 'approved';

  select
    count(*) filter (where status = 'approved'),
    count(*) filter (where status = 'approved' and credential_type in ('food_safety_certificate', 'servsafe', 'culinary_certification', 'other_certificate')),
    count(*) filter (where status = 'approved' and credential_type in ('business_license', 'permit', 'insurance'))
  into approved_total, approved_certificates, approved_licenses
  from public.chef_credentials
  where chef_id = chef_uuid;

  select count(*)
  into menu_photo_count
  from public.meals
  where chef_id = chef_uuid
    and image_url is not null
    and length(trim(image_url)) > 0;

  begin
    select
      coalesce(round(avg(overall_rating)::numeric, 2), 0),
      count(*)
    into next_rating_avg, next_rating_count
    from public.order_reviews
    where chef_id = chef_uuid;
  exception when undefined_table then
    next_rating_avg := coalesce(profile_row.rating_avg, 0);
    next_rating_count := coalesce(profile_row.rating_count, 0);
  end;

  if coalesce(profile_row.avatar_url, '') <> '' then next_score := next_score + 5; end if;
  if coalesce(profile_row.bio, '') <> '' then next_score := next_score + 5; end if;
  if menu_photo_count >= 3 then next_score := next_score + 10; end if;
  if profile_row.email_verified then next_score := next_score + 10; end if;
  if profile_row.phone_verified then next_score := next_score + 10; end if;
  if profile_row.identity_verified then next_score := next_score + 15; end if;
  if approved_certificates >= 1 then next_score := next_score + 15; end if;
  if approved_licenses >= 1 then next_score := next_score + 10; end if;
  if coalesce(profile_row.completed_orders, 0) >= 5 then next_score := next_score + 5; end if;
  if coalesce(profile_row.completed_orders, 0) >= 10 then next_score := next_score + 5; end if;
  if next_rating_avg >= 4.5 then next_score := next_score + 5; end if;
  if coalesce(profile_row.complaints_count, 0) = 0 then next_score := next_score + 5; end if;

  next_score := least(next_score, 100);

  update public.user_profiles
  set
    rating_avg = next_rating_avg,
    rating_count = next_rating_count,
    approved_credentials_count = approved_total,
    approved_certificate_count = approved_certificates,
    approved_license_count = approved_licenses,
    is_verified = (email_verified and phone_verified and identity_verified),
    is_certified = approved_certificates >= 1,
    is_licensed = approved_licenses >= 1,
    is_top_rated = next_rating_count >= 10 and next_rating_avg >= 4.7,
    is_pro_chef = identity_verified and approved_total >= 2 and coalesce(completed_orders, 0) >= 15 and next_rating_avg >= 4.7,
    trust_score = next_score,
    trust_label = public.compute_trust_label(next_score),
    updated_at = now()
  where id = chef_uuid;

  insert into public.chef_badges (chef_id, badge_type, is_active, reason)
  values
    (chef_uuid, 'verified_identity', (select is_verified from public.user_profiles where id = chef_uuid), 'Email, phone, and identity verified'),
    (chef_uuid, 'certified', (select is_certified from public.user_profiles where id = chef_uuid), 'At least one approved certificate on file'),
    (chef_uuid, 'licensed_business', (select is_licensed from public.user_profiles where id = chef_uuid), 'Approved business license or permit on file'),
    (chef_uuid, 'top_rated', (select is_top_rated from public.user_profiles where id = chef_uuid), 'Strong customer ratings'),
    (chef_uuid, 'pro_chef', (select is_pro_chef from public.user_profiles where id = chef_uuid), 'High trust, strong ratings, and experience'),
    (chef_uuid, 'new_chef', ((select coalesce(completed_orders, 0) from public.user_profiles where id = chef_uuid) < 15), 'New chef building trust on InHouse')
  on conflict (chef_id, badge_type)
  do update set
    is_active = excluded.is_active,
    reason = excluded.reason,
    granted_at = case when excluded.is_active then now() else public.chef_badges.granted_at end;
end;
$$;

create or replace function public.refresh_chef_trust_from_credential()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_chef_trust(coalesce(new.chef_id, old.chef_id));
  return coalesce(new, old);
end;
$$;

create trigger refresh_chef_trust_on_credential_change
after insert or update or delete on public.chef_credentials
for each row
execute function public.refresh_chef_trust_from_credential();

create or replace function public.refresh_chef_trust_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'chef' then
    perform public.refresh_chef_trust(new.id);
  end if;
  return new;
end;
$$;

create trigger refresh_chef_trust_on_profile_change
after update of email_verified, phone_verified, identity_verified, avatar_url, bio, completed_orders, complaints_count on public.user_profiles
for each row
execute function public.refresh_chef_trust_from_profile();

create or replace function public.refresh_chef_trust_from_meals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_chef_trust(coalesce(new.chef_id, old.chef_id));
  return coalesce(new, old);
end;
$$;

create trigger refresh_chef_trust_on_meal_change
after insert or update or delete on public.meals
for each row
execute function public.refresh_chef_trust_from_meals();

insert into storage.buckets (id, name, public)
values
  ('chef-certificates', 'chef-certificates', false),
  ('chef-licenses', 'chef-licenses', false),
  ('chef-insurance', 'chef-insurance', false)
on conflict (id) do nothing;

create policy "chefs upload own certificate files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('chef-certificates', 'chef-licenses', 'chef-insurance')
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chefs read own credential files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('chef-certificates', 'chef-licenses', 'chef-insurance')
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_inhouse_admin()
  )
);

create policy "chefs update own credential files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('chef-certificates', 'chef-licenses', 'chef-insurance')
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id in ('chef-certificates', 'chef-licenses', 'chef-insurance')
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "chefs delete own credential files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('chef-certificates', 'chef-licenses', 'chef-insurance')
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_inhouse_admin()
  )
);

update public.user_profiles
set email_verified = coalesce(email_verified, false)
where true;

update public.user_profiles
set trust_label = public.compute_trust_label(trust_score)
where true;

commit;
