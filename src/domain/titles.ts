import DEFS from "./titleDefs.json";
import { isCritical } from "./bonus";
import { isAssist } from "./exercises";
import { parseDateKey, startOfWeek } from "./dates";
import { MUSCLE_GROUPS, type Activity, type StatKey } from "./types";
import { bestE1RM, volumeOf } from "./xp";

/**
 * 称号150種（画像生成AIが作った一覧 src/domain/titleDefs.json）と、その入手判定。
 * 判定に使う数値はすべて記録から計算する（画面から渡された値は使わない）。
 * 取り込み: scripts/assets/import_titles.py
 */
export type TitleRarity = "N" | "R" | "SR" | "SSR" | "UR";
export type TitleTheme = "strength" | "run" | "habit" | "dungeon" | "social";

export interface TitleDef {
  id: string;
  name: string;
  rarity: TitleRarity;
  condition: string;
  value: number;
  howToGet: string;
  flavor: string;
  theme: TitleTheme;
  /** public/titles/plates/{plate}.webp */
  plate: string;
  /** public/titles/effects/{effect}.webp */
  effect: string;
}

export const TITLE_DEFS = DEFS as TitleDef[];

export const TITLE_RARITY_ORDER: TitleRarity[] = ["N", "R", "SR", "SSR", "UR"];

export const THEME_LABELS: Record<TitleTheme, string> = {
  strength: "筋トレ",
  run: "ランニング",
  habit: "継続",
  dungeon: "ダンジョン",
  social: "仲間",
};

/** 称号の判定に使う数値 */
export interface TitleStats {
  level: number;
  stats: Record<StatKey, number>;
  activeDays: number;
  longestStreak: number;
  totalSets: number;
  totalRunKm: number;
  longestRunKm: number;
  /** 1km以上のランの最速ペース（秒/km）。記録なしは Infinity */
  bestPaceS: number;
  totalVolume: number;
  e1rm: Record<string, number>;
  /** 一番稼いだ週の経験値 */
  bestWeekXp: number;
  earlyWorkouts: number;
  nightWorkouts: number;
  weekendDays: number;
  crits: number;
  newRecords: number;
  /** 倒したボスの数（ダンジョンの各階＋週替わりボス） */
  bosses: number;
  dungeons: number;
  friends: number;
  cheers: number;
}

/** 記録から称号の判定用の数値を計算する */
export function buildTitleStats(input: {
  activities: Activity[];
  level: number;
  stats: Record<StatKey, number>;
  activeDays: number;
  longestStreak: number;
  totalSets: number;
  totalRunKm: number;
  longestRunKm: number;
  e1rm: Record<string, number>;
  clearedFloors: number;
  clearedDungeons: number;
  weeklyBosses: number;
  friends: number;
  cheers: number;
}): TitleStats {
  const acts = [...input.activities].sort((a, b) => a.createdAt - b.createdAt);
  let bestPaceS = Infinity;
  let totalVolume = 0;
  let early = 0;
  let night = 0;
  let crits = 0;
  let newRecords = 0;
  const weekendDays = new Set<string>();
  const weekXp = new Map<string, number>();
  const bestByEx = new Map<string, number>();
  let longest = -1;
  for (const a of acts) {
    const h = new Date(a.createdAt).getHours();
    if (h >= 5 && h <= 7) early++;
    if (h >= 22) night++;
    const dow = parseDateKey(a.date).getDay();
    if (dow === 0 || dow === 6) weekendDays.add(a.date);
    const wk = startOfWeek(a.date);
    weekXp.set(wk, (weekXp.get(wk) ?? 0) + a.xp);
    if (a.xp > 0 && isCritical(a.id)) crits++;
    if (a.workout) {
      totalVolume += volumeOf(a.workout.sets);
      const id = a.workout.exerciseId;
      const e1 = bestE1RM(a.workout.sets);
      const prev = bestByEx.get(id);
      if (prev != null && !isAssist(id) && e1 > prev) newRecords++;
      bestByEx.set(id, Math.max(prev ?? 0, e1));
    }
    if (a.run) {
      if (a.run.distanceKm >= 1) bestPaceS = Math.min(bestPaceS, a.run.durationS / a.run.distanceKm);
      if (longest >= 0 && a.run.distanceKm > longest) newRecords++;
      longest = Math.max(longest, a.run.distanceKm);
    }
  }
  return {
    level: input.level,
    stats: input.stats,
    activeDays: input.activeDays,
    longestStreak: input.longestStreak,
    totalSets: input.totalSets,
    totalRunKm: input.totalRunKm,
    longestRunKm: input.longestRunKm,
    bestPaceS,
    totalVolume,
    e1rm: input.e1rm,
    bestWeekXp: Math.max(0, ...weekXp.values()),
    earlyWorkouts: early,
    nightWorkouts: night,
    weekendDays: weekendDays.size,
    crits,
    newRecords,
    bosses: input.clearedFloors + input.weeklyBosses,
    dungeons: input.clearedDungeons,
    friends: input.friends,
    cheers: input.cheers,
  };
}

/** 今の値と目標（ペースは小さいほど良いので「達成済みか」だけ見る） */
export function titleProgress(d: TitleDef, s: TitleStats): { current: number; target: number; done: boolean; unit: string } {
  const p = (current: number, unit = "") => ({ current, target: d.value, done: current >= d.value, unit });
  const c = d.condition;
  if (c.startsWith("stat_")) return p(Math.floor(s.stats[c.slice(5) as StatKey] ?? 0));
  if (c.startsWith("e1rm_")) {
    const ex = { bench: "bench_press", squat: "squat", deadlift: "deadlift" }[c.slice(5)] ?? c.slice(5);
    return p(Math.floor(s.e1rm[ex] ?? 0), "kg");
  }
  switch (c) {
    case "level":
      return p(s.level);
    case "all_muscles":
      return p(Math.floor(Math.min(...MUSCLE_GROUPS.map((g) => s.stats[g] ?? 0))));
    case "active_days":
      return p(s.activeDays, "日");
    case "streak":
      return p(s.longestStreak, "日");
    case "total_sets":
      return p(s.totalSets, "セット");
    case "total_run_km":
      return p(Math.floor(s.totalRunKm * 10) / 10, "km");
    case "longest_run_km":
      return p(s.longestRunKm, "km");
    case "best_pace":
      return { current: isFinite(s.bestPaceS) ? Math.round(s.bestPaceS) : 0, target: d.value, done: s.bestPaceS <= d.value, unit: "秒/km" };
    case "total_volume":
      return p(Math.round(s.totalVolume), "kg");
    case "week_xp":
      return p(s.bestWeekXp);
    case "early_workouts":
      return p(s.earlyWorkouts, "回");
    case "night_workouts":
      return p(s.nightWorkouts, "回");
    case "weekend_days":
      return p(s.weekendDays, "日");
    case "crits":
      return p(s.crits, "回");
    case "new_records":
      return p(s.newRecords, "回");
    case "bosses":
      return p(s.bosses, "体");
    case "dungeons":
      return p(s.dungeons);
    case "friends":
      return p(s.friends, "人");
    case "cheers":
      return p(s.cheers, "回");
    default:
      return { current: 0, target: d.value, done: false, unit: "" };
  }
}

export function unlockedTitleIds(s: TitleStats): string[] {
  return TITLE_DEFS.filter((d) => titleProgress(d, s).done).map((d) => d.id);
}

