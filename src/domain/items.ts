/**
 * オーラ（主人公の体の後ろに出るエフェクト）。絵は画像生成AIが描いたもの（public/fx/{id}.webp）。
 * 装備（服・小物）は廃止し、手に入るのはオーラだけ。入手方法（source）はすべて「実際に鍛えた結果」。
 */
export type ItemSource =
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "totalRunKm"; km: number };

export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  source: ItemSource;
}

export const ITEMS: Item[] = [
  { id: "aura_wind", name: "そよ風のオーラ", rarity: "R", source: { kind: "totalRunKm", km: 50 }, description: "累計50km。風の加護" },
  { id: "aura_flame", name: "不屈の炎", rarity: "SR", source: { kind: "streak", days: 10 }, description: "10日連続で燃え上がる" },
  { id: "aura_purple", name: "竜気のオーラ", rarity: "SR", source: { kind: "level", level: 26 }, description: "竜の気配をまとう" },
  { id: "aura_gold", name: "覇王のオーラ", rarity: "SSR", source: { kind: "level", level: 38 }, description: "全身から立ちのぼる黄金の気" },
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
