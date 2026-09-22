-- ON CONFLICT consulta a policy de SELECT para resolver o conflito.
-- Num DM novo o utilizador ainda não é membro, por isso o SELECT falha
-- e o Postgres reporta violação de RLS mesmo sem linha duplicada.
-- unique_violation trata a corrida sem essa leitura antecipada.
-- A RPC mantém-se SECURITY INVOKER.

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

  begin
    insert into public.conversations (
      created_by,
      is_direct,
      direct_user_low,
      direct_user_high
    )
    values (v_me, true, v_low, v_high);
  exception
    when unique_violation then
      null;
  end;

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
