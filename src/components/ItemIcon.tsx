"use client";

import { findItem, RARITY_COLORS } from "@/domain/items";
import { itemIconUrl } from "./heroImages";

/** オーラのアイコン。枠の色はレア度（N / R / SR / SSR）。 */
export function ItemIcon({ id, size = 40, locked = false, className = "" }: { id: string; size?: number; locked?: boolean; className?: string }) {
  const item = findItem(id);
  if (!item) return null;
  const rc = RARITY_COLORS[item.rarity];
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-lg ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 50% 35%, ${rc}33, #14171d 75%)`,
        boxShadow: `inset 0 0 0 ${Math.max(1, size / 28)}px ${rc}${locked ? "55" : "cc"}${item.rarity === "SSR" && !locked ? `, 0 0 ${size / 4}px ${rc}88` : ""}`,
      }}
      aria-label={locked ? "未入手のオーラ" : item.name}
    >
      {locked ? (
        <span className="font-num font-bold text-sub" style={{ fontSize: size * 0.45 }}>
          ?
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={itemIconUrl(item.id)} alt="" width={size} height={size} className="h-full w-full object-contain p-[6%]" />
      )}
    </span>
  );
}

