"use client";

import { heroStage, heroType, type CharacterState } from "@/domain/character";
import { findItem } from "@/domain/items";
import ANCHORS from "./heroAnchors.json";
import { fxUrl, heroImage } from "./heroImages";

/**
 * 主人公の表示（イラスト＋体の後ろのオーラ）。
 * - レベル → 進化段階、いちばん鍛えている部位 → 体型タイプ で体の画像を選ぶ
 * - 鍛えた日はパンプ（少し大きく）、4日以上休むとしぼむ（小さく・くすむ）
 */
interface Anchor {
  w: number;
  h: number;
  cx: number;
}
const ANCHOR_MAP = ANCHORS as unknown as Record<string, Anchor>;

export function HeroFigure({
  c,
  aura: auraId,
  className = "",
  glow = false,
}: {
  c: Pick<CharacterState, "level" | "stats" | "pump" | "daysSinceActive">;
  /** まとっているオーラ（アイテムID） */
  aura?: string;
  className?: string;
  glow?: boolean;
}) {
  const img = heroImage(heroType(c.stats), heroStage(c.level));
  const a = ANCHOR_MAP[img.name];
  const aura = findItem(auraId);
  const shrunk = c.pump < 1;

  // 縦横はアンカー情報（体の画像のピクセルサイズ）から。無い場合は一般的な比率
  const W = a?.w ?? 180;
  const H = a?.h ?? 520;
  const cx = (a?.cx ?? 0.5) * W;
  const showAura = glow || !!aura;
  const auraColor = aura ? { aura_wind: "#4cc9f0", aura_flame: "#ff6b2c", aura_purple: "#b79cff", aura_gold: "#ffd166" }[aura.id] ?? "#ff6b2c" : "#ff6b2c";

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="h-full w-full overflow-visible" role="img" aria-label="あなたのキャラクター">
        <defs>
          <radialGradient id={`aura-${img.name}-${auraColor}`} cx="0.5" cy="0.45" r="0.5">
            <stop offset="0" stopColor={auraColor} stopOpacity={aura ? 0.5 : 0.4} />
            <stop offset="0.6" stopColor={auraColor} stopOpacity={aura ? 0.22 : 0.12} />
            <stop offset="1" stopColor={auraColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        {showAura && <ellipse className="mq-aura" cx={cx} cy={H * 0.48} rx={W * 0.75} ry={H * 0.55} fill={`url(#aura-${img.name}-${auraColor})`} />}
        {aura && <image className="mq-aura" href={fxUrl(aura.id)} x={cx - W * 0.68} y={-H * 0.05} width={W * 1.36} height={H * 1.07} preserveAspectRatio="none" opacity={0.95} />}
        <ellipse cx={cx} cy={H - H * 0.008} rx={W * 0.38} ry={H * 0.012} fill="#000" opacity={0.45} />

        <g className="mq-breathe-svg" style={{ transformOrigin: `${cx}px ${H}px` }}>
          <g style={{ transform: `scale(${c.pump})`, transformOrigin: `${cx}px ${H}px`, filter: shrunk ? "saturate(0.75) brightness(0.9)" : undefined }}>
            <image href={img.url} x="0" y="0" width={W} height={H} />
          </g>
        </g>
      </svg>
    </div>
  );
}
