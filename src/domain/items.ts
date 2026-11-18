/**
 * 装備アイテム。主人公の体に重ねて表示される（src/components/HeroFigure.tsx）。
 * 入手方法（source）はすべて「実際に鍛えた結果」で、ここから所持品が計算される。
 */
export const GEAR_SLOTS = ["head", "neck", "cape", "wrist", "hand", "waist", "shorts", "shoes", "aura"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type Gear = Partial<Record<GearSlot, string>>;

export const SLOT_LABELS: Record<GearSlot, string> = {
  head: "頭",
  neck: "首",
  cape: "背中",
  wrist: "手首",
  hand: "手",
  waist: "腰",
  shorts: "ショーツ",
  shoes: "シューズ",
  aura: "オーラ",
};

/** 見た目の種類（描き方の違い） */
export type ItemLook =
  | "headband"
  | "crown"
  | "chain"
  | "fang"
  | "pendant"
  | "cape"
  | "wristband"
  | "dumbbell"
  | "kettlebell"
  | "belt"
  | "champion"
  | "recolor"
  | "camo"
  | "aura";

export type ItemSource =
  | { kind: "dungeon"; dungeonId: string }
  | { kind: "floor"; dungeonId: string; floor: number }
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "allDungeons" };

export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Item {
  id: string;
  name: string;
  slot: GearSlot;
  look: ItemLook;
  description: string;
  /** メインの色 */
  color: string;
  /** サブの色（結び目・バックル・腰ゴムなど） */
  color2?: string;
  rarity: Rarity;
  source: ItemSource;
  /** public/items/{id}.webp のアイコン画像があるか（なければ自動で描く） */
  icon?: boolean;
  /** 光る */
  glow?: boolean;
}

export const ITEMS: Item[] = [
  // ---- 頭 ----
  { id: "headband_white", name: "冒険者のハチマキ", slot: "head", look: "headband", description: "始まりの洞窟を踏破した証", color: "#f2f2f2", color2: "#ff6b2c", rarity: "R", source: { kind: "dungeon", dungeonId: "cave" }, icon: true },
  { id: "headband_red", name: "オーガの赤ハチマキ", slot: "head", look: "headband", description: "門番オーガが巻いていた", color: "#d7263d", color2: "#ffd166", rarity: "R", source: { kind: "floor", dungeonId: "leg_castle", floor: 0 } },
  { id: "headband_blue", name: "稲妻のハチマキ", slot: "head", look: "headband", description: "疾風の狼の毛で編まれている", color: "#2f6bff", color2: "#ffe14d", rarity: "SR", source: { kind: "floor", dungeonId: "wind_corridor", floor: 1 } },
  { id: "headband_black", name: "不屈の黒ハチマキ", slot: "head", look: "headband", description: "14日間、一日も休まなかった者に", color: "#1b1d22", color2: "#ff5d6c", rarity: "SR", source: { kind: "streak", days: 14 } },
  { id: "crown_gold", name: "黄金の王冠", slot: "head", look: "crown", description: "神話の肉体に至った者だけがかぶれる", color: "#ffd166", color2: "#ff5d6c", rarity: "SSR", source: { kind: "level", level: 50 }, glow: true },
  // ---- 首 ----
  { id: "necklace_fang", name: "ゴブリンの牙", slot: "neck", look: "fang", description: "ゴブリンを倒して手に入れた牙", color: "#f1ead8", color2: "#5a3a26", rarity: "N", source: { kind: "floor", dungeonId: "cave", floor: 1 } },
  { id: "necklace_silver", name: "魔女のペンダント", slot: "neck", look: "pendant", description: "誘惑に打ち勝った者の証", color: "#c9d1e0", color2: "#b79cff", rarity: "R", source: { kind: "floor", dungeonId: "tower", floor: 1 } },
  { id: "necklace_gold", name: "金のチェーン", slot: "neck", look: "chain", description: "レベル15の証。重いほど強い", color: "#ffd166", color2: "#e2a83a", rarity: "SR", source: { kind: "level", level: 15 } },
  // ---- 背中 ----
  { id: "cape_red", name: "騎士の赤マント", slot: "cape", look: "cape", description: "プレス騎士から託されたマント", color: "#b3262d", color2: "#ffd166", rarity: "SR", source: { kind: "floor", dungeonId: "chest_temple", floor: 2 } },
  { id: "cape_black", name: "影のマント", slot: "cape", look: "cape", description: "怠惰の影を振り払った者がまとう", color: "#1b1d22", color2: "#b79cff", rarity: "R", source: { kind: "floor", dungeonId: "tower", floor: 0 } },
  { id: "cape_gold", name: "金の羽マント", slot: "cape", look: "cape", description: "鷲の王の羽で織られた", color: "#e9c25a", color2: "#fff6c8", rarity: "SSR", source: { kind: "floor", dungeonId: "back_mountain", floor: 2 }, glow: true },
  // ---- 手首 ----
  { id: "wrist_red", name: "灼熱のリストバンド", slot: "wrist", look: "wristband", description: "鋼の胸板神殿の主から奪った", color: "#e8423a", rarity: "R", source: { kind: "dungeon", dungeonId: "chest_temple" }, icon: true },
  { id: "wrist_black", name: "黒のリストバンド", slot: "wrist", look: "wristband", description: "最初の一歩。レベル3の証", color: "#22252c", color2: "#ff6b2c", rarity: "N", source: { kind: "level", level: 3 } },
  { id: "wrist_iron", name: "鉄の籠手", slot: "wrist", look: "wristband", description: "鉄の番兵の装甲から作った", color: "#9aa3b2", color2: "#5b6372", rarity: "R", source: { kind: "floor", dungeonId: "chest_temple", floor: 0 } },
  { id: "wrist_gold", name: "時の金腕輪", slot: "wrist", look: "wristband", description: "時の番人が刻を止めた腕輪", color: "#ffd166", color2: "#b8862c", rarity: "SR", source: { kind: "floor", dungeonId: "tower", floor: 2 }, glow: true },
  // ---- 手 ----
  { id: "hand_dumbbell", name: "鋼のダンベル", slot: "hand", look: "dumbbell", description: "鋼のゴーレムの心臓で作られた", color: "#3a3f4a", color2: "#c9d1e0", rarity: "R", source: { kind: "floor", dungeonId: "chest_temple", floor: 1 } },
  { id: "hand_kettlebell", name: "トロールのケトルベル", slot: "hand", look: "kettlebell", description: "山岳トロールが振り回していた", color: "#2b2f37", color2: "#ff6b2c", rarity: "R", source: { kind: "floor", dungeonId: "back_mountain", floor: 1 } },
  // ---- 腰 ----
  { id: "belt_leather", name: "巨人のリフティングベルト", slot: "waist", look: "belt", description: "巨人の背骨山の宝", color: "#5a3a26", color2: "#d9b25a", rarity: "SR", source: { kind: "dungeon", dungeonId: "back_mountain" }, icon: true },
  { id: "belt_champion", name: "チャンピオンベルト", slot: "waist", look: "champion", description: "鋼鉄の巨神を倒した王者の証", color: "#1b1d22", color2: "#ffd166", rarity: "SSR", source: { kind: "floor", dungeonId: "final_castle", floor: 1 }, glow: true },
  // ---- ショーツ ----
  { id: "shorts_slime", name: "スライムショーツ", slot: "shorts", look: "recolor", description: "スライムの粘液で染めた（洗っても落ちない）", color: "#3fa34d", color2: "#c6ff6b", rarity: "N", source: { kind: "floor", dungeonId: "cave", floor: 0 } },
  { id: "shorts_red", name: "大地の赤ショーツ", slot: "shorts", look: "recolor", description: "大地の脚城の戦利品", color: "#b3262d", color2: "#ffd166", rarity: "SR", source: { kind: "dungeon", dungeonId: "leg_castle" }, icon: true },
  { id: "shorts_camo", name: "重装兵の迷彩ショーツ", slot: "shorts", look: "camo", description: "重装兵の野戦用", color: "#4b5a2e", color2: "#ff6b2c", rarity: "R", source: { kind: "floor", dungeonId: "leg_castle", floor: 1 } },
  { id: "shorts_blue", name: "稲妻ブルーショーツ", slot: "shorts", look: "recolor", description: "嵐の鳥の羽の色", color: "#2f6bff", color2: "#ffe14d", rarity: "R", source: { kind: "floor", dungeonId: "wind_corridor", floor: 2 } },
  { id: "shorts_pink", name: "ネオンピンクショーツ", slot: "shorts", look: "recolor", description: "7日連続の情熱の色", color: "#ff3fa4", color2: "#ffffff", rarity: "R", source: { kind: "streak", days: 7 } },
  { id: "shorts_gold", name: "覇王の金ショーツ", slot: "shorts", look: "recolor", description: "覇王の城を制した者だけが履ける", color: "#e9c25a", color2: "#ff5d6c", rarity: "SSR", source: { kind: "dungeon", dungeonId: "final_castle" }, icon: true, glow: true },
  // ---- シューズ ----
  { id: "shoes_wind", name: "疾風のシューズ", slot: "shoes", look: "recolor", description: "風の回廊を駆け抜けた者の靴", color: "#4cc9f0", color2: "#ffffff", rarity: "SR", source: { kind: "dungeon", dungeonId: "wind_corridor" }, icon: true, glow: true },
  { id: "shoes_rock", name: "岩トカゲのブーツ", slot: "shoes", look: "recolor", description: "岩トカゲの皮。とにかく硬い", color: "#7a6f60", color2: "#5b8a3a", rarity: "N", source: { kind: "floor", dungeonId: "back_mountain", floor: 0 } },
  { id: "shoes_fire", name: "炎のシューズ", slot: "shoes", look: "recolor", description: "レベル8の証。走ると熱い", color: "#e8423a", color2: "#ffd166", rarity: "R", source: { kind: "level", level: 8 } },
  { id: "shoes_gold", name: "四天王の黄金靴", slot: "shoes", look: "recolor", description: "四天王を退けた者の靴", color: "#e9c25a", color2: "#ffffff", rarity: "SR", source: { kind: "floor", dungeonId: "final_castle", floor: 0 }, glow: true },
  // ---- オーラ ----
  { id: "aura_wind", name: "そよ風のオーラ", slot: "aura", look: "aura", description: "風の精の加護", color: "#4cc9f0", rarity: "R", source: { kind: "floor", dungeonId: "wind_corridor", floor: 0 } },
  { id: "aura_flame", name: "不屈の炎", slot: "aura", look: "aura", description: "不屈の塔の頂で灯る炎", color: "#ff6b2c", rarity: "SR", source: { kind: "dungeon", dungeonId: "tower" }, icon: true },
  { id: "aura_purple", name: "竜気のオーラ", slot: "aura", look: "aura", description: "レベル25。竜の気配をまとう", color: "#b79cff", rarity: "SR", source: { kind: "level", level: 25 } },
  { id: "aura_gold", name: "覇王のオーラ", slot: "aura", look: "aura", description: "全ダンジョン踏破。全身から立ちのぼる黄金の気", color: "#ffd166", rarity: "SSR", source: { kind: "allDungeons" }, icon: true },
];

export const RARITY_COLORS: Record<Rarity, string> = {
  N: "#9aa3b2",
  R: "#4cc9f0",
  SR: "#b79cff",
  SSR: "#ffd166",
};

export function findItem(id: string | undefined): Item | undefined {
  return id ? ITEMS.find((i) => i.id === id) : undefined;
}
