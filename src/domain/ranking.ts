import { addDays, startOfMonth, startOfWeek } from "./dates";
import { computeStreak } from "./character";
import { bestE1RM } from "./xp";
import type { Activity } from "./types";

export interface UserMetrics {
  todayXp: number;
  weekXp: number;
  monthXp: number;
  activeDays: number;
  monthRunKm: number;
  /** 筋トレ成長率(%)：直近30日の推定1RMベスト vs それ以前のベスト（種目平均） */
  growthPct: number;
  streak: number;
  workoutsThisWeek: number;
}

/**
 * ランキングの元になる指標。経験値は日次上限・逓減を通った後の値を使うため、
 * 同じ記録を連投しても順位を不正に上げられない。
 */
export function computeMetrics(activities: Activity[], today: string, bonusXpByDate: Record<string, number> = {}): UserMetrics {
  const week = startOfWeek(today);
  const month = startOfMonth(today);
  const xpOn = (pred: (d: string) => boolean) =>
    activities.filter((a) => pred(a.date)).reduce((s, a) => s + a.xp, 0) +
    Object.entries(bonusXpByDate)
      .filter(([d]) => pred(d))
      .reduce((s, [, v]) => s + v, 0);

  const days = [...new Set(activities.map((a) => a.date))].sort();

  return {
    todayXp: xpOn((d) => d === today),
    weekXp: xpOn((d) => d >= week && d <= today),
    monthXp: xpOn((d) => d >= month && d <= today),
    activeDays: days.length,
    monthRunKm: round1(
      activities.filter((a) => a.type === "run" && a.date >= month).reduce((s, a) => s + (a.run?.distanceKm ?? 0), 0),
    ),
    growthPct: strengthGrowth(activities, today),
    streak: computeStreak(days, today),
    workoutsThisWeek: activities.filter((a) => a.type === "workout" && a.date >= week).length,
  };
}

export function strengthGrowth(activities: Activity[], today: string): number {
  const cut = addDays(today, -30);
  const recent = new Map<string, number>();
  const before = new Map<string, number>();
  for (const a of activities) {
    if (a.type !== "workout" || !a.workout) continue;
    const m = a.date > cut ? recent : before;
    const v = bestE1RM(a.workout.sets);
    m.set(a.workout.exerciseId, Math.max(m.get(a.workout.exerciseId) ?? 0, v));
  }
  const rates: number[] = [];
  for (const [ex, r] of recent) {
    const b = before.get(ex);
    if (b && b > 0) rates.push(((r - b) / b) * 100);
  }
  if (rates.length === 0) return 0;
  return round1(rates.reduce((a, b) => a + b, 0) / rates.length);
}

export type RankingKey = "today" | "week" | "month" | "days" | "run" | "growth" | "streak";

export const RANKINGS: { key: RankingKey; label: string; unit: string; pick: (m: UserMetrics) => number }[] = [
  { key: "today", label: "今日", unit: "XP", pick: (m) => m.todayXp },
  { key: "week", label: "週間", unit: "XP", pick: (m) => m.weekXp },
  { key: "month", label: "月間", unit: "XP", pick: (m) => m.monthXp },
  { key: "days", label: "累計日数", unit: "日", pick: (m) => m.activeDays },
  { key: "streak", label: "連続日数", unit: "日", pick: (m) => m.streak },
  { key: "run", label: "ラン距離", unit: "km", pick: (m) => m.monthRunKm },
  { key: "growth", label: "筋力成長", unit: "%", pick: (m) => m.growthPct },
];

export interface RankRow<T> {
  rank: number;
  value: number;
  item: T;
}

/** 同値は同順位 */
export function rank<T>(items: T[], value: (t: T) => number): RankRow<T>[] {
  const sorted = [...items].map((item) => ({ item, value: value(item) })).sort((a, b) => b.value - a.value);
  let prev = Number.NaN;
  let prevRank = 0;
  return sorted.map((r, i) => {
    const rk = r.value === prev ? prevRank : i + 1;
    prev = r.value;
    prevRank = rk;
    return { rank: rk, value: r.value, item: r.item };
  });
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
