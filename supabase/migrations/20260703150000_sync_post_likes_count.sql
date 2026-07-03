create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.posts
    set likes_count = (
      select count(*)::integer
      from public.post_likes
      where post_id = old.post_id
    )
    where id = old.post_id;

    return old;
  end if;

  update public.posts
  set likes_count = (
    select count(*)::integer
    from public.post_likes
    where post_id = new.post_id
  )
  where id = new.post_id;

  return new;
end;
$$;

drop trigger if exists sync_post_likes_count_on_change on public.post_likes;
create trigger sync_post_likes_count_on_change
after insert or delete on public.post_likes
for each row
execute function public.sync_post_likes_count();

update public.posts p
set likes_count = coalesce(src.likes_count, 0)
from (
  select post_id, count(*)::integer as likes_count
  from public.post_likes
  group by post_id
) src
where p.id = src.post_id;

update public.posts
set likes_count = 0
where id not in (
  select distinct post_id from public.post_likes
);
