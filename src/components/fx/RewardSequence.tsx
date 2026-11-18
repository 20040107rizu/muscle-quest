"use client";

import { useEffect, useRef, useState } from "react";
import { tierFor } from "@/domain/character";
import type { SaveResult } from "@/data/repository";
import { useMyData } from "@/data/hooks";
import { HeroFigure } from "../HeroFigure";
import { StatChips } from "../ui/primitives";
import { useFx } from "./FxLayer";
import { sfx } from "./sound";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 記録後のご褒美演出。
 * XPカウントアップ → 会心 → 自己ベスト → 部位チップ → レベルアップ/進化 の順に畳みかける。
 * 画面をタップすると演出を飛ばして結果をすぐ表示する。
 */
export function RewardSequence({ r, title, onClose }: { r: SaveResult; title: string; onClose: () => void }) {
  const me = useMyData();
  const { burst, confetti, shake } = useFx();
  const crit = r.critXp ?? 0;
  const pr = r.prXp ?? 0;
  const total = r.xpGained + crit + pr;
  const leveled = r.levelAfter > r.levelBefore;
  const evolved = tierFor(r.levelAfter).name !== tierFor(r.levelBefore).name;

  const [xp, setXp] = useState(0);
  const [showCrit, setShowCrit] = useState(false);
  const [showPR, setShowPR] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [levelView, setLevelView] = useState(false);
  const [done, setDone] = useState(false);
  const skipped = useRef(false);
  const card = useRef<HTMLDivElement>(null);

  const center = () => {
    const b = card.current?.getBoundingClientRect();
    return b ? { x: b.left + b.width / 2, y: b.top + b.height * 0.35 } : { x: innerWidth / 2, y: innerHeight / 2 };
  };

  async function countTo(from: number, to: number, ms: number) {
    const steps = Math.max(1, Math.min(24, to - from));
    for (let i = 1; i <= steps; i++) {
      if (skipped.current) return;
      setXp(Math.round(from + ((to - from) * i) / steps));
      sfx.tick(i);
      await wait(ms / steps);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      sfx.coin();
      await countTo(0, r.xpGained, 650);
      if (crit && alive && !skipped.current) {
        await wait(220);
        setShowCrit(true);
        sfx.crit();
        shake(1.6);
        const c = center();
        burst(c.x, c.y, { count: 46, power: 1.5, colors: ["#ffd166", "#ff6b2c", "#ffffff", "#ff5d6c"] });
        await countTo(r.xpGained, r.xpGained + crit, 380);
      }
      if (pr && alive && !skipped.current) {
        await wait(260);
        setShowPR(true);
        sfx.pr();
        const c = center();
        burst(c.x, c.y + 60, { count: 36, colors: ["#ffd166", "#ffe9a8", "#e9c25a"] });
        await countTo(r.xpGained + crit, total, 300);
      }
      if (!alive) return;
      setXp(total);
      setShowChips(true);
      if (leveled && !skipped.current) {
        await wait(650);
        if (!alive) return;
        setLevelView(true);
        sfx.levelUp();
        confetti(evolved ? 220 : 140);
        shake(evolved ? 2 : 1.2);
      }
      setDone(true);
    })();
    return () => {
      alive = false;
    };
    // 1回だけ再生する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function skip() {
    if (done) return;
    skipped.current = true;
    setXp(total);
    setShowCrit(!!crit);
    setShowPR(!!pr);
    setShowChips(true);
    if (leveled && !levelView) {
      setLevelView(true);
      sfx.levelUp();
      confetti(120);
    }
    setDone(true);
  }

  if (levelView) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/85 p-6" role="dialog" aria-modal onClick={done ? onClose : skip}>
        <div className="mq-rays pointer-events-none absolute left-1/2 top-1/2 size-[180vmax] -translate-x-1/2 -translate-y-1/2" aria-hidden />
        <div className="relative w-full max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
          <p className="mq-stamp font-num text-6xl font-bold italic tracking-tight text-transparent [-webkit-text-stroke:1px_#fff3] bg-gradient-to-b from-[#fff6c8] via-accent-2 to-accent bg-clip-text drop-shadow-[0_0_24px_rgba(255,181,71,0.8)]">
            LEVEL UP!
          </p>
          <p className="mq-pop mt-2 font-num text-7xl font-bold [animation-delay:200ms]">
            <span className="text-sub">{r.levelBefore}</span>
            <span className="mx-3 text-4xl text-accent-2">▶</span>
            <span className="mq-glow-text text-white">{r.levelAfter}</span>
          </p>
          {evolved && me && (
            <div className="mq-rise mt-3 [animation-delay:500ms]">
              <p className="mq-glow-text text-2xl font-black text-accent-2">進化!! {tierFor(r.levelAfter).name}</p>
              <p className="text-xs text-sub">{tierFor(r.levelAfter).title}</p>
              <HeroFigure c={{ ...me.character, level: r.levelAfter, pump: 1.04 }} gear={me.profile.gear} glow className="mx-auto mt-2 h-64 w-48" />
            </div>
          )}
          <p className="mt-4 font-num text-2xl font-bold text-accent">+{total} XP</p>
          <button className="mt-5 w-full rounded-2xl bg-accent-2 py-4 text-base font-black text-bg shadow-[0_0_30px_rgba(255,181,71,0.6)]" onClick={onClose}>
            やったぜ！
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm" onClick={done ? onClose : skip} role="dialog" aria-modal>
      <div ref={card} className="mq-pop relative w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-panel p-6 text-center" onClick={(e) => { e.stopPropagation(); skip(); }}>
        {(r.comboToday ?? 0) >= 2 && (
          <p className="mq-pop absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 font-num text-xs font-bold italic text-white">{r.comboToday} COMBO!</p>
        )}
        <p className="text-sm font-bold text-sub">{title}</p>

        <div className="relative mt-2">
          <p className={`font-num text-6xl font-bold tabular-nums ${showCrit ? "mq-glow-text text-accent-2" : "text-ink"}`}>
            +{xp}
            <span className="ml-1 text-xl text-sub">XP</span>
          </p>
          {showCrit && (
            <p className="mq-stamp pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 -rotate-12 whitespace-nowrap rounded-lg border-2 border-accent bg-bg/80 px-3 py-0.5 text-2xl font-black italic text-accent">
              会心！×1.5
            </p>
          )}
        </div>

        {showPR && (
          <div className="mq-rise mt-3 rounded-xl bg-gradient-to-r from-[#7a5a12] via-[#e9c25a] to-[#7a5a12] px-3 py-2 text-bg">
            <p className="text-sm font-black">🏆 自己ベスト更新!! +{pr}XP</p>
            {r.prLabel && <p className="text-[10px] font-bold opacity-80">{r.prLabel}</p>}
          </div>
        )}

        <div className={`mt-3 flex justify-center transition-opacity duration-300 ${showChips ? "opacity-100" : "opacity-0"}`}>
          <StatChips byStat={r.byStat} />
        </div>
        {showChips && r.capped && <p className="mt-3 text-xs text-accent-2">本日の獲得上限に達したため一部のみ反映されました</p>}
        {showChips && r.xpGained === 0 && !r.capped && <p className="mt-3 text-xs text-sub">同じ種目のやりすぎで経験値が逓減しています</p>}

        <button className={`mt-5 w-full rounded-xl bg-accent py-3 text-sm font-bold text-white transition-opacity ${done ? "opacity-100" : "opacity-40"}`} onClick={(e) => { e.stopPropagation(); if (done) onClose(); else skip(); }}>
          {done ? "OK" : "スキップ"}
        </button>
      </div>
    </div>
  );
}
