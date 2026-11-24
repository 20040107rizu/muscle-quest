import { addDays, startOfWeek } from "./dates";
import { WEEKLY_BOSSES } from "./weekly";
import { buildTitleStats, TITLE_DEFS, unlockedTitleIds, type TitleDef, type TitleRarity, type TitleStats } from "./titles";
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
  /** 種目ID → 1セットでやった最高回数（自重の別ルート用） */
  maxReps?: Record<string, number>;
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
  | { kind: "e1rm"; exercises: string[]; label: string; value: number }
  | { kind: "reps"; exercises: string[]; label: string; value: number }
  /** どれか1つを満たせばOK（ジム・ダンベル無しの人向けの別ルートなど） */
  | { kind: "anyOf"; options: Requirement[]; value: 1 };

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

export type { TitleRarity };

export interface Title {
  id: string;
  name: string;
  rarity: TitleRarity;
  /** 画像生成AIが作った称号（プレート・エフェクト・文字の画像と入手条件）。週替わりボスの称号には無い */
  def?: TitleDef;
}

export const TITLES: Title[] = [
  ...TITLE_DEFS.map((d) => ({ id: d.id, name: d.name, rarity: d.rarity, def: d })),
  // 週替わりボスの限定称号
  ...WEEKLY_BOSSES.map((b) => ({ id: b.titleId, name: b.titleName, rarity: b.rarity })),
];

/** 称号の入手条件（持っていない称号の説明） */
export function titleHowToGet(titleId: string): string {
  const d = findTitle(titleId)?.def;
  if (d) return d.howToGet;
  const w = WEEKLY_BOSSES.find((b) => b.titleId === titleId);
  if (w) return `週替わりボス「${w.name}」の週に、友達みんなで倒す（自分も1回以上運動する）`;
  return "条件は準備中";
}

export function findTitle(id: string | undefined): Title | undefined {
  return id ? TITLES.find((t) => t.id === id) : undefined;
}

const CHEST = ["bench_press", "chest_press", "incline_db_press", "db_bench_press", "close_grip_bench", "incline_chest_press"];
const BACK = ["lat_pulldown", "seated_row", "deadlift", "bent_over_row", "one_arm_db_row"];
const LEGS = ["squat", "leg_press"];

/** 推定MAXの代わりに、自重種目の「1セットの回数」でも倒せるようにする */
function orBodyweight(main: Requirement, ...alts: [string[], string, number][]): Requirement {
  return { kind: "anyOf", value: 1, options: [main, ...alts.map(([exercises, label, value]) => ({ kind: "reps" as const, exercises, label, value }))] };
}

export const DUNGEONS: Dungeon[] = [
  {
    id: "cave",
    name: "始まりの洞窟",
    theme: "まずは習慣づくり",
    color: "#8b93a3",
    unlockAfter: [],
    reward: {},
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
    reward: {},
    floors: [
      { name: "1F 前庭", boss: "鉄の番兵", emoji: "🛡️", requirements: [{ kind: "stat", stat: "chest", value: 300 }], hint: "ベンチプレス・チェストプレス・腕立て伏せ" },
      { name: "2F 回廊", boss: "鋼のゴーレム", emoji: "🗿", requirements: [{ kind: "stat", stat: "chest", value: 1000 }], hint: "週2回の胸トレを続けよう" },
      { name: "3F 試練の間", boss: "プレス騎士", emoji: "⚔️", requirements: [orBodyweight({ kind: "e1rm", exercises: CHEST, label: "胸プレス系の推定MAX", value: 60 }, [["push_up"], "腕立て伏せ（1セット）", 30], [["dips"], "ディップス（1セット）", 15])], hint: "ジムなら推定MAX60kg、家なら腕立て伏せ1セット30回" },
      { name: "最上階 祭壇", boss: "胸板の神", emoji: "🔱", requirements: [{ kind: "stat", stat: "chest", value: 2500 }, orBodyweight({ kind: "e1rm", exercises: CHEST, label: "胸プレス系の推定MAX", value: 80 }, [["push_up"], "腕立て伏せ（1セット）", 50], [["dips"], "ディップス（1セット）", 25])], hint: "胸の経験値2,500と、推定MAX80kgか腕立て伏せ1セット50回" },
    ],
  },
  {
    id: "back_mountain",
    name: "巨人の背骨山",
    theme: "背中を鍛えて登頂",
    color: "#ffb547",
    unlockAfter: ["chest_temple"],
    reward: {},
    floors: [
      { name: "麓", boss: "岩トカゲ", emoji: "🦎", requirements: [{ kind: "stat", stat: "back", value: 300 }], hint: "ラットプルダウン・チンニングマシン・シーテッドロー" },
      { name: "中腹", boss: "山岳トロール", emoji: "🧌", requirements: [{ kind: "stat", stat: "back", value: 1000 }], hint: "引く種目を週2回" },
      { name: "断崖", boss: "鷲の王", emoji: "🦅", requirements: [orBodyweight({ kind: "e1rm", exercises: BACK, label: "背中系の推定MAX", value: 60 }, [["pull_up"], "懸垂（1セット）", 8], [["back_extension"], "バックエクステンション（1セット）", 30])], hint: "ジムなら推定MAX60kg、家ならバックエクステンション1セット30回" },
      { name: "山頂", boss: "背骨の巨人", emoji: "🏔️", requirements: [{ kind: "stat", stat: "back", value: 2500 }, orBodyweight({ kind: "e1rm", exercises: BACK, label: "背中系の推定MAX", value: 90 }, [["pull_up"], "懸垂（1セット）", 15], [["back_extension"], "バックエクステンション（1セット）", 50])], hint: "背中の経験値2,500と、推定MAX90kgか懸垂15回かバックエクステンション50回" },
    ],
  },
  {
    id: "leg_castle",
    name: "大地の脚城",
    theme: "脚を鍛えて攻略",
    color: "#3ddc97",
    unlockAfter: ["back_mountain"],
    reward: {},
    floors: [
      { name: "城門", boss: "門番オーガ", emoji: "🚪", requirements: [{ kind: "stat", stat: "legs", value: 300 }], hint: "スクワット・レッグプレス" },
      { name: "練兵場", boss: "重装兵", emoji: "🪖", requirements: [{ kind: "stat", stat: "legs", value: 1200 }], hint: "脚の日をサボらない" },
      { name: "玉座の間", boss: "大地の王", emoji: "👑", requirements: [{ kind: "stat", stat: "legs", value: 3000 }, orBodyweight({ kind: "e1rm", exercises: LEGS, label: "スクワット/レッグプレスの推定MAX", value: 100 }, [["bodyweight_squat"], "自重スクワット（1セット）", 80])], hint: "脚の経験値3,000と、推定MAX100kgか自重スクワット1セット80回" },
    ],
  },
  {
    id: "wind_corridor",
    name: "風の回廊",
    theme: "走って駆け抜ける",
    color: "#4cc9f0",
    unlockAfter: ["leg_castle"],
    reward: {},
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
    unlockAfter: ["wind_corridor"],
    reward: {},
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
    unlockAfter: ["tower"],
    reward: {},
    floors: [
      { name: "外郭", boss: "四天王", emoji: "🦹", requirements: [{ kind: "level", value: 22 }], hint: "レベル22（ゴリマッチョ）" },
      { name: "内郭", boss: "鋼鉄の巨神", emoji: "🤖", requirements: [{ kind: "allMuscles", value: 3000 }], hint: "6部位すべて経験値3,000以上" },
      { name: "天守", boss: "筋肉覇王", emoji: "😈", requirements: [{ kind: "level", value: 35 }, { kind: "allMuscles", value: 5000 }], hint: "レベル35（レジェンド）へ" },
    ],
  },
  {
    id: "iron_arena",
    name: "鉄血の闘技場",
    theme: "裏ダンジョン・重さで勝負（ジム向け）",
    color: "#e63946",
    unlockAfter: ["final_castle"],
    reward: {},
    floors: [
      { name: "第1試合", boss: "鉄球の剣闘士", emoji: "🤺", requirements: [{ kind: "e1rm", exercises: CHEST, label: "胸プレス系の推定MAX", value: 100 }], hint: "ベンチプレスなどで推定MAX100kg" },
      { name: "第2試合", boss: "鎖の処刑人", emoji: "⛓️", requirements: [{ kind: "e1rm", exercises: BACK, label: "背中系の推定MAX", value: 140 }], hint: "デッドリフトなどで推定MAX140kg" },
      { name: "第3試合", boss: "石臼の巨人", emoji: "🪨", requirements: [{ kind: "e1rm", exercises: LEGS, label: "スクワット/レッグプレスの推定MAX", value: 160 }], hint: "スクワット・レッグプレスで推定MAX160kg" },
      { name: "決勝", boss: "闘技場の覇者", emoji: "🏟️", requirements: [{ kind: "e1rm", exercises: ["bench_press"], label: "ベンチプレスの推定MAX", value: 120 }, { kind: "e1rm", exercises: ["deadlift"], label: "デッドリフトの推定MAX", value: 180 }, { kind: "e1rm", exercises: ["squat"], label: "スクワットの推定MAX", value: 150 }], hint: "BIG3で推定MAX 120 / 180 / 150kg" },
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
  const maxReps: Record<string, number> = {};
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
      const id = a.workout.exerciseId;
      for (const st of a.workout.sets) maxReps[id] = Math.max(maxReps[id] ?? 0, st.reps);
    }
    if (a.run) {
      totalRunKm += a.run.distanceKm;
      longestRunKm = Math.max(longestRunKm, a.run.distanceKm);
    }
  }
  return { ...base, weekXp, totalSets, totalRunKm: round1(totalRunKm), longestRunKm, e1rm, maxReps, longestStreak: longestStreak(activities.map((a) => a.date)) };
}

export interface ReqProgress {
  label: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
  /** 「どれか1つ」の条件のとき、それぞれの選択肢 */
  options?: ReqProgress[];
}

function ratioOf(r: ReqProgress) {
  return Math.min(1, r.current / r.target);
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
    case "reps":
      return p(req.label, Math.max(0, ...req.exercises.map((e) => s.maxReps?.[e] ?? 0)), "回");
    case "anyOf": {
      const options = req.options.map((o) => evaluate(o, s));
      const best = Math.max(0, ...options.map(ratioOf));
      return { label: "どれか1つ", current: best, target: 1, unit: "", done: options.some((o) => o.done), options };
    }
  }
}

export function floorProgress(floor: Floor, s: QuestStats) {
  const reqs = floor.requirements.map((r) => evaluate(r, s));
  /** ボスの残りHP（0..1）。条件の達成度の平均 */
  const ratio = reqs.reduce((a, r) => a + ratioOf(r), 0) / reqs.length;
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

/**
 * 条件を満たしている階を順番にすべてクリアした場合の状態。
 * ignoreLocks: ダンジョンの解放順を無視する（解放順を変える前に倒した階をサーバーで消さないため）
 */
export function simulateClears(s: QuestStats, ignoreLocks = false): Set<string> {
  const cleared = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const d of DUNGEONS) {
      if (!ignoreLocks && !isUnlocked(d, cleared)) continue;
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

/** オーラの入手判定に使う進み具合 */
export interface ItemProgress {
  level: number;
  longestStreak: number;
  activeDays?: number;
  totalSets?: number;
  totalRunKm?: number;
}

/** オーラの入手条件を満たしているか */
export function itemUnlocked(item: Item, p: ItemProgress): boolean {
  const s = item.source;
  switch (s.kind) {
    case "level":
      return p.level >= s.level;
    case "streak":
      return p.longestStreak >= s.days;
    case "totalRunKm":
      return (p.totalRunKm ?? 0) >= s.km;
  }
}

/** 入手方法の説明（未入手オーラのヒント） */
export function itemSourceLabel(item: Item): string {
  const s = item.source;
  switch (s.kind) {
    case "level":
      return `レベル${s.level}に到達`;
    case "streak":
      return `${s.days}日連続で運動`;
    case "totalRunKm":
      return `累計${s.km}km走る`;
  }
}

/** 獲得済みの称号・オーラ（称号は titleStats を渡したときだけ判定する） */
export function ownedRewards(cleared: Set<string>, progress: ItemProgress = { level: 1, longestStreak: 0 }, weeklyBossIds: string[] = [], titleStats?: TitleStats) {
  const titles: string[] = titleStats ? unlockedTitleIds(titleStats) : [];
  for (const b of WEEKLY_BOSSES) if (weeklyBossIds.includes(b.id)) titles.push(b.titleId);
  const items = ITEMS.filter((it) => itemUnlocked(it, progress)).map((it) => it.id);
  return { titles, items };
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** 称号の判定用の数値（記録・キャラ・クエストの進み具合・友達の数などから） */
export function titleStatsFrom(input: {
  activities: Activity[];
  questStats: QuestStats;
  cleared: Set<string>;
  weeklyBosses: number;
  friends: number;
  cheers: number;
}): TitleStats {
  const q = input.questStats;
  return buildTitleStats({
    activities: input.activities,
    level: q.level,
    stats: q.stats,
    activeDays: q.activeDays,
    longestStreak: q.longestStreak,
    totalSets: q.totalSets,
    totalRunKm: q.totalRunKm,
    longestRunKm: q.longestRunKm,
    e1rm: q.e1rm,
    clearedFloors: DUNGEONS.reduce((n, d) => n + d.floors.filter((_, i) => input.cleared.has(clearId(d.id, i))).length, 0),
    clearedDungeons: DUNGEONS.filter((d) => isDungeonCleared(d, input.cleared)).length,
    weeklyBosses: input.weeklyBosses,
    friends: input.friends,
    cheers: input.cheers,
  });
}

/** いま「ボスに挑む」を押せば倒せる階（解放済み・未撃破で、条件を満たしているもの） */
export function readyBosses(cleared: Set<string>, s: QuestStats): { d: Dungeon; floor: number }[] {
  const out: { d: Dungeon; floor: number }[] = [];
  for (const d of DUNGEONS) {
    if (!isUnlocked(d, cleared)) continue;
    const f = currentFloor(d, cleared);
    if (f != null && floorProgress(d.floors[f], s).ready) out.push({ d, floor: f });
  }
  return out;
}
