"use client";

import { useState } from "react";
import { findItem, RARITY_COLORS } from "@/domain/items";
import { getRepo, useMyData } from "@/data/hooks";
import { HeroFigure } from "../HeroFigure";
import { ItemIcon } from "../ItemIcon";
import { FxImg, FxRays } from "./FxImg";
import { sfx } from "./sound";

/**
 * オーラ入手の演出。1つずつ表示し、まとった姿をその場でプレビューできる。
 */
export function ItemGet({ ids, onClose, heading }: { ids: string[]; onClose: () => void; heading?: string }) {
  const me = useMyData();
  const [i, setI] = useState(0);
  const [equipped, setEquipped] = useState<Record<string, boolean>>({});
  const item = findItem(ids[i]);
  if (!item || !me) return null;
  const rc = RARITY_COLORS[item.rarity];
  const isOn = equipped[item.id] || me.profile.aura === item.id;
  const last = i === ids.length - 1;

  return (
    <div className="fixed inset-0 z-[55] grid place-items-center overflow-hidden bg-black/85 p-6" role="dialog" aria-modal>
      <FxRays />
      <div key={item.id} className="relative w-full max-w-sm text-center">
        <FxImg name="logo_itemget" alt="ITEM GET!" className="mq-stamp-center mx-auto w-60 drop-shadow-[0_0_20px_rgba(255,181,71,0.8)]" />
        {heading && <p className="mt-1 text-sm font-bold text-ink">{heading}</p>}
        {ids.length > 1 && (
          <p className="font-num text-xs text-sub">
            {i + 1} / {ids.length}
          </p>
        )}
        <div className="relative mx-auto mt-2 h-60 w-44">
          <HeroFigure c={{ ...me.character, pump: 1.02 }} aura={item.id} className="h-full w-full" />
          <div className="mq-pop absolute -right-6 top-2">
            <ItemIcon id={item.id} size={64} />
          </div>
        </div>
        <div className="mq-pop mt-2 rounded-2xl border bg-panel/90 p-3" style={{ borderColor: `${rc}88` }}>
          <p className="text-xs">
            <span className="mr-1.5 rounded px-1.5 py-0.5 font-num text-[10px] font-bold" style={{ background: `${rc}33`, color: rc }}>
              {item.rarity}
            </span>
            <span className="text-sub">新しいオーラ</span>
          </p>
          <p className="mt-1 text-xl font-black">{item.name}</p>
          <p className="text-[11px] text-sub">{item.description}</p>
        </div>
        <div className="mt-4 grid gap-2">
          <button
            disabled={isOn}
            onClick={async () => {
              await getRepo().setAura(item.id);
              setEquipped((e) => ({ ...e, [item.id]: true }));
              sfx.coin();
            }}
            className="w-full rounded-2xl py-4 text-base font-black text-bg disabled:opacity-60"
            style={{ background: rc, boxShadow: `0 0 30px ${rc}80` }}
          >
            {isOn ? "まとった！" : "今すぐまとう"}
          </button>
          <button
            onClick={() => {
              if (last) onClose();
              else {
                setI(i + 1);
                sfx.chest();
              }
            }}
            className="w-full rounded-xl bg-panel-2 py-3 text-sm"
          >
            {last ? "閉じる" : "次へ ›"}
          </button>
        </div>
      </div>
    </div>
  );
}
