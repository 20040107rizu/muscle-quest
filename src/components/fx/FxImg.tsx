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

/**
 * レベルアップ・宝箱などの背景で回る光（画像生成AIが作った rays の画像だけを使う）。
 * 画面の真ん中に、画面いっぱいにはしない大きさで出す。
 */
export function FxRays() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
      <FxImg name="rays" alt="" className="mq-spin w-[80vmin] max-w-[560px] opacity-70" />
    </div>
  );
}

/** 称号プレートなど、ひとつのものの後ろだけで回る光 */
export function FxRaysBehind({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`} aria-hidden>
      <FxImg name="rays" alt="" className="mq-spin w-full opacity-75" />
    </div>
  );
}
