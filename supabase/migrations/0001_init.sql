-- MUSCLE QUEST 初期スキーマ（Supabase / Postgres）
-- MVP では端末内 IndexedDB (src/data/local) を使用。オンライン化時にこのスキーマを適用し、
-- src/data/supabase に Repository 実装を追加して getRepo() を差し替える。
--
-- 方針
--  * 記録テーブルは本人のみ書き込み可。読み取りは本人 + 承認済みの友達のみ（RLS）。
--  * 経験値台帳 xp_events はクライアントから書き込めない。Edge Function（service role）が
--    src/domain/xp.ts と同じロジックで計算して書き込む → 水増し・改ざん防止。
--  * 記録IDはクライアント発行UUID。主キー制約で二重送信を防ぐ。
--  * xp_events は (source_type, source_id) が一意 → 同じ記録に二重で経験値が付かない。

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 20),
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

-- 体重など他人に見せない情報は分離
create table public.private_profiles (
  user_id uuid primary key references public.profiles on delete cascade,
  bodyweight_kg numeric(5,1) not null default 65 check (bodyweight_kg between 30 and 250)
);

create table public.exercises (
  id text primary key,
  owner_id uuid references public.profiles on delete cascade, -- null = 公式プリセット
  name text not null check (char_length(name) between 1 and 30),
  distribution jsonb not null,           -- {"chest":0.7,"shoulders":0.15,...}
  bodyweight boolean not null default false,
  max_weight_kg numeric(6,1) not null default 500,
  step numeric(4,1) not null default 2.5
);

create table public.workout_entries (
  id uuid primary key,                    -- クライアント発行
  user_id uuid not null references public.profiles on delete cascade,
  exercise_id text not null references public.exercises,
  date date not null,
  created_at timestamptz not null default now(),
  check (date <= current_date and date >= current_date - 7)
);

create table public.workout_sets (
  entry_id uuid not null references public.workout_entries on delete cascade,
  set_no smallint not null check (set_no between 1 and 20),
  weight_kg numeric(6,1) not null check (weight_kg between 0 and 600),
  reps smallint not null check (reps between 1 and 100),
  primary key (entry_id, set_no)
);

create table public.runs (
  id uuid primary key,
  user_id uuid not null references public.profiles on delete cascade,
  date date not null,
  distance_km numeric(6,2) not null check (distance_km between 0.1 and 100),
  duration_s integer not null check (duration_s between 60 and 86400),
  created_at timestamptz not null default now(),
  check (duration_s / distance_km >= 150),  -- 2'30"/km より速い記録は拒否
  check (date <= current_date and date >= current_date - 7)
);

create table public.xp_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  source_type text not null check (source_type in ('workout','run','mission')),
  source_id text not null,
  date date not null,
  total integer not null check (total >= 0),
  by_stat jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);
create index on public.xp_events (user_id, date);

create table public.friendships (
  user_id uuid not null references public.profiles on delete cascade,
  friend_id uuid not null references public.profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.reactions (
  user_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('workout','run')),
  target_id uuid not null,
  kind text not null check (kind in ('💪','🔥','👏')),
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id, kind)
);

-- 将来: チーム機能
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now()
);
create table public.team_members (
  team_id uuid not null references public.teams on delete cascade,
  user_id uuid not null references public.profiles on delete cascade,
  primary key (team_id, user_id)
);

-- ===== 友達判定 =====
create or replace function public.is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
    where status = 'accepted'
      and ((user_id = a and friend_id = b) or (user_id = b and friend_id = a))
  );
$$;

-- ===== RLS =====
alter table public.profiles enable row level security;
alter table public.private_profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_entries enable row level security;
alter table public.workout_sets enable row level security;
alter table public.runs enable row level security;
alter table public.xp_events enable row level security;
alter table public.friendships enable row level security;
alter table public.reactions enable row level security;

-- プロフィール（名前・フレンドコード）は検索のためログインユーザーに公開
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

create policy "private own" on public.private_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "exercises read" on public.exercises for select to authenticated
  using (owner_id is null or owner_id = auth.uid());
create policy "exercises insert own" on public.exercises for insert to authenticated
  with check (owner_id = auth.uid());

-- 記録: 本人 + 友達が閲覧。書き込み・削除は本人のみ
create policy "entries read" on public.workout_entries for select to authenticated
  using (user_id = auth.uid() or public.is_friend(auth.uid(), user_id));
create policy "entries write" on public.workout_entries for insert to authenticated with check (user_id = auth.uid());
create policy "entries delete" on public.workout_entries for delete to authenticated using (user_id = auth.uid());

create policy "sets read" on public.workout_sets for select to authenticated
  using (exists (select 1 from workout_entries e where e.id = entry_id and (e.user_id = auth.uid() or public.is_friend(auth.uid(), e.user_id))));
create policy "sets write" on public.workout_sets for insert to authenticated
  with check (exists (select 1 from workout_entries e where e.id = entry_id and e.user_id = auth.uid()));

create policy "runs read" on public.runs for select to authenticated
  using (user_id = auth.uid() or public.is_friend(auth.uid(), user_id));
create policy "runs write" on public.runs for insert to authenticated with check (user_id = auth.uid());
create policy "runs delete" on public.runs for delete to authenticated using (user_id = auth.uid());

-- 経験値台帳は閲覧のみ（書き込みは service role の Edge Function だけ）
create policy "xp read" on public.xp_events for select to authenticated
  using (user_id = auth.uid() or public.is_friend(auth.uid(), user_id));

create policy "friendships read" on public.friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy "friendships request" on public.friendships for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "friendships accept" on public.friendships for update to authenticated
  using (friend_id = auth.uid()) with check (status = 'accepted');
create policy "friendships delete" on public.friendships for delete to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());

create policy "reactions read" on public.reactions for select to authenticated using (true);
create policy "reactions own" on public.reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 記録削除時は経験値も取り消す
create or replace function public.delete_xp_for_source() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from xp_events where source_type = TG_ARGV[0] and source_id = old.id::text;
  return old;
end $$;
create trigger workout_entries_delete_xp after delete on public.workout_entries
  for each row execute function public.delete_xp_for_source('workout');
create trigger runs_delete_xp after delete on public.runs
  for each row execute function public.delete_xp_for_source('run');

-- ランキング用の日次集計（友達で絞り込むのはクエリ側 / RLS）
create view public.daily_xp with (security_invoker = true) as
  select user_id, date, sum(total)::int as xp from public.xp_events group by user_id, date;
