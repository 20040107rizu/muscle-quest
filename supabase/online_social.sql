-- MUSCLE QUEST オンライン版：応援と1週間対決を相手に届ける（online_setup.sql のあとに実行）
-- ブラウザからは直接さわれない（RLS・許可なし）。読み書きはアプリのサーバーだけ。何度実行しても壊れない。

create table if not exists public.mq_cheers (
  from_player uuid not null references public.mq_players on delete cascade,
  to_player uuid not null references public.mq_players on delete cascade,
  activity_id text not null,
  kind text not null check (kind in ('💪', '🔥', '👏')),
  created_at timestamptz not null default now(),
  primary key (from_player, to_player, activity_id, kind),
  check (from_player <> to_player)
);
create index if not exists mq_cheers_to on public.mq_cheers (to_player, activity_id);

create table if not exists public.mq_battles (
  challenger uuid not null references public.mq_players on delete cascade,
  opponent uuid not null references public.mq_players on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  primary key (challenger, opponent, start_date),
  check (challenger <> opponent),
  check (end_date = start_date + 6)
);

alter table public.mq_cheers enable row level security;
alter table public.mq_battles enable row level security;
revoke all on public.mq_cheers from anon, authenticated;
revoke all on public.mq_battles from anon, authenticated;

-- 自分が送った応援をまるごと置き換える（実在する相手の記録にだけ。自分の記録には送れない）
create or replace function public.mq_set_cheers(p_token_hash text, p_cheers jsonb)
returns integer language plpgsql security definer set search_path = public
as $f$
declare v_id uuid; n integer;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then raise exception 'unknown player'; end if;
  delete from mq_cheers where from_player = v_id;
  insert into mq_cheers (from_player, to_player, activity_id, kind)
  select distinct v_id, a.player_id, a.id, c->>'kind'
  from jsonb_array_elements(p_cheers) c
  join mq_activities a on a.player_id::text = c->>'toPlayer' and a.id = c->>'activityId'
  where a.player_id <> v_id and c->>'kind' in ('💪', '🔥', '👏');
  get diagnostics n = row_count;
  return n;
end $f$;

-- 自分が申し込んだ対決を登録する（今日の前後1日に始まるものだけ。同じ相手と期間が重なる対決や、同時に4つ目は受け付けない）
create or replace function public.mq_add_battles(p_token_hash text, p_battles jsonb)
returns integer language plpgsql security definer set search_path = public
as $f$
declare v_id uuid; b jsonb; v_opp uuid; v_start date; n integer := 0;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then raise exception 'unknown player'; end if;
  for b in select * from jsonb_array_elements(p_battles) loop
    begin
      v_opp := (b->>'opponent')::uuid;
      v_start := (b->>'start')::date;
    exception when others then continue;
    end;
    if v_opp = v_id or v_start not between current_date - 1 and current_date + 1 then continue; end if;
    if not exists (select 1 from mq_activities where player_id = v_opp) then continue; end if;
    if exists (select 1 from mq_battles where challenger = v_id and opponent = v_opp and start_date = v_start) then continue; end if;
    if exists (select 1 from mq_battles x where ((x.challenger = v_id and x.opponent = v_opp) or (x.challenger = v_opp and x.opponent = v_id))
               and x.end_date >= v_start and x.start_date <= v_start + 6) then continue; end if;
    if (select count(*) from mq_battles where (challenger = v_id or opponent = v_id) and end_date >= current_date - 1) >= 3 then continue; end if;
    insert into mq_battles (challenger, opponent, start_date, end_date) values (v_id, v_opp, v_start, v_start + 6);
    n := n + 1;
  end loop;
  return n;
end $f$;

-- 自分あての受け取り：自分の記録に届いた応援と、自分が関わる対決
create or replace function public.mq_inbox(p_token_hash text, p_since date)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
declare v_id uuid;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then return null; end if;
  return jsonb_build_object(
    'playerId', v_id,
    'cheers', coalesce((select jsonb_agg(jsonb_build_object('activityId', c.activity_id, 'from', c.from_player, 'kind', c.kind))
                        from mq_cheers c where c.to_player = v_id), '[]'),
    'battles', coalesce((select jsonb_agg(jsonb_build_object('challenger', b.challenger, 'opponent', b.opponent, 'start', b.start_date, 'end', b.end_date))
                         from mq_battles b where (b.challenger = v_id or b.opponent = v_id) and b.end_date >= p_since), '[]'));
end $f$;

-- ほかの人どうしの応援も見えるように：記録ごとの応援（直近の分）
create or replace function public.mq_cheers_since(p_since date)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
begin
  return coalesce((select jsonb_agg(jsonb_build_object('to', c.to_player, 'activityId', c.activity_id, 'from', c.from_player, 'kind', c.kind))
    from mq_cheers c join mq_activities a on a.player_id = c.to_player and a.id = c.activity_id
    where a.date >= p_since), '[]');
end $f$;

revoke all on function public.mq_set_cheers(text, jsonb) from public, anon, authenticated;
revoke all on function public.mq_add_battles(text, jsonb) from public, anon, authenticated;
revoke all on function public.mq_inbox(text, date) from public, anon, authenticated;
revoke all on function public.mq_cheers_since(date) from public, anon, authenticated;
grant execute on function public.mq_set_cheers(text, jsonb) to service_role;
grant execute on function public.mq_add_battles(text, jsonb) to service_role;
grant execute on function public.mq_inbox(text, date) to service_role;
grant execute on function public.mq_cheers_since(date) to service_role;
