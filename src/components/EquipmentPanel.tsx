"use client";

import { useState } from "react";
import { GEAR_SLOTS, ITEMS, RARITY_COLORS, SLOT_LABELS, findItem, type Gear, type GearSlot } from "@/domain/items";
import { itemSourceLabel, TITLES } from "@/domain/quests";
import { getRepo } from "@/data/hooks";
import { sfx } from "./fx/sound";
import { ItemIcon } from "./ItemIcon";
import { Card } from "./ui/primitives";

/** 称号と装備の着せ替え。部位を選んで、持っているアイテムをタップすると体に装着される */
export function EquipmentPanel({ gear, titleId, ownedItems, ownedTitles }: { gear: Gear; titleId?: string; ownedItems: string[]; ownedTitles: string[] }) {
  const [err, setErr] = useState("");
  const [slot, setSlot] = useState<GearSlot>("head");
  const [peek, setPeek] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    try {
      setErr("");
      await fn();
      sfx.tap();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const items = ITEMS.filter((i) => i.slot === slot);
  const ownedCount = ITEMS.filter((i) => ownedItems.includes(i.id)).length;
  const peekItem = findItem(peek ?? undefined);

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
        <div className="mb-2 flex items-end justify-between">
          <p className="text-sm font-bold">装備</p>
          <p className="font-num text-xs text-sub">
            図鑑 {ownedCount}/{ITEMS.length}
          </p>
        </div>

        {/* 部位タブ（装備中のアイコン付き） */}
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">
          {GEAR_SLOTS.map((s) => {
            const eq = gear[s];
            const hasNew = ITEMS.some((i) => i.slot === s && ownedItems.includes(i.id));
            return (
              <button
                key={s}
                onClick={() => {
                  setSlot(s);
                  setPeek(null);
                }}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 ${slot === s ? "bg-panel-2 ring-1 ring-accent-2" : ""}`}
              >
                {eq ? <ItemIcon id={eq} size={34} /> : <span className={`grid size-[34px] place-items-center rounded-lg border border-dashed text-[10px] ${hasNew ? "border-accent-2/60 text-accent-2" : "border-line text-sub"}`}>{hasNew ? "+" : "—"}</span>}
                <span className={`text-[10px] ${slot === s ? "font-bold text-ink" : "text-sub"}`}>{SLOT_LABELS[s]}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {items.map((it) => {
            const owned = ownedItems.includes(it.id);
            const on = gear[slot] === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  setPeek(it.id);
                  if (owned) run(() => getRepo().equipItem(slot, on ? null : it.id));
                }}
                className={`flex flex-col items-center gap-1 rounded-xl p-1.5 ${on ? "bg-accent-2/15 ring-2 ring-accent-2" : peek === it.id ? "bg-panel-2" : ""}`}
              >
                <ItemIcon id={it.id} size={52} locked={!owned} />
                <span className={`line-clamp-2 text-center text-[10px] leading-tight ${owned ? "" : "text-sub/60"}`}>{owned ? it.name : "？？？"}</span>
              </button>
            );
          })}
        </div>

        {peekItem && (
          <div className="mt-3 rounded-xl bg-panel-2 p-3 text-xs">
            <p className="font-bold">
              <span className="mr-1.5 rounded px-1.5 py-0.5 font-num text-[10px]" style={{ background: `${RARITY_COLORS[peekItem.rarity]}33`, color: RARITY_COLORS[peekItem.rarity] }}>
                {peekItem.rarity}
              </span>
              {ownedItems.includes(peekItem.id) ? peekItem.name : "？？？"}
            </p>
            <p className="mt-1 text-sub">{ownedItems.includes(peekItem.id) ? peekItem.description : `入手方法: ${itemSourceLabel(peekItem)}`}</p>
          </div>
        )}
        <p className="mt-2 text-[10px] text-sub">ボスを倒す・レベルを上げる・連続で運動するとアイテムが手に入ります。持っているアイテムをタップすると体に装着されます（もう一度タップで外す）。</p>
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
    </Card>
  );
}
