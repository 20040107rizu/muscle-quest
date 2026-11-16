import type { Exercise, MuscleGroup, SetRecord, StatKey, XpBreakdown } from "./types";

/** 1日に獲得できる経験値の上限（水増し防止） */
export const DAILY_XP_CAP = 1500;

/** 自重種目で負荷とみなす体重の割合 */
const BODYWEIGHT_RATIO = 0.65;

/** 同じ種目を同じ日に何セットもやった場合の逓減 */
export function setDiminishFactor(setIndexToday: number): number {
  if (setIndexToday < 6) return 1;
  if (setIndexToday < 10) return 0.5;
  return 0.1;
}

/** 1セットの経験値。ボリューム(重量×回数)の平方根で、極端な入力の影響を抑える */
export function rawSetXp(ex: Exercise, set: SetRecord, bodyweightKg: number): number {
  const load = ex.bodyweight ? bodyweightKg * BODYWEIGHT_RATIO + set.weightKg : set.weightKg;
  const volume = Math.max(0, load) * Math.max(0, set.reps);
  return 4 + Math.sqrt(volume) * 0.9;
}

export interface WorkoutXpInput {
  exercise: Exercise;
  sets: SetRecord[];
  /** 同じ日に既に記録済みの同種目セット数 */
  priorSetsToday: number;
  bodyweightKg: number;
}

export function computeWorkoutXp({ exercise, sets, priorSetsToday, bodyweightKg }: WorkoutXpInput): {
  total: number;
  byStat: XpBreakdown;
} {
  let total = 0;
  sets.forEach((s, i) => {
    total += rawSetXp(exercise, s, bodyweightKg) * setDiminishFactor(priorSetsToday + i);
  });
  return distribute(total, exercise.distribution);
}

/** ペース(秒/km) */
export function paceSecPerKm(distanceKm: number, durationS: number): number {
  return distanceKm > 0 ? durationS / distanceKm : 0;
}

/** ランニングの経験値。距離ベース + 速いペースに少しボーナス。1日15km超は逓減 */
export function computeRunXp(distanceKm: number, durationS: number, priorKmToday: number): {
  total: number;
  byStat: XpBreakdown;
} {
  const full = Math.max(0, Math.min(distanceKm, 15 - priorKmToday));
  const reduced = distanceKm - full;
  const pace = paceSecPerKm(distanceKm, durationS);
  const paceBonus = pace > 0 && pace < 390 ? Math.min(0.3, ((390 - pace) / 60) * 0.1) : 0;
  const total = (full * 35 + reduced * 10) * (1 + paceBonus);
  return distribute(total, { cardio: 0.75, legs: 0.25 });
}

function distribute(total: number, dist: Partial<Record<StatKey, number>>) {
  const byStat: XpBreakdown = {};
  let sum = 0;
  for (const [k, ratio] of Object.entries(dist) as [StatKey, number][]) {
    const v = Math.round(total * ratio);
    byStat[k] = v;
    sum += v;
  }
  return { total: sum, byStat };
}

/** 1日の上限を超える分を切り捨て、部位配分も比例縮小する */
export function applyDailyCap(
  gained: { total: number; byStat: XpBreakdown },
  alreadyToday: number,
  cap = DAILY_XP_CAP,
): { total: number; byStat: XpBreakdown; capped: boolean } {
  const allowed = Math.max(0, Math.min(gained.total, cap - alreadyToday));
  if (allowed >= gained.total) return { ...gained, capped: false };
  const scale = gained.total > 0 ? allowed / gained.total : 0;
  const byStat: XpBreakdown = {};
  let sum = 0;
  for (const [k, v] of Object.entries(gained.byStat) as [StatKey, number][]) {
    const nv = Math.floor(v * scale);
    byStat[k] = nv;
    sum += nv;
  }
  return { total: sum, byStat, capped: true };
}

// ---------- レベル ----------

/** レベルLから L+1 に上がるのに必要な経験値 */
export function xpToNext(level: number): number {
  return 100 + 50 * (level - 1);
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let rest = Math.max(0, totalXp);
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: rest, needed: xpToNext(level) };
}

// ---------- 推定1RM（筋トレの成長ランキング用） ----------

/** Epley式 */
export function estimate1RM(set: SetRecord): number {
  if (set.reps <= 0) return 0;
  if (set.reps === 1) return set.weightKg;
  return set.weightKg * (1 + Math.min(set.reps, 30) / 30);
}

export function bestE1RM(sets: SetRecord[]): number {
  return sets.reduce((m, s) => Math.max(m, estimate1RM(s)), 0);
}

export function volumeOf(sets: SetRecord[]): number {
  return sets.reduce((a, s) => a + s.weightKg * s.reps, 0);
}

export function sumStats(list: XpBreakdown[]): Record<StatKey, number> {
  const out: Record<StatKey, number> = { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, cardio: 0 };
  for (const b of list) {
    for (const [k, v] of Object.entries(b) as [StatKey, number][]) out[k] += v ?? 0;
  }
  return out;
}

export type { MuscleGroup };
