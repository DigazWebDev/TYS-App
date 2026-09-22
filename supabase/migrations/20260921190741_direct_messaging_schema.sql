-- DMs 1:1. Sem follows, sem UI.
-- Não altera tabelas do feed.
-- Não faz REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private.
--
-- GRANT USAGE em private tornaria chamáveis as funções existentes, porque
-- hoje têm EXECUTE para PUBLIC mas o schema não tem USAGE. Por isso esta
-- migration revoga EXECUTE só em private.handle_new_user() e
-- private.set_updated_at() para public/anon/authenticated. Os triggers
-- existentes continuam a disparar: EXECUTE de trigger não é exigido ao
-- cliente em runtime.

create table public.conversations (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  created_by uuid references public.profiles (id) on delete set null,
  is_direct boolean not null default true,
  direct_user_low uuid references public.profiles (id) on delete cascade,
  direct_user_high uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint conversations_direct_pair_ordered
    check (direct_user_low < direct_user_high),
  constraint conversations_direct_shape
    check (
      (
        is_direct = true
        and direct_user_low is not null
        and direct_user_high is not null
      )
      or
      (
        is_direct = false
        and direct_user_low is null
        and direct_user_high is null
      )
    ),
  constraint conversations_creator_is_participant
    check (
      not is_direct
      or created_by is null
      or created_by in (direct_user_low, direct_user_high)
    ),
  constraint conversations_direct_pair_unique
    unique (direct_user_low, direct_user_high)
);

create index conversations_updated_at_idx
  on public.conversations (updated_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default pg_catalog.now(),
  primary key (conversation_id, user_id)
);

create index conversation_members_user_id_idx
  on public.conversation_members (user_id);

create or replace function private.sync_direct_conversation_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_direct then
    insert into public.conversation_members (conversation_id, user_id)
    values
      (new.id, new.direct_user_low),
      (new.id, new.direct_user_high)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_direct_conversation_members() from public, anon, authenticated;

create trigger conversations_sync_direct_members
  after insert on public.conversations
  for each row execute function private.sync_direct_conversation_members();

create or replace function private.enforce_direct_conversation_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_direct boolean;
  v_low uuid;
  v_high uuid;
begin
  select c.is_direct, c.direct_user_low, c.direct_user_high
    into v_is_direct, v_low, v_high
  from public.conversations as c
  where c.id = new.conversation_id;

  if not found then
    raise exception 'conversation not found';
  end if;

  if v_is_direct and new.user_id not in (v_low, v_high) then
    raise exception 'direct conversation members must match the canonical pair';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_direct_conversation_member() from public, anon, authenticated;

create trigger conversation_members_enforce_direct
  before insert on public.conversation_members
  for each row execute function private.enforce_direct_conversation_member();

create table public.messages (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint messages_body_not_empty
    check (pg_catalog.char_length(pg_catalog.btrim(body)) > 0),
  constraint messages_body_max_length
    check (pg_catalog.char_length(body) <= 4000),
  constraint messages_author_is_member_fkey
    foreign key (conversation_id, author_id)
    references public.conversation_members (conversation_id, user_id)
    on delete cascade
);

create index messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at desc);

create index messages_author_id_idx
  on public.messages (author_id);

create trigger messages_set_updated_at
  before update on public.messages
  for each row execute function private.set_updated_at();

create or replace function private.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set updated_at = pg_catalog.now()
  where id = new.conversation_id;

  return new;
end;
$$;

revoke all on function private.touch_conversation_on_message() from public, anon, authenticated;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function private.touch_conversation_on_message();

create or replace function private.protect_message_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.conversation_id is distinct from old.conversation_id
     or new.author_id is distinct from old.author_id then
    raise exception 'message conversation_id and author_id are immutable';
  end if;

  return new;
end;
$$;

revoke all on function private.protect_message_identity() from public, anon, authenticated;

create trigger messages_protect_identity
  before update on public.messages
  for each row execute function private.protect_message_identity();

create or replace function private.is_conversation_member(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members as m
    where m.conversation_id = p_conversation_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_member(uuid) from public, anon, authenticated;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;

create or replace function public.create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  if p_other_user_id is null or p_other_user_id = v_me then
    raise exception 'invalid participant';
  end if;

  if v_me < p_other_user_id then
    v_low := v_me;
    v_high := p_other_user_id;
  else
    v_low := p_other_user_id;
    v_high := v_me;
  end if;

  insert into public.conversations (
    created_by,
    is_direct,
    direct_user_low,
    direct_user_high
  )
  values (v_me, true, v_low, v_high)
  on conflict on constraint conversations_direct_pair_unique
  do nothing
  returning id into v_id;

  if v_id is not null then
    return v_id;
  end if;

  select c.id
    into strict v_id
  from public.conversations as c
  where c.direct_user_low = v_low
    and c.direct_user_high = v_high;

  return v_id;
end;
$$;

revoke all on function public.create_direct_conversation(uuid) from public, anon;
grant execute on function public.create_direct_conversation(uuid) to authenticated;

revoke all on table public.conversations from public, anon, authenticated;
revoke all on table public.conversation_members from public, anon, authenticated;
revoke all on table public.messages from public, anon, authenticated;

grant select, insert on table public.conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select, insert, delete on table public.messages to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

alter table public.conversations force row level security;
alter table public.conversation_members force row level security;
alter table public.messages force row level security;

create policy conversations_select_member
  on public.conversations
  for select
  to authenticated
  using (private.is_conversation_member(id));

create policy conversations_insert_participant
  on public.conversations
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and is_direct = true
    and direct_user_low < direct_user_high
    and (select auth.uid()) in (direct_user_low, direct_user_high)
  );

create policy conversation_members_select_member
  on public.conversation_members
  for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create policy messages_select_member
  on public.messages
  for select
  to authenticated
  using (private.is_conversation_member(conversation_id));

create policy messages_insert_own_as_member
  on public.messages
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_conversation_member(conversation_id)
  );

create policy messages_delete_own
  on public.messages
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    and private.is_conversation_member(conversation_id)
  );
