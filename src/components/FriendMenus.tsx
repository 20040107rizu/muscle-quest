"use client";

import { useState } from "react";
import { findExercise } from "@/domain/exercises";
import type { FriendView } from "@/data/hooks";
import { getRepo, useMyData } from "@/data/hooks";
import { ExerciseSheet } from "./ExerciseSheet";
import { sfx } from "./fx/sound";
import { SectionTitle } from "./ui/primitives";
import { SkinButton } from "./ui/SkinButton";

/** 友達の筋トレメニュー。種目をタップでやり方、ボタンで自分のメニューにコピー */
export function FriendMenus({ friend }: { friend: FriendView }) {
  const me = useMyData();
  const [sheet, setSheet] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState<Record<number, string>>({});
  if (!me) return null;
  const known = (id: string) => !!findExercise(id, me.customExercises);
  return (
    <section>
      <SectionTitle>{friend.user.name}さんのメニュー</SectionTitle>
      {friend.menus.length === 0 ? (
        <p className="skin-card p-3 text-center text-xs text-sub">まだメニューを作っていません</p>
      ) : (
        <div className="space-y-2">
          {friend.menus.map((m, i) => {
            const usable = m.exercises.filter((e) => known(e.id));
            return (
              <div key={i} className="skin-card p-3">
                <p className="text-sm font-black">{m.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.exercises.map((e, j) => (
                    <button
                      key={j}
                      onClick={() => known(e.id) && setSheet(e)}
                      className={`rounded-full px-2.5 py-1 text-xs ${known(e.id) ? "bg-panel-2" : "bg-panel-2/50 text-sub"}`}
                    >
                      {j + 1}. {e.name}
                    </button>
                  ))}
                </div>
                <SkinButton
                  variant="gray"
                  disabled={!usable.length || !!copied[i]}
                  onClick={async () => {
                    try {
                      await getRepo().saveMenu(m.name, usable.map((e) => e.id));
                      setCopied((c) => ({ ...c, [i]: "自分のメニューに追加しました" }));
                      sfx.coin();
                    } catch (err) {
                      setCopied((c) => ({ ...c, [i]: (err as Error).message }));
                    }
                  }}
                  className="mt-3 h-10 w-full text-xs"
                >
                  {copied[i] ? "追加しました" : "このメニューを自分にコピー"}
                </SkinButton>
                {usable.length < m.exercises.length && <p className="mt-1 text-[10px] text-sub">※ {m.name}の中の、その人が自分で追加した種目はコピーされません</p>}
                {copied[i] && <p className="mt-1 text-center text-[10px] text-good">{copied[i]}。記録画面の「マイメニュー」から始められます</p>}
              </div>
            );
          })}
        </div>
      )}
      {sheet && <ExerciseSheet exerciseId={sheet.id} name={sheet.name} onClose={() => setSheet(null)} />}
    </section>
  );
}
