"use client";

import type { CharacterState } from "@/domain/character";
import { STAT_KEYS, STAT_LABELS, type StatKey } from "@/domain/types";
import { STAT_COLORS } from "./ui/primitives";

/** 部位別の発達度。発達度は経験値の飽和曲線なので、序盤ほど伸びを実感しやすい */
export function StatBars({ c, onSelect, selected }: { c: CharacterState; onSelect?: (k: StatKey) => void; selected?: StatKey | null }) {
  return (
    <div className="space-y-2">
      {STAT_KEYS.map((k) => {
        const dev = k === "cardio" ? c.cardio : c.dev[k];
        const rank = Math.min(10, Math.floor(dev * 10) + 1);
        return (
          <button
            key={k}
            type="button"
            onClick={() => onSelect?.(k)}
            className={`flex w-full items-center gap-2 rounded-lg px-1 py-0.5 text-left ${selected === k ? "bg-white/5" : ""}`}
          >
            <span className="w-8 text-xs font-bold" style={{ color: STAT_COLORS[k] }}>
              {STAT_LABELS[k]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(2, dev * 100)}%`, background: STAT_COLORS[k] }} />
            </div>
            <span className="w-12 text-right font-num text-xs text-sub">Rank {rank}</span>
            <span className="w-14 text-right font-num text-xs">{c.stats[k].toLocaleString()}</span>
          </button>
        );
      })}
    </div>
  );
}
