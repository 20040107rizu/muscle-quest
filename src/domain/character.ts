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

export const HERO_TYPES = ["balance", "chest", "back", "shoulder", "arm", "leg", "core", "runner"] as const;
export type HeroType = (typeof HERO_TYPES)[number];

export const HERO_TYPE_LABELS: Record<HeroType, string> = {
  balance: "バランス型",
  chest: "胸型",
  back: "背中型",
  shoulder: "肩型",
  arm: "腕型",
  leg: "脚型",
  core: "体幹型",
  runner: "ランナー型",
};

const STAT_TO_TYPE: Record<StatKey, HeroType> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulder",
  arms: "arm",
  legs: "leg",
  core: "core",
  cardio: "runner",
};

/**
 * 体型タイプ。いちばん育っている部位が2番目の1.3倍以上なら
 * その部位のタイプ、そうでなければバランス型。
 */
export function heroType(stats: Record<StatKey, number>): HeroType {
  const entries = Object.entries(stats) as [StatKey, number][];
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total < 300) return "balance";
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const [[topKey, topVal], [, second]] = sorted;
  return topVal >= second * 1.3 ? STAT_TO_TYPE[topKey] : "balance";
}
