-- Follows unilaterais. Sem contadores desnormalizados, sem UI nesta migration.
-- Sem follows de si próprio. Sem UPDATE.

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);

create index follows_follower_created_idx
  on public.follows (follower_id, created_at desc);

create index follows_following_created_idx
  on public.follows (following_id, created_at desc);

revoke all on table public.follows from public, anon, authenticated;
grant select, insert, delete on table public.follows to authenticated;

alter table public.follows enable row level security;
alter table public.follows force row level security;

create policy follows_select_authenticated
on public.follows
for select
to authenticated
using (true);

create policy follows_insert_own
on public.follows
for insert
to authenticated
with check (follower_id = (select auth.uid()));

create policy follows_delete_own
on public.follows
for delete
to authenticated
using (follower_id = (select auth.uid()));
