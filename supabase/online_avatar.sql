-- MUSCLE QUEST オンライン版：プロフィール写真（online_setup.sql・online_social.sql のあとに実行）
-- 写真は小さく縮めたもの（JPEG）だけ。ブラウザからは直接さわれない。何度実行しても壊れない。

create table if not exists public.mq_avatars (
  player_id uuid primary key references public.mq_players on delete cascade,
  data text not null check (char_length(data) < 120000 and data like 'data:image/jpeg;base64,%'),
  updated_at bigint not null
);
alter table public.mq_avatars enable row level security;
revoke all on public.mq_avatars from anon, authenticated;

-- 写真を置き換える（null で外す）。中身が同じなら何もしない
create or replace function public.mq_set_avatar(p_token_hash text, p_data text)
returns void language plpgsql security definer set search_path = public
as $f$
declare v_id uuid;
begin
  select id into v_id from mq_players where token_hash = p_token_hash;
  if v_id is null then raise exception 'unknown player'; end if;
  if p_data is null then
    delete from mq_avatars where player_id = v_id;
  elsif not exists (select 1 from mq_avatars where player_id = v_id and data = p_data) then
    insert into mq_avatars (player_id, data, updated_at)
    values (v_id, p_data, (extract(epoch from now()) * 1000)::bigint)
    on conflict (player_id) do update set data = excluded.data, updated_at = excluded.updated_at;
  end if;
end $f$;

create or replace function public.mq_avatar(p_player uuid)
returns text language sql stable security definer set search_path = public
as $f$ select data from mq_avatars where player_id = p_player $f$;

-- プレイヤー一覧に写真の更新時刻（avatarAt）を足す
create or replace function public.mq_players_since(p_since date)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'titleId', p.title_id, 'aura', p.aura,
      'avatarAt', (select v.updated_at from mq_avatars v where v.player_id = p.id),
      'activities', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'type', a.type, 'date', a.date,
        'createdAt', a.created_at, 'xp', a.xp, 'byStat', a.by_stat, 'detail', a.detail) order by a.created_at desc), '[]')
        from mq_activities a where a.player_id = p.id and a.date >= p_since)))
    from mq_players p
    where exists (select 1 from mq_activities x where x.player_id = p.id)
  ), '[]');
end $f$;

revoke all on function public.mq_set_avatar(text, text) from public, anon, authenticated;
revoke all on function public.mq_avatar(uuid) from public, anon, authenticated;
revoke all on function public.mq_players_since(date) from public, anon, authenticated;
grant execute on function public.mq_set_avatar(text, text) to service_role;
grant execute on function public.mq_avatar(uuid) to service_role;
grant execute on function public.mq_players_since(date) to service_role;
