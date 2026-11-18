"use client";

import { useState } from "react";
import { findTitle } from "@/domain/quests";
import { THEME_LABELS } from "@/domain/titles";
import { useMyData, wearTitle } from "@/data/hooks";
import { RarityMark } from "../ui/TitlePlate";
import { SkinButton } from "../ui/SkinButton";
import { TitleView } from "../ui/TitleView";
import { useFx } from "./FxLayer";
import { FxRays } from "./FxImg";
import { sfx } from "./sound";

const BURST: Record<string, string[]> = {
  N: ["#c9ccd3", "#ffffff"],
  R: ["#4cc9f0", "#bfe8ff", "#ffffff"],
  SR: ["#b79cff", "#e6d2ff", "#ffffff"],
  SSR: ["#ffd166", "#ff6b2c", "#ffffff"],
  UR: ["#ffd166", "#ff5d8f", "#4cc9f0", "#b79cff", "#ffffff"],
};

/** 称号を手に入れたときの演出。1つずつ表示し、その場でつけられる */
export function TitleGet({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const me = useMyData();
  const { confetti, burst } = useFx();
  const [i, setI] = useState(0);
  const [worn, setWorn] = useState<string | null>(null);
  const t = findTitle(ids[i]);
  if (!t || !me) return null;
  const last = i === ids.length - 1;
  const on = worn === t.id || me.profile.titleId === t.id;
  const big = t.rarity === "SSR" || t.rarity === "UR";

  return (
    <div className="fixed inset-0 z-[56] grid place-items-center overflow-hidden bg-black/85 p-6" role="dialog" aria-modal>
      <FxRays />
      <div key={t.id} className="relative w-full max-w-sm text-center">
        <p className={`mq-stamp-center font-black ${big ? "mq-glow-text text-3xl text-accent-2" : "text-2xl text-ink"}`}>称号を手に入れた！</p>
        {ids.length > 1 && (
          <p className="mt-1 font-num text-xs text-sub">
            {i + 1} / {ids.length}
          </p>
        )}
        <div className="mq-pop mt-5 flex justify-center">
          <TitleView title={t} size="lg" />
        </div>
        <div className="mq-rise mt-4 flex items-center justify-center gap-2 [animation-delay:250ms]">
          <RarityMark rarity={t.rarity} size={30} />
          {t.def && <span className="text-xs text-sub">{THEME_LABELS[t.def.theme]}</span>}
        </div>
        {t.def && (
          <div className="mq-rise mt-2 [animation-delay:350ms]">
            <p className="text-sm italic text-ink/90">「{t.def.flavor}」</p>
            <p className="mt-1 text-[11px] text-sub">{t.def.howToGet}</p>
          </div>
        )}
        <div className="mt-6 grid gap-2">
          <SkinButton
            variant="gold"
            disabled={on}
            onClick={async () => {
              await wearTitle(t.id);
              setWorn(t.id);
              sfx.coin();
            }}
            className="h-14 w-full text-base"
          >
            {on ? "つけた！" : "今すぐつける"}
          </SkinButton>
          <SkinButton
            variant="gray"
            onClick={() => {
              if (last) return onClose();
              setI(i + 1);
              sfx.levelUp();
              const nt = findTitle(ids[i + 1]);
              confetti(nt && (nt.rarity === "SSR" || nt.rarity === "UR") ? 220 : 120);
              burst(innerWidth / 2, innerHeight * 0.4, { count: 60, power: 1.6, colors: BURST[nt?.rarity ?? "N"] });
            }}
            className="h-12 w-full text-sm"
          >
            {last ? "閉じる" : "次の称号 ›"}
          </SkinButton>
        </div>
      </div>
    </div>
  );
}

/** 演出の始まりの紙吹雪（レア度が高いほど派手） */
export function titleGetBurst(rarity: string, fx: ReturnType<typeof useFx>) {
  fx.confetti(rarity === "SSR" || rarity === "UR" ? 220 : 120);
  fx.burst(innerWidth / 2, innerHeight * 0.4, { count: 60, power: 1.6, colors: BURST[rarity] ?? BURST.N });
}
