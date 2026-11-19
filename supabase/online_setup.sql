-- MUSCLE QUEST オンライン版のデータベース（Supabase の「SQL Editor」で実行）
-- スマホから貼ると長い文が途中で切れることがあるので、3つに分けてある。①②③の順に1つずつ貼って「Run」。
-- しくみ: ブラウザはデータベースに直接さわれない（RLS を有効にして許可を出さない）。読み書きはアプリのサーバーだけが
-- 秘密の鍵で行う。端末の合言葉はハッシュだけを保存。経験値はサーバーが計算し直す。何度実行しても壊れない。

-- ① 記録をしまう棚
create table if not exists public.mq_players (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  name text not null check (char_length(name) between 1 and 20),
  title_id text,
  aura text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.mq_activities (
  player_id uuid not null references public.mq_players on delete cascade,
  id text not null,
  type text not null check (type in ('workout', 'run')),
  date date not null,
  created_at bigint not null,
  xp integer not null check (xp between 0 and 5000),
  by_stat jsonb not null default '{}',
  detail jsonb not null,
  received_at bigint not null default 0,
  primary key (player_id, id)
);
alter table public.mq_players enable row level security;
alter table public.mq_activities enable row level security;
revoke all on public.mq_players from anon, authenticated;
revoke all on public.mq_activities from anon, authenticated;

-- ② 登録と保存
create or replace function public.mq_register(p_token_hash text, p_name text)
returns uuid language plpgsql security definer set search_path = public
as $f$
declare v_id uuid;
begin
  insert into mq_players (token_hash, name) values (p_token_hash, p_name)
  on conflict (token_hash) do update set updated_at = now()
  returning id into v_id;
  return v_id;
end $f$;

create or replace function public.mq_sync(p_token_hash text, p_name text, p_title text, p_aura text, p_acts jsonb)
returns uuid language plpgsql security definer set search_path = public
as $f$
declare v_id uuid;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then raise exception 'unknown player'; end if;
  update mq_players set name = p_name, title_id = p_title, aura = p_aura, updated_at = now() where id = v_id;
  delete from mq_activities where player_id = v_id;
  insert into mq_activities (player_id, id, type, date, created_at, xp, by_stat, detail, received_at)
  select v_id, a->>'id', a->>'type', (a->>'date')::date, (a->>'createdAt')::bigint,
    (a->>'xp')::int, coalesce(a->'byStat', '{}'), a->'detail', (a->>'receivedAt')::bigint
  from jsonb_array_elements(p_acts) a;
  return v_id;
end $f$;

-- ③ 読み出しと、使える人の制限
create or replace function public.mq_received(p_token_hash text)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
declare v_id uuid;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then return null; end if;
  return coalesce((select jsonb_object_agg(id, received_at) from mq_activities where player_id = v_id), '{}');
end $f$;

create or replace function public.mq_players_since(p_since date)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'titleId', p.title_id, 'aura', p.aura,
      'activities', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'type', a.type, 'date', a.date,
        'createdAt', a.created_at, 'xp', a.xp, 'byStat', a.by_stat, 'detail', a.detail) order by a.created_at desc), '[]')
        from mq_activities a where a.player_id = p.id and a.date >= p_since)))
    from mq_players p
    where exists (select 1 from mq_activities x where x.player_id = p.id)
  ), '[]');
end $f$;

revoke all on function public.mq_register(text, text) from public, anon, authenticated;
revoke all on function public.mq_sync(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mq_received(text) from public, anon, authenticated;
revoke all on function public.mq_players_since(date) from public, anon, authenticated;
grant execute on function public.mq_register(text, text) to service_role;
grant execute on function public.mq_sync(text, text, text, text, jsonb) to service_role;
grant execute on function public.mq_received(text) to service_role;
grant execute on function public.mq_players_since(date) to service_role;
