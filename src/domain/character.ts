import { addDays, diffDays } from "./dates";
import { levelFromXp, sumStats } from "./xp";
import { MUSCLE_GROUPS, type MuscleGroup, type StatKey, type XpBreakdown } from "./types";

export interface Tier {
  minLevel: number;
  name: string;
  title: string;
}

/** 進化段階 */
export const TIERS: Tier[] = [
  { minLevel: 1, name: "ビギナー", title: "これから始まる男" },
  { minLevel: 5, name: "細マッチョ", title: "シャツが似合ってきた" },
  { minLevel: 12, name: "マッチョ", title: "ジムで一目置かれる" },
  { minLevel: 22, name: "ゴリマッチョ", title: "ドアが狭く感じる" },
  { minLevel: 35, name: "レジェンド", title: "生ける彫刻" },
  { minLevel: 50, name: "神話", title: "人の域を超えた" },
];

export function tierFor(level: number): Tier {
  return [...TIERS].reverse().find((t) => level >= t.minLevel) ?? TIERS[0];
}

/** 部位の発達度 0..1。経験値に対して飽和曲線で成長 */
export function development(xp: number, k = 1800): number {
  return 1 - Math.exp(-Math.max(0, xp) / k);
}

export interface CharacterState {
  totalXp: number;
  level: number;
  levelInto: number;
  levelNeeded: number;
  tier: Tier;
  stats: Record<StatKey, number>;
  /** 見た目用パラメータ 0..1 */
  dev: Record<MuscleGroup, number>;
  cardio: number;
  /** 体脂肪感 0(バキバキ)..1(ぽっちゃり) */
  fat: number;
  /** 直近の運動によるパンプ / サボりによるしぼみ (0.9..1.05) */
  pump: number;
  streak: number;
  daysSinceActive: number | null;
  activeDays: number;
}

export function buildCharacter(
  events: { total: number; byStat: XpBreakdown; date: string }[],
  activityDates: string[],
  today: string,
): CharacterState {
  const totalXp = events.reduce((a, e) => a + e.total, 0);
  const lv = levelFromXp(totalXp);
  const stats = sumStats(events.map((e) => e.byStat));
  const dev = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, development(stats[g])])) as Record<MuscleGroup, number>;
  const strength = MUSCLE_GROUPS.reduce((a, g) => a + stats[g], 0);
  const cardio = development(stats.cardio, 1500);
  const fat = Math.exp(-(stats.cardio * 1.0 + strength * 0.3) / 2500);

  const days = [...new Set(activityDates)].sort();
  const last = days[days.length - 1];
  const daysSinceActive = last ? diffDays(today, last) : null;
  let pump = 1;
  if (daysSinceActive === 0) pump = 1.04;
  else if (daysSinceActive != null && daysSinceActive > 3) pump = Math.max(0.9, 1 - 0.015 * (daysSinceActive - 3));

  return {
    totalXp,
    level: lv.level,
    levelInto: lv.into,
    levelNeeded: lv.needed,
    tier: tierFor(lv.level),
    stats,
    dev,
    cardio,
    fat,
    pump,
    streak: computeStreak(days, today),
    daysSinceActive,
    activeDays: days.length,
  };
}

/** 今日または昨日まで連続して運動した日数 */
export function computeStreak(sortedUniqueDays: string[], today: string): number {
  const set = new Set(sortedUniqueDays);
  let cursor = today;
  if (!set.has(cursor)) {
    // 今日まだ運動していなくても昨日まで続いていればストリーク継続
    const yesterday = addDays(today, -1);
    if (!set.has(yesterday)) return 0;
    cursor = yesterday;
  }
  let n = 0;
  while (set.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}

// ---------- 見た目（画像）の選択 ----------

/** 進化段階 1..6（TIERS の順番） */
export function heroStage(level: number): number {
  return TIERS.indexOf(tierFor(level)) + 1;
}

/** 単独の体型（部位ごと）。組み合わせの体型は、この順に「_」でつないだ名前（例: chest_back） */
export const BASE_TYPES = ["chest", "back", "shoulder", "arm", "leg", "core", "runner"] as const;
export type BaseType = (typeof BASE_TYPES)[number];
/** 体型の名前。"balance" か、1〜3つの BaseType を BASE_TYPES の順に "_" でつないだもの */
export type HeroType = string;

const BASE_LABELS: Record<BaseType, string> = { chest: "胸", back: "背中", shoulder: "肩", arm: "腕", leg: "脚", core: "体幹", runner: "ランナー" };

/** 体型の表示名（例: 胸型、胸＋背中型、バランス型） */
export function heroTypeLabel(t: HeroType): string {
  if (t === "balance") return "バランス型";
  return t.split("_").map((x) => BASE_LABELS[x as BaseType] ?? x).join("＋") + "型";
}

const STAT_TO_TYPE: Record<StatKey, BaseType> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulder",
  arms: "arm",
  legs: "leg",
  core: "core",
  cardio: "runner",
};

/**
 * 体型。部位の経験値を多い順に並べ、
 * - 1位が2位の1.3倍以上 → その部位の体型
 * - 2位が3位の1.3倍以上（1位と2位が同じくらい）→ 2部位の組み合わせ
 * - 3位が4位の1.3倍以上（上位3つが同じくらい）→ 3部位の組み合わせ
 * - それ以外（4つ以上が同じくらい）・まだ経験値が少ない → バランス型
 */
export function heroType(stats: Record<StatKey, number>): HeroType {
  const entries = Object.entries(stats) as [StatKey, number][];
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total < 300) return "balance";
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  for (const k of [1, 2, 3]) {
    if (sorted[k - 1][1] > 0 && sorted[k - 1][1] >= sorted[k][1] * 1.3) {
      const parts = sorted.slice(0, k).map(([key]) => STAT_TO_TYPE[key]);
      return BASE_TYPES.filter((b) => parts.includes(b)).join("_");
    }
  }
  return "balance";
}
