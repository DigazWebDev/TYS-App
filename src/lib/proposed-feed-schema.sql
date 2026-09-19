-- TYS initial schema — applied after approval.
-- Project: TYS App (mzrzwvclvcmuqbcqkxcl)

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,32}$'),
  constraint profiles_username_unique unique (username)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_has_content
    check (
      (body is not null and length(trim(body)) > 0)
      or image_url is not null
    )
);

create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint post_comments_body_not_empty
    check (length(trim(body)) > 0)
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  media_url text not null,
  type text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  constraint stories_type_valid check (type in ('image', 'video'))
);

create table public.story_views (
  story_id uuid not null references public.stories (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (story_id, viewer_id)
);

-- ---------------------------------------------------------------------------
-- Indexes (feed)
-- ---------------------------------------------------------------------------

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_created_at_idx on public.posts (author_id, created_at desc);
create index post_likes_user_id_idx on public.post_likes (user_id);
create index post_comments_post_created_at_idx on public.post_comments (post_id, created_at);
create index stories_user_created_at_idx on public.stories (user_id, created_at desc);
create index stories_expires_at_idx on public.stories (expires_at);
create index story_views_viewer_id_idx on public.story_views (viewer_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function private.set_updated_at();

create trigger post_comments_set_updated_at
  before update on public.post_comments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile row on signup (does not read user_metadata)
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  next_username text;
begin
  base_username := lower(regexp_replace(
    split_part(coalesce(new.email, 'user'), '@', 1),
    '[^a-z0-9_]',
    '',
    'g'
  ));

  if length(base_username) < 3 then
    base_username := 'user';
  end if;

  base_username := left(base_username, 23);
  next_username := base_username || '_' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.profiles (id, username)
  values (new.id, next_username);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill: existing auth users without a profile (idempotent, no overwrites)
-- ---------------------------------------------------------------------------

insert into public.profiles (id, username)
select
  u.id,
  (
    case
      when length(s.base) < 3 then 'user'
      else left(s.base, 23)
    end
  ) || '_' || substr(replace(u.id::text, '-', ''), 1, 8)
from auth.users as u
cross join lateral (
  select lower(regexp_replace(
    split_part(coalesce(u.email, 'user'), '@', 1),
    '[^a-z0-9_]',
    '',
    'g'
  )) as base
) as s
where not exists (
  select 1
  from public.profiles as p
  where p.id = u.id
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Privileges: authenticated only. anon has no table access.
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.posts from public, anon, authenticated;
revoke all on table public.post_likes from public, anon, authenticated;
revoke all on table public.post_comments from public, anon, authenticated;
revoke all on table public.stories from public, anon, authenticated;
revoke all on table public.story_views from public, anon, authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.posts to authenticated;
grant select, insert, delete on table public.post_likes to authenticated;
grant select, insert, update, delete on table public.post_comments to authenticated;
grant select, insert, update, delete on table public.stories to authenticated;
grant select, insert, delete on table public.story_views to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;

alter table public.profiles force row level security;
alter table public.posts force row level security;
alter table public.post_likes force row level security;
alter table public.post_comments force row level security;
alter table public.stories force row level security;
alter table public.story_views force row level security;

-- profiles
create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- posts
create policy posts_select_authenticated
  on public.posts
  for select
  to authenticated
  using (true);

create policy posts_insert_own
  on public.posts
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy posts_update_own
  on public.posts
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy posts_delete_own
  on public.posts
  for delete
  to authenticated
  using (author_id = auth.uid());

-- post_likes
create policy post_likes_select_authenticated
  on public.post_likes
  for select
  to authenticated
  using (true);

create policy post_likes_insert_own
  on public.post_likes
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy post_likes_delete_own
  on public.post_likes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- post_comments
create policy post_comments_select_authenticated
  on public.post_comments
  for select
  to authenticated
  using (true);

create policy post_comments_insert_own
  on public.post_comments
  for insert
  to authenticated
  with check (author_id = auth.uid());

create policy post_comments_update_own
  on public.post_comments
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy post_comments_delete_own
  on public.post_comments
  for delete
  to authenticated
  using (author_id = auth.uid());

-- stories: visible while live, or always to the owner
create policy stories_select_live_or_own
  on public.stories
  for select
  to authenticated
  using (expires_at > now() or user_id = auth.uid());

create policy stories_insert_own
  on public.stories
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy stories_update_own
  on public.stories
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy stories_delete_own
  on public.stories
  for delete
  to authenticated
  using (user_id = auth.uid());

-- story_views: own views only (feed can still check viewed-by-me)
create policy story_views_select_own
  on public.story_views
  for select
  to authenticated
  using (viewer_id = auth.uid());

create policy story_views_insert_own
  on public.story_views
  for insert
  to authenticated
  with check (viewer_id = auth.uid());

create policy story_views_delete_own
  on public.story_views
  for delete
  to authenticated
  using (viewer_id = auth.uid());
