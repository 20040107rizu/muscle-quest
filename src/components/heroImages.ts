import type { HeroType } from "@/domain/character";
import { assetUrl } from "./assets";

/**
 * 主人公の体の画像（public/hero/{タイプ}_{段階}.webp）。
 * まだ用意できていないタイプ・段階はバランス型で代わりに表示する。
 */
const AVAILABLE: Partial<Record<HeroType, number[]>> = {
  balance: [1, 2, 3, 4, 5, 6],
  chest: [2, 3, 4, 5, 6],
};

export function heroImage(type: HeroType, stage: number): { url: string; type: HeroType; fallback: boolean } {
  const ok = AVAILABLE[type]?.includes(stage);
  const t: HeroType = ok ? type : "balance";
  return { url: assetUrl(`hero/${t}_${stage}.webp`), type: t, fallback: !ok && type !== "balance" };
}

export function itemIconUrl(itemId: string): string {
  return assetUrl(`items/${itemId}.webp`);
}
