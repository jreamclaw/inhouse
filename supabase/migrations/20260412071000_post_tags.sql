create table if not exists public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  tagged_user_id uuid not null references public.user_profiles(id) on delete cascade,
  tagged_by_user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, tagged_user_id)
);

create index if not exists idx_post_tags_post_id on public.post_tags(post_id);
create index if not exists idx_post_tags_tagged_user_id on public.post_tags(tagged_user_id);

alter table public.post_tags enable row level security;

drop policy if exists "Anyone can read post tags" on public.post_tags;
create policy "Anyone can read post tags"
  on public.post_tags
  for select
  using (true);

drop policy if exists "Authenticated users can create post tags for own posts" on public.post_tags;
create policy "Authenticated users can create post tags for own posts"
  on public.post_tags
  for insert
  to authenticated
  with check (
    tagged_by_user_id = auth.uid()
    and exists (
      select 1
      from public.posts
      where posts.id = post_id
        and posts.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can delete tags on own posts" on public.post_tags;
create policy "Owners can delete tags on own posts"
  on public.post_tags
  for delete
  to authenticated
  using (
    tagged_by_user_id = auth.uid()
    or exists (
      select 1
      from public.posts
      where posts.id = post_id
        and posts.user_id = auth.uid()
    )
  );
