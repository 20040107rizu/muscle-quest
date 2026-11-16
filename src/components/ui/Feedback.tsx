"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { tierFor } from "@/domain/character";
import type { SaveResult } from "@/data/repository";
import { StatChips } from "./primitives";

interface Ctx {
  showResult: (r: SaveResult, title: string) => void;
}
const FeedbackCtx = createContext<Ctx>({ showResult: () => {} });

export function useFeedback() {
  return useContext(FeedbackCtx);
}

/** 記録保存後の「+XP」「LEVEL UP」「進化」演出 */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ r: SaveResult; title: string; key: number } | null>(null);
  const showResult = useCallback((r: SaveResult, title: string) => setState({ r, title, key: Date.now() }), []);
  const close = () => setState(null);

  const r = state?.r;
  const leveled = r && r.levelAfter > r.levelBefore;
  const evolved = r && tierFor(r.levelAfter).name !== tierFor(r.levelBefore).name;

  return (
    <FeedbackCtx.Provider value={{ showResult }}>
      {children}
      {state && r && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-6 backdrop-blur-sm" onClick={close} role="dialog" aria-modal>
          <div key={state.key} className="mq-pop w-full max-w-sm rounded-3xl border border-line bg-panel p-6 text-center" onClick={(e) => e.stopPropagation()}>
            {leveled ? (
              <>
                <p className="text-xs font-bold tracking-[0.3em] text-accent-2">LEVEL UP</p>
                <p className="mt-1 font-num text-6xl font-bold">
                  <span className="text-sub">{r.levelBefore}</span>
                  <span className="mx-2 text-3xl text-sub">→</span>
                  <span className="bg-gradient-to-b from-accent-2 to-accent bg-clip-text text-transparent">{r.levelAfter}</span>
                </p>
                {evolved && (
                  <p className="mt-2 rounded-xl bg-accent/15 px-3 py-2 text-sm font-bold text-accent">
                    進化！ {tierFor(r.levelBefore).name} → {tierFor(r.levelAfter).name}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm font-bold text-sub">{state.title}</p>
            )}
            <p className="mt-3 font-num text-4xl font-bold text-ink">
              +{r.xpGained}
              <span className="ml-1 text-base text-sub">XP</span>
            </p>
            <div className="mt-3 flex justify-center">
              <StatChips byStat={r.byStat} />
            </div>
            {r.capped && <p className="mt-3 text-xs text-accent-2">本日の獲得上限に達したため一部のみ反映されました</p>}
            {r.xpGained === 0 && !r.capped && <p className="mt-3 text-xs text-sub">同じ種目のやりすぎで経験値が逓減しています</p>}
            <button className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-bold text-white" onClick={close}>
              OK
            </button>
          </div>
        </div>
      )}
    </FeedbackCtx.Provider>
  );
}
