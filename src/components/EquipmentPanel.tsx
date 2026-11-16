"use client";

import { useState } from "react";
import { GEAR_SLOTS, ITEMS, SLOT_LABELS, type Gear } from "@/domain/items";
import { TITLES } from "@/domain/quests";
import { getRepo } from "@/data/hooks";
import { Card } from "./ui/primitives";

/** 獲得した称号・アイテムの装備切り替え */
export function EquipmentPanel({ gear, titleId, ownedItems, ownedTitles }: { gear: Gear; titleId?: string; ownedItems: string[]; ownedTitles: string[] }) {
  const [err, setErr] = useState("");
  const run = async (fn: () => Promise<void>) => {
    try {
      setErr("");
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Card className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-bold">称号</p>
        <div className="flex flex-wrap gap-1.5">
          {TITLES.map((t) => {
            const owned = ownedTitles.includes(t.id);
            const on = titleId === t.id;
            return (
              <button
                key={t.id}
                disabled={!owned}
                onClick={() => run(() => getRepo().setTitle(on ? null : t.id))}
                className={`rounded-full px-3 py-1.5 text-xs font-bold ${on ? "bg-accent-2 text-bg" : owned ? "bg-panel-2 text-ink" : "bg-panel-2/50 text-sub/50"}`}
              >
                {owned ? `【${t.name}】` : "？？？"}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold">装備</p>
        <div className="space-y-2">
          {GEAR_SLOTS.map((slot) => {
            const items = ITEMS.filter((i) => i.slot === slot);
            return (
              <div key={slot} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-sub">{SLOT_LABELS[slot]}</span>
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {items.map((it) => {
                    const owned = ownedItems.includes(it.id);
                    const on = gear[slot] === it.id;
                    return (
                      <button
                        key={it.id}
                        disabled={!owned}
                        title={owned ? it.description : "クエストで入手"}
                        onClick={() => run(() => getRepo().equipItem(slot, on ? null : it.id))}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${on ? "border-accent-2 bg-accent-2/15 font-bold" : owned ? "border-line bg-panel-2" : "border-transparent bg-panel-2/50 text-sub/60"}`}
                      >
                        <span className="inline-block size-2.5 rounded-full" style={{ background: owned ? it.color : "#3a3f4a" }} />
                        {owned ? it.name : "未入手"}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-sub">アイテムはクエストのダンジョンを踏破すると手に入ります。タップで装備・解除。</p>
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
    </Card>
  );
}
