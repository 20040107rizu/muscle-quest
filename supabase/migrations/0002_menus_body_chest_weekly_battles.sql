-- 筋トレメニュー・体重記録・週替わりボス・友達との対決
--
-- 方針
--  * 体の写真はサーバーに送らない（端末の中だけ）。サーバーには体重だけを本人専用で置く。
--  * 毎日の宝箱は xp_events の (source_type='bonus', source_id='chest:日付') で1日1回に制限。
--    中身はサーバー（Edge Function）が決めて書き込む。
--  * 週替わりボスの討伐と対決の勝敗は、xp_events からサーバーで計算する（クライアントの値は使わない）。

create table public.workout_menus (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  exercise_ids text[] not null check (cardinality(exercise_ids) between 1 and 12),
  created_at timestamptz not null default now()
);

create table public.body_logs (
  user_id uuid not null references public.profiles on delete cascade,
  date date not null,
  weight_kg numeric(5,1) check (weight_kg between 30 and 250),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.weekly_boss_clears (
  user_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  boss_id text not null,
  cleared_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create table public.battles (
  id uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references public.profiles on delete cascade,
  opponent_id uuid not null references public.profiles on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  check (challenger_id <> opponent_id),
  check (end_date = start_date + 6),
  unique (challenger_id, opponent_id, start_date)
);

alter table public.workout_menus enable row level security;
alter table public.body_logs enable row level security;
alter table public.weekly_boss_clears enable row level security;
alter table public.battles enable row level security;

create policy "menus own" on public.workout_menus for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 体重は本人だけ
create policy "body own" on public.body_logs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 討伐記録は Edge Function だけが書き込む。読み取りは本人と友達
create policy "weekly read" on public.weekly_boss_clears for select to authenticated
  using (user_id = auth.uid() or public.is_friend(auth.uid(), user_id));

-- 対決は友達にだけ申し込める。当事者だけが見られる
create policy "battles read" on public.battles for select to authenticated
  using (auth.uid() in (challenger_id, opponent_id));
create policy "battles insert" on public.battles for insert to authenticated
  with check (challenger_id = auth.uid() and public.is_friend(auth.uid(), opponent_id) and start_date = current_date);
