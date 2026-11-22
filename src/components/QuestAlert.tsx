"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readyBosses } from "@/domain/quests";
import { useMyData } from "@/data/hooks";
import { BossArt } from "./BossArt";
import { sfx } from "./fx/sound";

/** 倒せるボスの数（タブの印などに使う） */
export function useReadyBosses() {
  const me = useMyData();
  return me ? readyBosses(me.cleared, me.questStats) : [];
}

const KEY = "mq-quest-alert";

/**
 * アプリ内のお知らせ：「ボスに挑もう！」。
 * 倒せる力があるのにまだ挑んでいないボスがいるとき、画面の上に出す。
 * 閉じたらその日は同じボスでは出さない。
 */
export function QuestAlert() {
  const ready = useReadyBosses();
  const me = useMyData();
  const [hidden, setHidden] = useState<string | null>(null);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(KEY) ?? "");
    } catch {
      setHidden("");
    }
  }, []);
  if (!me || hidden === null || !ready.length) return null;
  const first = ready[0];
  const key = `${me.today}:${ready.map((r) => `${r.d.id}:${r.floor}`).join(",")}`;
  if (hidden === key) return null;
  const close = () => {
    setHidden(key);
    try {
      localStorage.setItem(KEY, key);
    } catch {
      // 保存できなくても、開いている間は閉じたまま
    }
  };
  return (
    <div className="mq-rise fixed inset-x-0 top-0 z-40 mx-auto max-w-md px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="skin-card-hot flex items-center gap-3 p-2.5 shadow-2xl">
        <BossArt dungeonId={first.d.id} floor={first.floor} size={44} />
        <Link href={`/quest/${first.d.id}`} onClick={() => { sfx.tap(); close(); }} className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-accent-2">クエストに挑もう！</p>
          <p className="truncate text-sm font-black">{first.d.floors[first.floor].boss}を倒せる力がついた！</p>
          <p className="text-[10px] text-sub">{ready.length > 1 ? `ほか${ready.length - 1}体も倒せる ・ ` : ""}タップして挑む ›</p>
        </Link>
        <button onClick={close} aria-label="閉じる" className="shrink-0 px-1.5 text-sub">
          ✕
        </button>
      </div>
    </div>
  );
}
