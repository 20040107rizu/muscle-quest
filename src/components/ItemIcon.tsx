"use client";

import { findItem, RARITY_COLORS, type Item } from "@/domain/items";
import { itemIconUrl } from "./heroImages";

/**
 * アイテムのアイコン。画像があれば画像、なければ見た目の種類と色から自動で描く。
 * 枠の色はレア度（N / R / SR / SSR）。
 */
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
      aria-label={locked ? "未入手のアイテム" : item.name}
    >
      {locked ? (
        <span className="font-num font-bold text-sub" style={{ fontSize: size * 0.45 }}>
          ?
        </span>
      ) : item.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={itemIconUrl(item.id)} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 40 40" width={size * 0.82} height={size * 0.82} aria-hidden>
          <Glyph item={item} />
        </svg>
      )}
    </span>
  );
}

function Glyph({ item }: { item: Item }) {
  const c = item.color;
  const c2 = item.color2 ?? "#ffffff";
  const line = { stroke: "#000", strokeOpacity: 0.55, strokeWidth: 1.2 };
  switch (item.look) {
    case "headband":
      return (
        <g>
          <path d="M6 16 Q20 9 34 16 L34 23 Q20 16 6 23Z" fill={c} {...line} />
          <path d="M32 18 l7 5 -3 2Z M32 21 l5 9 -3 0Z" fill={c} {...line} />
          <circle cx="20" cy="17" r="2.6" fill={c2} />
        </g>
      );
    case "crown":
      return (
        <g>
          <path d="M6 30 L6 14 L13 21 L20 8 L27 21 L34 14 L34 30Z" fill={c} stroke="#7a4f12" strokeWidth="1.4" />
          <circle cx="20" cy="24" r="3" fill={c2} />
          <rect x="6" y="28" width="28" height="4" fill="#c8921e" />
        </g>
      );
    case "chain":
    case "fang":
    case "pendant":
      return (
        <g>
          <path d="M8 8 Q8 28 20 28 Q32 28 32 8" fill="none" stroke={item.look === "fang" ? c2 : c} strokeWidth={item.look === "chain" ? 3.5 : 2} strokeDasharray={item.look === "chain" ? "3 1.5" : undefined} />
          {item.look === "fang" && <path d="M17 27 Q20 39 23 38 Q21 32 23 27Z" fill={c} stroke="#5a3a26" strokeWidth="1" />}
          {item.look === "pendant" && (
            <g>
              <circle cx="20" cy="31" r="5.5" fill={c} stroke="#5b6372" />
              <circle cx="20" cy="31" r="3" fill={c2} />
            </g>
          )}
          {item.look === "chain" && <rect x="15" y="26" width="10" height="11" rx="2" fill={c} stroke="#7a4f12" />}
        </g>
      );
    case "cape":
      return (
        <g>
          <path d="M12 6 Q4 20 4 35 Q12 37 20 34 Q28 37 36 35 Q36 20 28 6Z" fill={c} {...line} />
          <path d="M4 35 Q12 37 20 34 Q28 37 36 35" fill="none" stroke={c2} strokeWidth="2.5" />
          <circle cx="13" cy="7" r="2.5" fill={c2} />
          <circle cx="27" cy="7" r="2.5" fill={c2} />
        </g>
      );
    case "wristband":
      return (
        <g>
          <rect x="7" y="12" width="26" height="16" rx="4" fill={c} {...line} />
          <rect x="8" y="14" width="24" height="3" rx="1.5" fill="#fff" opacity="0.3" />
          {item.color2 && <rect x="7" y="21" width="26" height="3" fill={c2} />}
        </g>
      );
    case "dumbbell":
      return (
        <g>
          <rect x="10" y="18" width="20" height="4" fill={c2} {...line} />
          <rect x="4" y="10" width="7" height="20" rx="2" fill={c} {...line} />
          <rect x="29" y="10" width="7" height="20" rx="2" fill={c} {...line} />
        </g>
      );
    case "kettlebell":
      return (
        <g>
          <path d="M13 16 Q13 5 20 5 Q27 5 27 16" fill="none" stroke={c} strokeWidth="3.5" />
          <circle cx="20" cy="25" r="11" fill={c} {...line} />
          <rect x="14" y="26" width="12" height="3" rx="1" fill={c2} />
        </g>
      );
    case "belt":
    case "champion":
      return (
        <g>
          <rect x="2" y="15" width="36" height="10" rx="2" fill={c} {...line} />
          {item.look === "champion" ? (
            <g>
              <ellipse cx="20" cy="20" rx="9" ry="10" fill={c2} stroke="#7a4f12" strokeWidth="1.2" />
              <circle cx="20" cy="20" r="4" fill="#ff5d6c" />
            </g>
          ) : (
            <rect x="15" y="13" width="10" height="14" rx="2" fill="none" stroke={c2} strokeWidth="2.5" />
          )}
        </g>
      );
    case "recolor":
    case "camo":
      if (item.slot === "shoes") {
        return (
          <g>
            <path d="M4 26 Q4 18 12 18 L18 18 Q22 24 34 26 Q37 27 37 30 L37 32 L4 32Z" fill={c} {...line} />
            <rect x="4" y="30" width="33" height="3" fill={c2} />
          </g>
        );
      }
      return (
        <g>
          <path d="M8 8 H32 L35 32 H22 L20 20 L18 32 H5Z" fill={item.look === "camo" ? "#4b5a2e" : c} {...line} />
          {item.look === "camo" && <path d="M10 14 q4 -3 7 1 t-3 5Z M24 22 q5 -2 7 3 t-6 3Z" fill="#2f3a1c" />}
          <rect x="8" y="8" width="24" height="4" fill={c2} />
        </g>
      );
    case "aura":
      return (
        <g>
          <path d="M20 4 Q28 14 26 22 Q34 18 33 10 Q40 22 30 34 Q20 40 10 34 Q0 22 7 10 Q6 18 14 22 Q12 14 20 4Z" fill={c} opacity="0.9" />
          <path d="M20 14 Q25 22 22 30 Q20 33 18 30 Q15 22 20 14Z" fill="#fff" opacity="0.6" />
        </g>
      );
  }
}
