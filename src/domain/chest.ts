/**
 * 毎日の宝箱。その日に1回でも運動すると開けられる（1日1回）。
 * 中身は日付と本人のコードから決まるので、開け直しても変わらない（引き直し不可）。
 */
export type ChestTier = "normal" | "rare" | "jackpot";

export const CHEST_TIER_LABELS: Record<ChestTier, string> = {
  normal: "宝箱",
  rare: "レア宝箱！",
  jackpot: "大当たり！！",
};

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 宝箱の中身（大当たり 5%・レア 25%・通常 70%） */
export function rollChest(seed: string, date: string): { tier: ChestTier; xp: number } {
  const r = hash(`chest:${seed}:${date}`) / 4294967296;
  const r2 = hash(`chest-xp:${seed}:${date}`) / 4294967296;
  if (r < 0.05) return { tier: "jackpot", xp: 300 };
  if (r < 0.3) return { tier: "rare", xp: 100 + Math.round(r2 * 5) * 10 };
  return { tier: "normal", xp: 30 + Math.round(r2 * 3) * 10 };
}

export function chestEventId(date: string) {
  return `bonus:chest:${date}`;
}
