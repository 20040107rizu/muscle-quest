"use client";

import type { CSSProperties } from "react";
import { fxUrl } from "../heroImages";

/** 演出用の画像（ロゴ・宝箱・ヒットエフェクトなど。public/fx） */
export function FxImg({ name, alt, className = "", style }: { name: string; alt: string; className?: string; style?: CSSProperties }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fxUrl(name)} alt={alt} draggable={false} className={`select-none object-contain ${className}`} style={style} aria-hidden={alt ? undefined : true} />
  );
}

/** レベルアップ・宝箱・アイテム入手の背景で回る集中線 */
export function FxRays() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <div className="mq-rays absolute inset-0" />
      <FxImg name="rays" alt="" className="mq-spin absolute left-1/2 top-1/2 w-[70vmin] -translate-x-1/2 -translate-y-1/2 opacity-90" />
    </div>
  );
}
