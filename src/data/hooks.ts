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
import { OnlineRepository } from "./online/onlineRepository";
import type { PlayerSnapshot, Repository, Social } from "./repository";

let _repo: Repository | null = null;
/**
 * 実装の差し替えポイント。
 * 通常はオンライン版（記録を端末に保存しつつサーバーへ送る）。claude.ai 上のプレビュー版は端末だけで動く。
 */
export const ONLINE = process.env.NEXT_PUBLIC_MQ_OFFLINE !== "1";
export function getRepo(): Repository {
  if (!_repo) _repo = ONLINE ? new OnlineRepository() : new LocalRepository();
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
  user: { id: string; name: string; avatar?: string };
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
    user: { id: p.id, name: p.name, avatar: p.avatarUrl },
    activities: [...p.activities].sort((a, b) => b.createdAt - a.createdAt),
    character,
    metrics: computeMetrics(p.activities, today),
    titleId: p.titleId,
    aura: p.aura,
  };
}

// ---- ほかのプレイヤーと応援（画面どうしで共有。1分ごとに取り直す） ----
let socialCache: Social = { players: [], cheers: {} };
const socialListeners = new Set<(s: Social) => void>();
let socialTimer: ReturnType<typeof setInterval> | null = null;

export function refreshSocial() {
  getRepo()
    .listSocial()
    // 記録が1件もない人は出さない（開いただけの人で友達が増えないように）
    .then((s) => {
      socialCache = { ...s, players: s.players.filter((p) => p.activities.length > 0) };
      socialListeners.forEach((f) => f(socialCache));
    })
    .catch(() => {});
}

function useSocial(): Social {
  const [social, setSocial] = useState(socialCache);
  useEffect(() => {
    socialListeners.add(setSocial);
    if (!socialTimer) {
      refreshSocial();
      socialTimer = setInterval(refreshSocial, 60000);
    }
    return () => {
      socialListeners.delete(setSocial);
      if (!socialListeners.size && socialTimer) {
        clearInterval(socialTimer);
        socialTimer = null;
      }
    };
  }, []);
  return social;
}

export function usePlayers(): PlayerSnapshot[] {
  return useSocial().players;
}

/** 記録ごとに届いた応援（自分が送った分は除く。名前つき） */
export function useCheers(): (activityId: string) => { name: string; kind: string }[] {
  const { cheers, players, meId } = useSocial();
  return useMemo(() => {
    const names = new Map(players.map((p) => [p.id, p.name]));
    return (id: string) => (cheers[id] ?? []).filter((c) => c.from !== meId).map((c) => ({ name: names.get(c.from) ?? "だれか", kind: c.kind }));
  }, [cheers, players, meId]);
}

/** 友達（＝ほかのプレイヤー全員）の表示用データ */
export function useFriends(now: number): FriendView[] {
  const players = usePlayers();
  return useMemo(() => players.map((p) => buildFriendView(p, now)), [players, now]);
}
