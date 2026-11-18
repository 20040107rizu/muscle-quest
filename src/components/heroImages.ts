import type { HeroType } from "@/domain/character";
import { assetUrl } from "./assets";

/**
 * 主人公の体の画像（public/hero/{タイプ}_{段階}.webp）。
 * まだ用意できていないタイプ・段階はバランス型で代わりに表示する。
 */
const AVAILABLE: Partial<Record<HeroType, number[]>> = {
  balance: [1, 2, 3, 4, 5, 6],
  chest: [2, 3, 4, 5, 6],
  back: [2, 3, 4, 5, 6],
  shoulder: [2, 3, 4, 5, 6],
  arm: [2, 3, 4, 5, 6],
  leg: [2, 3, 4, 5, 6],
  core: [2, 3, 4, 5, 6],
  runner: [2, 3, 4, 5, 6],
};

export function heroImage(type: HeroType, stage: number): { url: string; name: string; type: HeroType; fallback: boolean } {
  const ok = AVAILABLE[type]?.includes(stage);
  const t: HeroType = ok ? type : "balance";
  const name = `${t}_${stage}`;
  return { url: assetUrl(`hero/${name}.webp`), name, type: t, fallback: !ok && type !== "balance" && stage > 1 };
}

export function itemIconUrl(itemId: string): string {
  return assetUrl(`items/${itemId}.webp`);
}

/** 演出用の画像（public/fx） */
export function fxUrl(name: string): string {
  return assetUrl(`fx/${name}.webp`);
}
