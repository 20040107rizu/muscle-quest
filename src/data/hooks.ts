"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { buildCharacter, type CharacterState } from "@/domain/character";
import { toDateKey } from "@/domain/dates";
import { computeMetrics, type UserMetrics } from "@/domain/ranking";
import type { Activity, XpBreakdown } from "@/domain/types";
import { buildQuestStats, DUNGEONS, findTitle, ownedRewards, simulateClears, titleStatsFrom, TITLES } from "@/domain/quests";
import { TITLE_RARITY_ORDER } from "@/domain/titles";
import { ITEMS } from "@/domain/items";
import { addDays } from "@/domain/dates";
import { sumStats } from "@/domain/xp";
import { bonusXpByDate, toActivities } from "./activities";
import { LocalRepository } from "./local/localRepository";
import type { PlayerSnapshot, Repository } from "./repository";

let _repo: Repository | null = null;
/** 実装の差し替えポイント。Supabase 導入時はここで切り替える */
export function getRepo(): Repository {
  if (!_repo) _repo = new LocalRepository();
  return _repo;
}

/** 1分ごとに更新される現在時刻（「◯分前」表示や日付またぎ用） */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/** 称号をつける */
export async function wearTitle(titleId: string | null) {
  await getRepo().setTitle(titleId);
}
/** オーラをまとう */
export async function wearAura(auraId: string | null) {
  await getRepo().setAura(auraId);
}

export function useMyData() {
  const now = useNow();
  const players = usePlayers();
  useEffect(() => {
    getRepo().init();
  }, []);
  const raw = useLiveQuery(async () => {
    const repo = getRepo();
    const profile = await repo.getProfile();
    if (!profile) return undefined;
    const [workouts, runs, xpEvents, customExercises, reactions, questClears, questAttempts, menus, bodyLogs, battles, weeklyClears] = await Promise.all([
      repo.listWorkouts(),
      repo.listRuns(),
      repo.listXpEvents(),
      repo.listCustomExercises(),
      repo.listMyReactions(),
      repo.listQuestClears(),
      repo.listQuestAttempts(),
      repo.listMenus(),
      repo.listBodyLogs(),
      repo.listBattles(),
      repo.listWeeklyClears(),
    ]);
    return { profile, workouts, runs, xpEvents, customExercises, reactions, questClears, questAttempts, menus, bodyLogs, battles, weeklyClears };
  }, []);

  return useMemo(() => {
    if (!raw) return undefined;
    const today = toDateKey(now);
    const activities = toActivities(raw.workouts, raw.runs, raw.xpEvents);
    const character = buildCharacter(raw.xpEvents, activities.map((a) => a.date), today);
    const metrics = computeMetrics(activities, today, bonusXpByDate(raw.xpEvents));
    const questStats = buildQuestStats(activities, character, today);
    const cleared = new Set(raw.questClears.map((c) => c.id));
    /** ボスID → 最後に戦ったときの残りHP（未挑戦のボスは含まない） */
    const lastHp = new Map(raw.questAttempts.map((a) => [a.id, a.remaining]));
    const titleStats = titleStatsFrom({ activities, questStats, cleared, weeklyBosses: raw.weeklyClears.length, friends: players.length, cheers: raw.reactions.length });
    const owned = ownedRewards(cleared, questStats, raw.weeklyClears.map((c) => c.bossId), titleStats);
    return { ...raw, activities, character, metrics, questStats, cleared, owned, lastHp, titleStats, today, now };
  }, [raw, now, players.length]);
}

/** ほかのプレイヤー（筋トレかランを1回以上記録した人だけ。全員がお互いに友達として表示される） */
export interface FriendView {
  user: { id: string; name: string };
  activities: Activity[];
  character: CharacterState;
  metrics: UserMetrics;
  titleId?: string;
  aura?: string;
}

export function buildFriendView(p: PlayerSnapshot, now: number): FriendView {
  const today = toDateKey(now);
  const character = buildCharacter(
    p.activities.map((a) => ({ total: a.xp, byStat: a.byStat, date: a.date })),
    p.activities.map((a) => a.date),
    today,
  );
  return {
    user: { id: p.id, name: p.name },
    activities: [...p.activities].sort((a, b) => b.createdAt - a.createdAt),
    character,
    metrics: computeMetrics(p.activities, today),
    titleId: p.titleId,
    aura: p.aura,
  };
}

// ---- ほかのプレイヤー（画面どうしで共有。1分ごとに取り直す） ----
let playersCache: PlayerSnapshot[] = [];
const playerListeners = new Set<(p: PlayerSnapshot[]) => void>();
let playerTimer: ReturnType<typeof setInterval> | null = null;

function loadPlayers() {
  getRepo()
    .listPlayers()
    // 記録が1件もない人は出さない（開いただけの人で友達が増えないように）
    .then((ps) => {
      playersCache = ps.filter((p) => p.activities.length > 0);
      playerListeners.forEach((f) => f(playersCache));
    })
    .catch(() => {});
}

export function usePlayers(): PlayerSnapshot[] {
  const [players, setPlayers] = useState(playersCache);
  useEffect(() => {
    playerListeners.add(setPlayers);
    if (!playerTimer) {
      loadPlayers();
      playerTimer = setInterval(loadPlayers, 60000);
    }
    return () => {
      playerListeners.delete(setPlayers);
      if (!playerListeners.size && playerTimer) {
        clearInterval(playerTimer);
        playerTimer = null;
      }
    };
  }, []);
  return players;
}

/** 友達（＝ほかのプレイヤー全員）の表示用データ */
export function useFriends(now: number): FriendView[] {
  const players = usePlayers();
  return useMemo(() => players.map((p) => buildFriendView(p, now)), [players, now]);
}
