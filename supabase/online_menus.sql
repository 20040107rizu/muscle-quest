-- MUSCLE QUEST オンライン版：友達のページで、その人の筋トレメニューを見られるように（online_quest.sql のあとに実行）

alter table public.mq_players add column if not exists menus jsonb not null default '[]';

create or replace function public.mq_set_menus(p_token_hash text, p_menus jsonb)
returns void language plpgsql security definer set search_path = public
as $f$
begin
  if jsonb_typeof(p_menus) <> 'array' or length(p_menus::text) > 20000 then raise exception 'bad menus'; end if;
  update mq_players set menus = p_menus where token_hash = p_token_hash;
end $f$;

create or replace function public.mq_players_since(p_since date)
returns jsonb language plpgsql stable security definer set search_path = public
as $f$
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'titleId', p.title_id, 'aura', p.aura,
      'avatarAt', (select v.updated_at from mq_avatars v where v.player_id = p.id),
      'clears', p.clears,
      'menus', p.menus,
      'activities', (select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'type', a.type, 'date', a.date,
        'createdAt', a.created_at, 'xp', a.xp, 'byStat', a.by_stat, 'detail', a.detail) order by a.created_at desc), '[]')
        from mq_activities a where a.player_id = p.id and a.date >= p_since)))
    from mq_players p
    where exists (select 1 from mq_activities x where x.player_id = p.id)
  ), '[]');
end $f$;

revoke all on function public.mq_set_menus(text, jsonb) from public, anon, authenticated;
revoke all on function public.mq_players_since(date) from public, anon, authenticated;
grant execute on function public.mq_set_menus(text, jsonb) to service_role;
grant execute on function public.mq_players_since(date) to service_role;
