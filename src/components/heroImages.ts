import type { HeroType } from "@/domain/character";
import { assetUrl } from "./assets";
import HERO_AVAILABLE from "./heroAvailable.json";

/**
 * 主人公の体の画像（public/hero/{タイプ}_{段階}.webp）。
 * まだ用意できていないタイプ・段階はバランス型で代わりに表示する。
 */
/** 絵がある体型と段階（scripts/assets/cut_body_sheets.py で取り込んだもの） */
const AVAILABLE = HERO_AVAILABLE as Record<string, number[]>;

/**
 * 体型の絵。その体型の絵がまだ無いときは、組み合わせの中の部位の絵（先頭から）→ バランス型の順で代わりに使う。
 * ビギナー（段階1）は全員共通の絵。
 */
export function heroImage(type: HeroType, stage: number): { url: string; name: string; type: HeroType; fallback: boolean } {
  const candidates = stage === 1 ? ["balance"] : [type, ...type.split("_"), "balance"];
  const t = candidates.find((c) => AVAILABLE[c]?.includes(stage)) ?? "balance";
  const name = `${t}_${stage}`;
  return { url: assetUrl(`hero/${name}.webp`), name, type: t, fallback: t !== type && stage > 1 };
}

export function itemIconUrl(itemId: string): string {
  return assetUrl(`items/${itemId}.webp`);
}

/** 演出用の画像（public/fx） */
export function fxUrl(name: string): string {
  return assetUrl(`fx/${name}.webp`);
}
