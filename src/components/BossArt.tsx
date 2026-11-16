"use client";

import { findDungeon } from "@/domain/quests";
import { bossImageUrl } from "./bossImages";

/** ボスの絵。画像があれば画像、なければ絵文字 */
export function BossArt({
  dungeonId,
  floor,
  size,
  className = "",
  dim = false,
}: {
  dungeonId: string;
  floor: number;
  size: number;
  className?: string;
  /** 未到達（シルエット表示） */
  dim?: boolean;
}) {
  const f = findDungeon(dungeonId)?.floors[floor];
  const src = bossImageUrl(dungeonId, floor);
  if (!f) return null;
  if (!src) {
    return (
      <span className={`inline-grid place-items-center leading-none ${dim ? "opacity-30 grayscale" : ""} ${className}`} style={{ width: size, height: size, fontSize: size * 0.8 }} aria-hidden>
        {f.emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={f.boss}
      width={size}
      height={size}
      draggable={false}
      className={`select-none object-contain ${dim ? "brightness-0 opacity-40" : "drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)]"} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
