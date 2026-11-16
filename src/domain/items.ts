/** クエスト報酬の装備アイテム（キャラの見た目に反映） */
export const GEAR_SLOTS = ["head", "wrist", "waist", "shorts", "shoes", "aura"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type Gear = Partial<Record<GearSlot, string>>;

export const SLOT_LABELS: Record<GearSlot, string> = {
  head: "頭",
  wrist: "腕",
  waist: "腰",
  shorts: "ショーツ",
  shoes: "シューズ",
  aura: "オーラ",
};

export interface Item {
  id: string;
  name: string;
  slot: GearSlot;
  description: string;
  /** 描画色 */
  color: string;
  color2?: string;
}

export const ITEMS: Item[] = [
  { id: "headband_white", name: "冒険者のハチマキ", slot: "head", description: "始まりの洞窟を踏破した証", color: "#f2f2f2", color2: "#ff6b2c" },
  { id: "wrist_red", name: "灼熱のリストバンド", slot: "wrist", description: "鋼の胸板神殿の主から奪った", color: "#e8423a" },
  { id: "belt_leather", name: "巨人のリフティングベルト", slot: "waist", description: "巨人の背骨山の宝", color: "#5a3a26", color2: "#d9b25a" },
  { id: "shorts_red", name: "大地の赤ショーツ", slot: "shorts", description: "大地の脚城の戦利品", color: "#b3262d", color2: "#6e1418" },
  { id: "shoes_wind", name: "疾風のシューズ", slot: "shoes", description: "風の回廊を駆け抜けた者の靴", color: "#4cc9f0" },
  { id: "aura_flame", name: "不屈の炎", slot: "aura", description: "不屈の塔の頂で灯る炎", color: "#ff6b2c" },
  { id: "shorts_gold", name: "覇王の金ショーツ", slot: "shorts", description: "覇王の城を制した者だけが履ける", color: "#e9c25a", color2: "#9b7424" },
  { id: "aura_gold", name: "覇王のオーラ", slot: "aura", description: "全身から立ちのぼる黄金の気", color: "#ffd166" },
];

export function findItem(id: string | undefined): Item | undefined {
  return id ? ITEMS.find((i) => i.id === id) : undefined;
}
