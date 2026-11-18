"use client";

import { SkinButton } from "./SkinButton";
import { createContext, useCallback, useContext, useState } from "react";
import type { SaveResult } from "@/data/repository";
import { ItemGet } from "../fx/ItemGet";
import { RewardSequence } from "../fx/RewardSequence";
import { sfx } from "../fx/sound";

interface Ctx {
  showResult: (r: SaveResult, title: string) => void;
  /** window.confirm の代わり（スマホでも統一された見た目。埋め込み環境でも動く） */
  confirm: (message: string, opts?: { ok?: string; danger?: boolean }) => Promise<boolean>;
}
const FeedbackCtx = createContext<Ctx>({ showResult: () => {}, confirm: async () => false });

export function useFeedback() {
  return useContext(FeedbackCtx);
}

/** 記録保存後のご褒美演出（RewardSequence）と確認ダイアログ */
export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ r: SaveResult; title: string; key: number } | null>(null);
  const showResult = useCallback((r: SaveResult, title: string) => setState({ r, title, key: Date.now() }), []);
  // ご褒美演出を閉じたあと、新しく手に入ったアイテムがあれば続けて見せる
  const [items, setItems] = useState<string[] | null>(null);
  const close = () => {
    const got = state?.r.newItems ?? [];
    setState(null);
    if (got.length) {
      setItems(got);
      sfx.chest();
    }
  };
  const [ask, setAsk] = useState<{ message: string; ok: string; danger: boolean; resolve: (v: boolean) => void } | null>(null);
  const confirm = useCallback(
    (message: string, opts: { ok?: string; danger?: boolean } = {}) =>
      new Promise<boolean>((resolve) => setAsk({ message, ok: opts.ok ?? "OK", danger: !!opts.danger, resolve })),
    [],
  );
  const answer = (v: boolean) => {
    ask?.resolve(v);
    setAsk(null);
  };

  return (
    <FeedbackCtx.Provider value={{ showResult, confirm }}>
      {children}
      {ask && (
        <div className="fixed inset-0 z-[60] grid place-items-end bg-black/60 p-4 backdrop-blur-sm sm:place-items-center" onClick={() => answer(false)} role="alertdialog" aria-modal>
          <div className="mq-rise w-full max-w-sm skin-dialog p-3" onClick={(e) => e.stopPropagation()}>
            <p className="whitespace-pre-line text-sm leading-relaxed">{ask.message}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <SkinButton variant="gray" className="h-12 w-full text-sm" onClick={() => answer(false)}>
                キャンセル
              </SkinButton>
              <SkinButton variant={ask.danger ? "danger" : "primary"} className="h-12 w-full text-sm" onClick={() => answer(true)} autoFocus>
                {ask.ok}
              </SkinButton>
            </div>
          </div>
        </div>
      )}
      {state && <RewardSequence key={state.key} r={state.r} title={state.title} onClose={close} />}
      {items && <ItemGet ids={items} onClose={() => setItems(null)} />}
    </FeedbackCtx.Provider>
  );
}
