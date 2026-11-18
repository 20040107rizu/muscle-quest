"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { buildCharacter, type CharacterState } from "@/domain/character";
import { toDateKey } from "@/domain/dates";
import { computeMetrics, type UserMetrics } from "@/domain/ranking";
import type { Activity, XpBreakdown } from "@/domain/types";
import { buildQuestStats, DUNGEONS, ownedRewards, simulateClears, TITLES } from "@/domain/quests";
import { ITEMS } from "@/domain/items";
import { addDays } from "@/domain/dates";
import { DEMO_XP, demoDates, isDemo, setDemoAura, setDemoTitle, useDemo } from "./demo";
import { sumStats } from "@/domain/xp";
import { bonusXpByDate, toActivities } from "./activities";
import { LocalRepository } from "./local/localRepository";
import { findMockUser, mockActivities, mockLegacyXp, type MockUser } from "./mock/friends";
import type { Repository } from "./repository";

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

/** 称号をつける（見本モード中は見本の中だけで切り替える） */
export async function wearTitle(titleId: string | null) {
  if (isDemo()) return setDemoTitle(titleId);
  await getRepo().setTitle(titleId);
}
/** オーラをまとう（見本モード中は見本の中だけで切り替える） */
export async function wearAura(auraId: string | null) {
  if (isDemo()) return setDemoAura(auraId);
  await getRepo().setAura(auraId);
}

export function useMyData() {
  const now = useNow();
  const demo = useDemo();
  useEffect(() => {
    getRepo().init();
  }, []);
  const raw = useLiveQuery(async () => {
    const repo = getRepo();
    const profile = await repo.getProfile();
    if (!profile) return undefined;
    const [workouts, runs, xpEvents, customExercises, friendIds, reactions, questClears, questAttempts] = await Promise.all([
      repo.listWorkouts(),
      repo.listRuns(),
      repo.listXpEvents(),
      repo.listCustomExercises(),
      repo.listFriendIds(),
      repo.listMyReactions(),
      repo.listQuestClears(),
      repo.listQuestAttempts(),
    ]);
    return { profile, workouts, runs, xpEvents, customExercises, friendIds, reactions, questClears, questAttempts };
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
    const owned = ownedRewards(cleared, questStats);
    if (demo.on) {
      // 見本モード: 記録はそのまま、レベル・称号・オーラ・ダンジョンを全部そろった状態で表示する
      const per = Math.round(DEMO_XP / 7);
      const byStat: XpBreakdown = { chest: per, back: per, shoulders: per, arms: per, legs: per, core: per, cardio: per };
      const demoChar = buildCharacter(
        [...raw.xpEvents, { total: DEMO_XP, byStat, date: addDays(today, -60) }],
        [...activities.map((a) => a.date), ...demoDates(today)],
        today,
      );
      const allCleared = new Set(DUNGEONS.flatMap((d) => d.floors.map((_, i) => `${d.id}:${i}`)));
      return {
        ...raw,
        profile: { ...raw.profile, titleId: demo.titleId, aura: demo.aura },
        activities,
        character: demoChar,
        metrics,
        questStats: buildQuestStats(activities, demoChar, today),
        cleared: allCleared,
        owned: { titles: TITLES.map((t) => t.id), items: ITEMS.map((i) => i.id) },
        lastHp,
        today,
        now,
      };
    }
    return { ...raw, activities, character, metrics, questStats, cleared, owned, lastHp, today, now };
  }, [raw, now, demo]);
}

export interface FriendView {
  user: MockUser;
  activities: Activity[];
  character: CharacterState;
  metrics: UserMetrics;
  /** 達成済みのダンジョン階・称号（モックでは条件を満たした分を自動クリア扱い） */
  cleared: Set<string>;
  titleId?: string;
  aura?: string;
}

export function buildFriendView(user: MockUser, now: number): FriendView {
  const today = toDateKey(now);
  const activities = mockActivities(user, now);
  const events: { total: number; byStat: XpBreakdown; date: string }[] = activities.map((a) => ({ total: a.xp, byStat: a.byStat, date: a.date }));
  // アプリ導入前の経験値（古参ユーザー）を直近の部位バランスで配分
  const legacy = mockLegacyXp(user);
  if (legacy > 0) {
    const s = sumStats(events.map((e) => e.byStat));
    const sum = Object.values(s).reduce((a, b) => a + b, 0) || 1;
    const byStat: XpBreakdown = {};
    for (const [k, v] of Object.entries(s)) byStat[k as keyof XpBreakdown] = Math.round((v / sum) * legacy);
    events.push({ total: legacy, byStat, date: "2000-01-01" });
  }
  const character = buildCharacter(events, activities.map((a) => a.date), today);
  const cleared = simulateClears(buildQuestStats(activities, character, today));
  const owned = ownedRewards(cleared, buildQuestStats(activities, character, today));
  // 一番最後に得た称号・オーラをまとう
  return {
    user,
    activities,
    character,
    metrics: computeMetrics(activities, today),
    cleared,
    titleId: owned.titles[owned.titles.length - 1],
    aura: owned.items[owned.items.length - 1],
  };
}

export function useFriends(friendIds: string[] | undefined, now: number): FriendView[] {
  return useMemo(() => {
    if (!friendIds) return [];
    return friendIds
      .map((id) => findMockUser(id))
      .filter((u): u is MockUser => !!u)
      .map((u) => buildFriendView(u, now));
  }, [friendIds, now]);
}
