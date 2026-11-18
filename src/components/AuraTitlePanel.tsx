"use client";

import { useState } from "react";
import { ITEMS, RARITY_COLORS, findItem } from "@/domain/items";
import { itemSourceLabel, TITLES } from "@/domain/quests";
import { getRepo } from "@/data/hooks";
import { sfx } from "./fx/sound";
import { ItemIcon } from "./ItemIcon";
import { Card } from "./ui/primitives";
import { TitlePlate } from "./ui/TitlePlate";

/** 称号と、体の後ろにまとうオーラの切り替え */
export function AuraTitlePanel({ aura, titleId, ownedItems, ownedTitles }: { aura?: string; titleId?: string; ownedItems: string[]; ownedTitles: string[] }) {
  const [err, setErr] = useState("");
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
                className={`rounded-lg p-0.5 ${on ? "ring-2 ring-accent-2" : ""} ${owned ? "" : "opacity-40 grayscale"}`}
              >
                <TitlePlate name={owned ? t.name : "？？？"} rarity={t.rarity} size="sm" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between">
          <p className="text-sm font-bold">オーラ</p>
          <p className="font-num text-xs text-sub">
            {ownedItems.length}/{ITEMS.length}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {ITEMS.map((it) => {
            const owned = ownedItems.includes(it.id);
            const on = aura === it.id;
            return (
              <button
                key={it.id}
                onClick={() => {
                  setPeek(it.id);
                  if (owned) run(() => getRepo().setAura(on ? null : it.id));
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
        <p className="mt-2 text-[10px] text-sub">レベルを上げる・連続で運動する・たくさん走るとオーラが手に入ります。タップでまとう（もう一度タップで外す）。</p>
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
    </Card>
  );
}
