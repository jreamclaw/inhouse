create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  notes text
);

create unique index if not exists idx_account_deletion_requests_user_pending
  on public.account_deletion_requests (user_id)
  where status = 'pending';

alter table public.account_deletion_requests enable row level security;

drop policy if exists "Users can create their own deletion requests" on public.account_deletion_requests;
create policy "Users can create their own deletion requests"
  on public.account_deletion_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own deletion requests" on public.account_deletion_requests;
create policy "Users can view their own deletion requests"
  on public.account_deletion_requests
  for select
  to authenticated
  using (auth.uid() = user_id);
