"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { buildCharacter, type CharacterState } from "@/domain/character";
import { toDateKey } from "@/domain/dates";
import { computeMetrics, type UserMetrics } from "@/domain/ranking";
import type { Activity, XpBreakdown } from "@/domain/types";
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

export function useMyData() {
  const now = useNow();
  useEffect(() => {
    getRepo().init();
  }, []);
  const raw = useLiveQuery(async () => {
    const repo = getRepo();
    const profile = await repo.getProfile();
    if (!profile) return undefined;
    const [workouts, runs, xpEvents, customExercises, friendIds, reactions] = await Promise.all([
      repo.listWorkouts(),
      repo.listRuns(),
      repo.listXpEvents(),
      repo.listCustomExercises(),
      repo.listFriendIds(),
      repo.listMyReactions(),
    ]);
    return { profile, workouts, runs, xpEvents, customExercises, friendIds, reactions };
  }, []);

  return useMemo(() => {
    if (!raw) return undefined;
    const today = toDateKey(now);
    const activities = toActivities(raw.workouts, raw.runs, raw.xpEvents);
    const character = buildCharacter(raw.xpEvents, activities.map((a) => a.date), today);
    const metrics = computeMetrics(activities, today, bonusXpByDate(raw.xpEvents));
    return { ...raw, activities, character, metrics, today, now };
  }, [raw, now]);
}

export interface FriendView {
  user: MockUser;
  activities: Activity[];
  character: CharacterState;
  metrics: UserMetrics;
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
  return {
    user,
    activities,
    character: buildCharacter(events, activities.map((a) => a.date), today),
    metrics: computeMetrics(activities, today),
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
