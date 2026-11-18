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

export function heroImage(type: HeroType, stage: number): { url: string; name: string; type: HeroType; fallback: boolean } {
  const ok = AVAILABLE[type]?.includes(stage);
  const t: HeroType = ok ? type : "balance";
  const name = `${t}_${stage}`;
  return { url: assetUrl(`hero/${name}.webp`), name, type: t, fallback: !ok && type !== "balance" };
}

/** 塗り替え用のマスク画像（scripts/assets/hero_anchors.py で生成） */
export function heroMaskUrl(name: string, part: "shorts" | "band" | "shoes"): string {
  return assetUrl(`hero/masks/${name}_${part}.webp`);
}

export function itemIconUrl(itemId: string): string {
  return assetUrl(`items/${itemId}.webp`);
}
