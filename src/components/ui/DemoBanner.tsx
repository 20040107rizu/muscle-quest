"use client";

import { setDemo, useDemo } from "@/data/demo";

/** 見本モード中であることを画面上部に出す（自分の記録とまちがえないように） */
export function DemoBanner() {
  const demo = useDemo();
  if (!demo.on) return null;
  return (
    <div className="sticky top-0 z-40 -mx-4 flex items-center justify-between gap-2 bg-accent-2 px-4 py-1.5 text-xs font-bold text-bg">
      <span>見本モード中（全部そろった状態の表示です）</span>
      <button onClick={() => setDemo(false)} className="shrink-0 rounded-full bg-bg/20 px-2.5 py-0.5">
        終わる
      </button>
    </div>
  );
}

/** マイページの切り替えボタン */
export function DemoToggle() {
  const demo = useDemo();
  return (
    <button onClick={() => setDemo(!demo.on)} className="skin-card flex w-full items-center justify-between px-4 py-3 text-left">
      <span>
        <span className="block text-sm font-bold">見本モード</span>
        <span className="block text-[10px] text-sub">称号・オーラ・ダンジョンが全部そろった状態を見る（自分の記録は変わりません）</span>
      </span>
      <span className={`ml-2 shrink-0 rounded-full px-3 py-1 text-xs font-bold ${demo.on ? "bg-accent-2 text-bg" : "bg-panel-2 text-sub"}`}>{demo.on ? "オン" : "オフ"}</span>
    </button>
  );
}
