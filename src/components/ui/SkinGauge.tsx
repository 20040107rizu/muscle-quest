import type { CSSProperties, ReactNode } from "react";
import { assetUrl } from "../assets";

/**
 * 画像生成AIが描いたゲージ（public/ui/gauge_*）。枠と中身の両端は丸いまま、真ん中だけ伸ばす。
 * xp: 経験値 / hp: ボスの体力 / ms: ミッションや撃破条件の進み具合
 */
export type GaugeKind = "xp" | "hp" | "ms";

/** 元画像（高さ64px）での両端の幅 */
const FRAME_CAP: Record<GaugeKind, number> = { xp: 32, hp: 40, ms: 32 };

export function SkinGauge({
  kind,
  value,
  h = 14,
  shimmer = false,
  className = "",
  style,
  fillClassName = "",
  children,
}: {
  kind: GaugeKind;
  /** 0〜1 */
  value: number;
  /** 高さ（px） */
  h?: number;
  shimmer?: boolean;
  className?: string;
  style?: CSSProperties;
  fillClassName?: string;
  children?: ReactNode;
}) {
  const v = Math.max(0, Math.min(1, value || 0));
  const fc = (FRAME_CAP[kind] * h) / 64;
  const inset = Math.round(h * 0.17);
  const ih = h - inset * 2;
  const cap = ih / 2;
  return (
    <div className={`relative ${className}`} style={{ height: h, ...style }}>
      <div
        className="absolute inset-0"
        style={{
          borderStyle: "solid",
          borderWidth: `0 ${fc}px`,
          borderImage: `url(${assetUrl(`ui/gauge_${kind}_frame.webp`)}) 0 ${FRAME_CAP[kind]} fill / 0 ${fc}px stretch`,
        }}
      />
      {v > 0 && (
        <div className="absolute" style={{ top: inset, bottom: inset, left: inset, right: inset }}>
          <div
            className={`relative h-full overflow-hidden rounded-full transition-[width] duration-700 ${fillClassName}`}
            style={{
              width: `calc(${ih}px + (100% - ${ih}px) * ${v})`,
              borderStyle: "solid",
              borderWidth: `0 ${cap}px`,
              borderImage: `url(${assetUrl(`ui/gauge_${kind}_fill.webp`)}) 0 32 fill / 0 ${cap}px stretch`,
            }}
          >
            {shimmer && <div className="mq-shimmer absolute inset-0 rounded-full" />}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
