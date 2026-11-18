import type { HeroType } from "@/domain/character";
import { assetUrl } from "./assets";
import GEAR_LAYERS from "./gearLayers.json";

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

// ---------- 装備レイヤー（scripts/assets/import_gear.py で生成） ----------

const LAYERS = GEAR_LAYERS as unknown as Record<string, Record<string, [number, number, number, number]>>;

/** 装備の絵が1枚でも届いているか（オーラは演出画像を使うので常に true） */
export function hasGearArt(itemId: string): boolean {
  return itemId.startsWith("aura_") || !!LAYERS[itemId];
}

/** その体の画像用の装備レイヤー。rect は主人公の画像のピクセル単位 [x, y, 幅, 高さ] */
export function gearLayer(itemId: string, bodyName: string): { url: string; rect: [number, number, number, number] } | null {
  const r = LAYERS[itemId]?.[bodyName];
  return r ? { url: assetUrl(`gear/${itemId}/${bodyName}.webp`), rect: r } : null;
}
