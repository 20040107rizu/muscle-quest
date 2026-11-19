-- MUSCLE QUEST オンライン版のデータベース（Supabase の「SQL Editor」にこのファイルを丸ごと貼って「Run」）
--
-- しくみ
--  * ブラウザはデータベースに直接さわれない（RLS を有効にして、許可を1つも出さない）。
--    読み書きはすべてアプリのサーバー（Vercel の /api/*）が、秘密の鍵（service_role）で行う。
--  * プレイヤーは端末ごとの合言葉（トークン）で見分ける。データベースには合言葉そのものではなく、
--    ハッシュ（元に戻せない値）だけを保存する。
--  * 経験値はサーバーが記録から計算し直して保存する（ブラウザから送られた経験値は使わない）。
--  * 体重・体の写真・メニューは送らない。ここにあるのは名前・称号・オーラ・筋トレとランの記録だけ。
-- 何度実行しても壊れないように書いてある。

create table if not exists public.mq_players (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  name text not null check (char_length(name) between 1 and 20),
  title_id text check (title_id is null or char_length(title_id) <= 40),
  aura text check (aura is null or char_length(aura) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mq_activities (
  player_id uuid not null references public.mq_players on delete cascade,
  id text not null check (char_length(id) <= 80),
  type text not null check (type in ('workout', 'run')),
  date date not null,
  created_at bigint not null,
  xp integer not null check (xp >= 0 and xp <= 5000),
  by_stat jsonb not null default '{}',
  detail jsonb not null,
  -- サーバーが初めて受け取った時刻。記録の日付はこの時刻から7日前までしか認めない（過去の捏造を防ぐ）
  received_at bigint not null,
  primary key (player_id, id)
);
alter table public.mq_activities add column if not exists received_at bigint not null default 0;
create index if not exists mq_activities_date on public.mq_activities (date);

alter table public.mq_players enable row level security;
alter table public.mq_activities enable row level security;
-- 許可（policy）は作らない → ブラウザ（anon / authenticated）からは読めず、書けない
revoke all on public.mq_players, public.mq_activities from anon, authenticated;

-- 新しいプレイヤーを登録して ID を返す
create or replace function public.mq_register(p_token_hash text, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into mq_players (token_hash, name) values (p_token_hash, p_name)
  on conflict (token_hash) do update set updated_at = now()
  returning id into v_id;
  return v_id;
end $$;

-- プレイヤーの公開情報と記録をまるごと置き換える（サーバーが計算し直した記録だけが来る）
create or replace function public.mq_sync(p_token_hash text, p_name text, p_title text, p_aura text, p_acts jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then raise exception 'unknown player'; end if;
  update mq_players set name = p_name, title_id = p_title, aura = p_aura, updated_at = now() where id = v_id;
  delete from mq_activities where player_id = v_id;
  insert into mq_activities (player_id, id, type, date, created_at, xp, by_stat, detail, received_at)
  select v_id, a->>'id', a->>'type', (a->>'date')::date, (a->>'createdAt')::bigint, (a->>'xp')::int,
         coalesce(a->'byStat', '{}'::jsonb), a->'detail', (a->>'receivedAt')::bigint
  from jsonb_array_elements(p_acts) a;
  return v_id;
end $$;

-- そのプレイヤーの記録を、サーバーが初めて受け取った時刻つきで返す（無ければ null）
create or replace function public.mq_received(p_token_hash text)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when p.id is null then null else coalesce(
    (select jsonb_object_agg(a.id, a.received_at) from mq_activities a where a.player_id = p.id), '{}'::jsonb) end
  from (select (select id from mq_players where token_hash = p_token_hash) as id) p;
$$;

-- 筋トレかランを1回以上記録したプレイヤー全員と、直近の記録（全員がお互いの友達として表示される）
create or replace function public.mq_players_since(p_since date)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'titleId', p.title_id, 'aura', p.aura,
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'type', a.type, 'date', a.date, 'createdAt', a.created_at,
                                          'xp', a.xp, 'byStat', a.by_stat, 'detail', a.detail) order by a.created_at desc)
      from mq_activities a where a.player_id = p.id and a.date >= p_since), '[]'::jsonb)
  )), '[]'::jsonb)
  from mq_players p
  where exists (select 1 from mq_activities a where a.player_id = p.id);
$$;

revoke all on function public.mq_register(text, text) from public, anon, authenticated;
revoke all on function public.mq_sync(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.mq_players_since(date) from public, anon, authenticated;
revoke all on function public.mq_received(text) from public, anon, authenticated;
grant execute on function public.mq_received(text) to service_role;
grant execute on function public.mq_register(text, text) to service_role;
grant execute on function public.mq_sync(text, text, text, text, jsonb) to service_role;
grant execute on function public.mq_players_since(date) to service_role;
