"use client";

import { useRef, useState } from "react";
import { CHEST_TIER_LABELS, chestEventId, rollChest, type ChestTier } from "@/domain/chest";
import type { SaveResult } from "@/data/repository";
import { getRepo } from "@/data/hooks";
import { FxImg, FxRays } from "./fx/FxImg";
import { useFx } from "./fx/FxLayer";
import { sfx } from "./fx/sound";
import { useFeedback } from "./ui/Feedback";
import { SkinButton } from "./ui/SkinButton";

const TIER_COLORS: Record<ChestTier, string[]> = {
  normal: ["#ffd166", "#ffffff"],
  rare: ["#4cc9f0", "#b79cff", "#ffffff"],
  jackpot: ["#ffd166", "#ff6b2c", "#ff5d6c", "#ffffff", "#b79cff"],
};

/** ホームの「毎日の宝箱」。その日に1回運動すると開けられる */
export function DailyChest({ today, friendCode, moved, opened }: { today: string; friendCode: string; moved: boolean; opened: boolean }) {
  const { burst, confetti, shake } = useFx();
  const { showResult } = useFeedback();
  const [res, setRes] = useState<SaveResult | null>(null);
  const [err, setErr] = useState("");
  const btn = useRef<HTMLButtonElement>(null);
  const done = opened && !res;
  const result = rollChest(friendCode, today);

  async function open() {
    if (!moved || opened) return;
    const r = await getRepo().openDailyChest(today);
    if (!r.ok) return setErr(r.errors[0] ?? "開けられませんでした");
    setRes(r);
    sfx.chest();
    const tier = r.chest?.tier ?? "normal";
    confetti(tier === "jackpot" ? 260 : tier === "rare" ? 160 : 90);
    shake(tier === "jackpot" ? 2 : 1.2);
    setTimeout(() => burst(innerWidth / 2, innerHeight * 0.42, { count: tier === "jackpot" ? 90 : 50, power: 1.8, colors: TIER_COLORS[tier] }), 50);
  }

  return (
    <>
      <button
        ref={btn}
        onClick={open}
        disabled={!moved || opened}
        className={`${moved && !opened ? "skin-card-hot" : "skin-card"} flex w-full items-center gap-3 p-3 text-left`}
      >
        <FxImg name={opened ? "chest_open" : "chest_closed"} alt="" className={`size-14 shrink-0 ${moved && !opened ? "mq-chest-shake" : opened ? "" : "opacity-50 grayscale"}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-sub">毎日の宝箱</p>
          {done ? (
            <p className="font-bold">
              今日の中身：{CHEST_TIER_LABELS[result.tier]} <span className="font-num text-accent">+{result.xp}経験値</span>
            </p>
          ) : moved ? (
            <p className="mq-pulse-soft font-bold text-accent-2">タップして開けろ！</p>
          ) : (
            <p className="font-bold">今日1回運動すると開けられる</p>
          )}
          <p className="text-[10px] text-sub">{done ? "また明日。毎日開けて差をつけよう" : "まれに大当たり（300経験値）が出る"}</p>
          {err && <p className="text-[10px] text-bad">{err}</p>}
        </div>
      </button>

      {res?.chest && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/85 p-6" role="dialog" aria-modal>
          <FxRays />
          <div className="relative w-full max-w-sm text-center">
            <FxImg name="chest_open" alt="" className="mq-pop mx-auto h-44 w-52 drop-shadow-[0_0_30px_rgba(255,209,102,0.9)]" />
            <p className={`mq-stamp-center mt-2 font-black ${res.chest.tier === "jackpot" ? "mq-glow-text text-4xl text-accent-2" : res.chest.tier === "rare" ? "text-3xl text-cardio" : "text-2xl text-ink"}`}>
              {CHEST_TIER_LABELS[res.chest.tier]}
            </p>
            <p className="mq-pop mt-2 font-num text-5xl font-bold text-accent [animation-delay:200ms]">+{res.chest.xp}</p>
            <p className="text-sm text-sub">経験値</p>
            <SkinButton
              variant="gold"
              className="mt-6 h-14 w-full text-base"
              onClick={() => {
                const r = res;
                setRes(null);
                // レベルが上がったときは、いつものレベルアップ演出につなぐ
                if (r.levelAfter > r.levelBefore) showResult({ ...r, xpGained: r.chest!.xp }, "宝箱を開けた！");
              }}
            >
              受け取る
            </SkinButton>
          </div>
        </div>
      )}
    </>
  );
}

export function chestOpened(xpEvents: { id: string }[], today: string) {
  return xpEvents.some((e) => e.id === chestEventId(today));
}
