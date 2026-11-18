import { addDays, startOfWeek } from "./dates";
import { ITEMS, type Item } from "./items";
import { isAssist } from "./exercises";
import { bestE1RM } from "./xp";
import { STAT_LABELS, type Activity, type StatKey } from "./types";

/**
 * クエスト（ダンジョン）。各階のボスには「実際に鍛えた結果」で満たす条件がある。
 * 条件は経験値（日次上限・逓減済み）や実際の記録から計算するので、水増しでは突破できない。
 */

export interface QuestStats {
  level: number;
  stats: Record<StatKey, number>;
  streak: number;
  activeDays: number;
  weekXp: number;
  totalSets: number;
  totalRunKm: number;
  longestRunKm: number;
  /** 種目ID → 推定1RM の最高値 */
  e1rm: Record<string, number>;
  /** これまでで一番長かった連続運動日数 */
  longestStreak: number;
}

export type Requirement =
  | { kind: "stat"; stat: StatKey; value: number }
  | { kind: "allMuscles"; value: number }
  | { kind: "level"; value: number }
  | { kind: "streak"; value: number }
  | { kind: "activeDays"; value: number }
  | { kind: "weekXp"; value: number }
  | { kind: "totalSets"; value: number }
  | { kind: "totalRunKm"; value: number }
  | { kind: "longestRunKm"; value: number }
  | { kind: "e1rm"; exercises: string[]; label: string; value: number };

export interface Floor {
  name: string;
  boss: string;
  emoji: string;
  requirements: Requirement[];
  /** 攻略のヒント（おすすめ種目など） */
  hint: string;
}

export interface Reward {
  titleId?: string;
  itemId?: string;
}

export interface Dungeon {
  id: string;
  name: string;
  theme: string;
  color: string;
  /** これらのダンジョンを踏破すると解放 */
  unlockAfter: string[];
  floors: Floor[];
  reward: Reward;
}

export interface Title {
  id: string;
  name: string;
}

export const TITLES: Title[] = [
  { id: "adventurer", name: "駆け出しの冒険者" },
  { id: "iron_chest", name: "鋼の胸板" },
  { id: "demon_back", name: "鬼の背中" },
  { id: "earth_shaker", name: "大地を揺らす者" },
  { id: "wind_runner", name: "風の走者" },
  { id: "unyielding", name: "不屈の魂" },
  { id: "muscle_king", name: "筋肉覇王" },
];

export function findTitle(id: string | undefined): Title | undefined {
  return id ? TITLES.find((t) => t.id === id) : undefined;
}

const CHEST = ["bench_press", "chest_press", "incline_db_press"];
const BACK = ["lat_pulldown", "seated_row", "deadlift"];
const LEGS = ["squat", "leg_press"];

export const DUNGEONS: Dungeon[] = [
  {
    id: "cave",
    name: "始まりの洞窟",
    theme: "まずは習慣づくり",
    color: "#8b93a3",
    unlockAfter: [],
    reward: { titleId: "adventurer", itemId: "headband_white" },
    floors: [
      { name: "B1 入口", boss: "スライム", emoji: "🟢", requirements: [{ kind: "totalSets", value: 5 }], hint: "好きな種目で合計5セット" },
      { name: "B2 湿った回廊", boss: "ゴブリン", emoji: "👺", requirements: [{ kind: "activeDays", value: 3 }], hint: "3日運動しよう（連続でなくてOK）" },
      { name: "B3 最深部", boss: "洞窟オーク", emoji: "👹", requirements: [{ kind: "level", value: 5 }, { kind: "totalSets", value: 30 }], hint: "いろいろな部位を鍛えてレベル5へ" },
    ],
  },
  {
    id: "chest_temple",
    name: "鋼の胸板神殿",
    theme: "胸を鍛えて突破",
    color: "#ff6b2c",
    unlockAfter: ["cave"],
    reward: { titleId: "iron_chest", itemId: "wrist_red" },
    floors: [
      { name: "1F 前庭", boss: "鉄の番兵", emoji: "🛡️", requirements: [{ kind: "stat", stat: "chest", value: 300 }], hint: "ベンチプレス・チェストプレス・腕立て伏せ" },
      { name: "2F 回廊", boss: "鋼のゴーレム", emoji: "🗿", requirements: [{ kind: "stat", stat: "chest", value: 1000 }], hint: "週2回の胸トレを続けよう" },
      { name: "3F 試練の間", boss: "プレス騎士", emoji: "⚔️", requirements: [{ kind: "e1rm", exercises: CHEST, label: "胸プレス系の推定MAX", value: 60 }], hint: "ベンチ/チェストプレスで推定MAX60kg" },
      { name: "最上階 祭壇", boss: "胸板の神", emoji: "🔱", requirements: [{ kind: "stat", stat: "chest", value: 2500 }, { kind: "e1rm", exercises: CHEST, label: "胸プレス系の推定MAX", value: 80 }], hint: "推定MAX80kgと胸の経験値2,500" },
    ],
  },
  {
    id: "back_mountain",
    name: "巨人の背骨山",
    theme: "背中を鍛えて登頂",
    color: "#ffb547",
    unlockAfter: ["cave"],
    reward: { titleId: "demon_back", itemId: "belt_leather" },
    floors: [
      { name: "麓", boss: "岩トカゲ", emoji: "🦎", requirements: [{ kind: "stat", stat: "back", value: 300 }], hint: "ラットプルダウン・チンニングマシン・シーテッドロー" },
      { name: "中腹", boss: "山岳トロール", emoji: "🧌", requirements: [{ kind: "stat", stat: "back", value: 1000 }], hint: "引く種目を週2回" },
      { name: "断崖", boss: "鷲の王", emoji: "🦅", requirements: [{ kind: "e1rm", exercises: BACK, label: "背中系の推定MAX", value: 60 }], hint: "ラットプルダウン等で推定MAX60kg" },
      { name: "山頂", boss: "背骨の巨人", emoji: "🏔️", requirements: [{ kind: "stat", stat: "back", value: 2500 }, { kind: "e1rm", exercises: BACK, label: "背中系の推定MAX", value: 90 }], hint: "デッドリフトにも挑戦しよう" },
    ],
  },
  {
    id: "leg_castle",
    name: "大地の脚城",
    theme: "脚を鍛えて攻略",
    color: "#3ddc97",
    unlockAfter: ["cave"],
    reward: { titleId: "earth_shaker", itemId: "shorts_red" },
    floors: [
      { name: "城門", boss: "門番オーガ", emoji: "🚪", requirements: [{ kind: "stat", stat: "legs", value: 300 }], hint: "スクワット・レッグプレス" },
      { name: "練兵場", boss: "重装兵", emoji: "🪖", requirements: [{ kind: "stat", stat: "legs", value: 1200 }], hint: "脚の日をサボらない" },
      { name: "玉座の間", boss: "大地の王", emoji: "👑", requirements: [{ kind: "stat", stat: "legs", value: 3000 }, { kind: "e1rm", exercises: LEGS, label: "スクワット/レッグプレスの推定MAX", value: 100 }], hint: "推定MAX100kgを目指そう" },
    ],
  },
  {
    id: "wind_corridor",
    name: "風の回廊",
    theme: "走って駆け抜ける",
    color: "#4cc9f0",
    unlockAfter: ["cave"],
    reward: { titleId: "wind_runner", itemId: "shoes_wind" },
    floors: [
      { name: "第1区間", boss: "風の精", emoji: "🌬️", requirements: [{ kind: "totalRunKm", value: 10 }], hint: "累計10km走ろう" },
      { name: "第2区間", boss: "疾風の狼", emoji: "🐺", requirements: [{ kind: "longestRunKm", value: 5 }], hint: "1回で5km走り切る" },
      { name: "第3区間", boss: "嵐の鳥", emoji: "🌪️", requirements: [{ kind: "totalRunKm", value: 50 }], hint: "累計50km" },
      { name: "ゴール", boss: "風神", emoji: "⚡", requirements: [{ kind: "longestRunKm", value: 10 }, { kind: "stat", stat: "cardio", value: 2000 }], hint: "1回で10km走る" },
    ],
  },
  {
    id: "tower",
    name: "不屈の塔",
    theme: "続けることが力",
    color: "#b79cff",
    unlockAfter: ["cave"],
    reward: { titleId: "unyielding", itemId: "aura_flame" },
    floors: [
      { name: "3階", boss: "怠惰の影", emoji: "👤", requirements: [{ kind: "streak", value: 3 }], hint: "3日連続で運動" },
      { name: "10階", boss: "誘惑の魔女", emoji: "🧙", requirements: [{ kind: "streak", value: 7 }], hint: "7日連続。軽いランでもOK" },
      { name: "30階", boss: "時の番人", emoji: "⏳", requirements: [{ kind: "activeDays", value: 30 }], hint: "運動した日が累計30日" },
      { name: "頂上", boss: "不屈の竜", emoji: "🐉", requirements: [{ kind: "streak", value: 14 }, { kind: "weekXp", value: 2000 }], hint: "14日連続＋今週2,000XP" },
    ],
  },
  {
    id: "final_castle",
    name: "覇王の城",
    theme: "全身を極めし者へ",
    color: "#ffd166",
    unlockAfter: ["chest_temple", "back_mountain", "leg_castle", "wind_corridor", "tower"],
    reward: { titleId: "muscle_king", itemId: "shorts_gold" },
    floors: [
      { name: "外郭", boss: "四天王", emoji: "🦹", requirements: [{ kind: "level", value: 22 }], hint: "レベル22（ゴリマッチョ）" },
      { name: "内郭", boss: "鋼鉄の巨神", emoji: "🤖", requirements: [{ kind: "allMuscles", value: 3000 }], hint: "6部位すべて経験値3,000以上" },
      { name: "天守", boss: "筋肉覇王", emoji: "😈", requirements: [{ kind: "level", value: 35 }, { kind: "allMuscles", value: 5000 }], hint: "レベル35（レジェンド）へ" },
    ],
  },
];

export function findDungeon(id: string) {
  return DUNGEONS.find((d) => d.id === id);
}

export function clearId(dungeonId: string, floor: number) {
  return `${dungeonId}:${floor}`;
}

/** 記録（Activity）からクエスト判定用の数値を作る。自分・友達共通 */
export function buildQuestStats(
  activities: Activity[],
  base: { level: number; stats: Record<StatKey, number>; streak: number; activeDays: number },
  today: string,
): QuestStats {
  const week = startOfWeek(today);
  const e1rm: Record<string, number> = {};
  let totalSets = 0;
  let totalRunKm = 0;
  let longestRunKm = 0;
  let weekXp = 0;
  for (const a of activities) {
    if (a.date >= week && a.date <= today) weekXp += a.xp;
    if (a.workout) {
      totalSets += a.workout.sets.length;
      if (!isAssist(a.workout.exerciseId)) {
        const id = a.workout.exerciseId;
        e1rm[id] = Math.max(e1rm[id] ?? 0, bestE1RM(a.workout.sets));
      }
    }
    if (a.run) {
      totalRunKm += a.run.distanceKm;
      longestRunKm = Math.max(longestRunKm, a.run.distanceKm);
    }
  }
  return { ...base, weekXp, totalSets, totalRunKm: round1(totalRunKm), longestRunKm, e1rm, longestStreak: longestStreak(activities.map((a) => a.date)) };
}

export interface ReqProgress {
  label: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
}

export function evaluate(req: Requirement, s: QuestStats): ReqProgress {
  const p = (label: string, current: number, unit: string): ReqProgress => ({
    label,
    current: round1(current),
    target: req.value,
    unit,
    done: current >= req.value,
  });
  switch (req.kind) {
    case "stat":
      return p(`${STAT_LABELS[req.stat]}の経験値`, s.stats[req.stat], "XP");
    case "allMuscles":
      return p("6部位の経験値（最も低い部位）", Math.min(s.stats.chest, s.stats.back, s.stats.shoulders, s.stats.arms, s.stats.legs, s.stats.core), "XP");
    case "level":
      return p("レベル", s.level, "");
    case "streak":
      return p("連続運動日数", s.streak, "日");
    case "activeDays":
      return p("運動した日数（累計）", s.activeDays, "日");
    case "weekXp":
      return p("今週の獲得XP", s.weekXp, "XP");
    case "totalSets":
      return p("合計セット数", s.totalSets, "セット");
    case "totalRunKm":
      return p("累計走行距離", s.totalRunKm, "km");
    case "longestRunKm":
      return p("1回の最長距離", s.longestRunKm, "km");
    case "e1rm":
      return p(req.label, Math.max(0, ...req.exercises.map((e) => s.e1rm[e] ?? 0)), "kg");
  }
}

export function floorProgress(floor: Floor, s: QuestStats) {
  const reqs = floor.requirements.map((r) => evaluate(r, s));
  /** ボスの残りHP（0..1）。条件の達成度の平均 */
  const ratio = reqs.reduce((a, r) => a + Math.min(1, r.current / r.target), 0) / reqs.length;
  return { reqs, ready: reqs.every((r) => r.done), ratio };
}

export function isUnlocked(d: Dungeon, cleared: Set<string>) {
  return d.unlockAfter.every((id) => isDungeonCleared(findDungeon(id)!, cleared));
}

export function isDungeonCleared(d: Dungeon, cleared: Set<string>) {
  return d.floors.every((_, i) => cleared.has(clearId(d.id, i)));
}

/** 次に挑む階（全部クリア済みなら null） */
export function currentFloor(d: Dungeon, cleared: Set<string>): number | null {
  const i = d.floors.findIndex((_, i) => !cleared.has(clearId(d.id, i)));
  return i === -1 ? null : i;
}

/** 条件を満たしている階を順番にすべてクリアした場合の状態（友達のモック用） */
export function simulateClears(s: QuestStats): Set<string> {
  const cleared = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of DUNGEONS) {
      if (!isUnlocked(d, cleared)) continue;
      const f = currentFloor(d, cleared);
      if (f != null && floorProgress(d.floors[f], s).ready) {
        cleared.add(clearId(d.id, f));
        changed = true;
      }
    }
  }
  return cleared;
}

/** これまでの最長連続日数 */
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** アイテムの入手条件を満たしているか */
export function itemUnlocked(item: Item, cleared: Set<string>, progress: { level: number; longestStreak: number }): boolean {
  const s = item.source;
  switch (s.kind) {
    case "dungeon":
      return isDungeonCleared(findDungeon(s.dungeonId)!, cleared);
    case "floor":
      return cleared.has(clearId(s.dungeonId, s.floor));
    case "level":
      return progress.level >= s.level;
    case "streak":
      return progress.longestStreak >= s.days;
    case "allDungeons":
      return DUNGEONS.every((d) => isDungeonCleared(d, cleared));
  }
}

/** 入手方法の説明（未入手アイテムのヒント） */
export function itemSourceLabel(item: Item): string {
  const s = item.source;
  switch (s.kind) {
    case "dungeon":
      return `${findDungeon(s.dungeonId)?.name}を踏破`;
    case "floor": {
      const d = findDungeon(s.dungeonId);
      return `${d?.floors[s.floor]?.boss}を倒す（${d?.name} ${d?.floors[s.floor]?.name}）`;
    }
    case "level":
      return `レベル${s.level}に到達`;
    case "streak":
      return `${s.days}日連続で運動`;
    case "allDungeons":
      return "全ダンジョンを踏破";
  }
}

/** 獲得済みの称号・アイテム */
export function ownedRewards(cleared: Set<string>, progress: { level: number; longestStreak: number } = { level: 1, longestStreak: 0 }) {
  const titles: string[] = [];
  for (const d of DUNGEONS) {
    if (isDungeonCleared(d, cleared) && d.reward.titleId) titles.push(d.reward.titleId);
  }
  const items = ITEMS.filter((it) => itemUnlocked(it, cleared, progress)).map((it) => it.id);
  return { titles, items };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
