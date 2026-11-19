"use client";

import { useState } from "react";
import { getRepo, ONLINE, useMyData } from "@/data/hooks";
import { SkinButton } from "./SkinButton";

/**
 * オンライン版で最初に名前を決めてもらう。名前は友達画面・ランキングでほかのプレイヤーに見える。
 * （記録を1回以上した人だけが、ほかの人の画面に出る）
 */
export function NameGate() {
  const me = useMyData();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  if (!ONLINE || !me || me.profile.named) return null;
  const ok = name.trim().length > 0;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/85 p-6" role="dialog" aria-modal>
      <div className="mq-rise w-full max-w-sm skin-dialog p-4 text-center">
        <p className="text-lg font-black">ようこそ MUSCLE QUEST へ</p>
        <p className="mt-2 text-xs leading-relaxed text-sub">名前を決めてください。友達画面やランキングで、ほかのプレイヤーに表示されます。筋トレかランを1回記録すると、みんなの友達一覧に出ます。</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="例: マッスル太郎"
          className="mt-4 w-full skin-input px-2 py-2 text-center text-base outline-none"
          autoFocus
        />
        <p className="mt-1 text-[10px] text-sub">20文字まで。あとでマイページから変えられます</p>
        <SkinButton
          disabled={!ok || busy}
          onClick={async () => {
            setBusy(true);
            await getRepo().updateProfile({ displayName: name });
            setBusy(false);
          }}
          className="mt-4 h-12 w-full text-sm"
        >
          はじめる
        </SkinButton>
        <p className="mt-3 text-[10px] leading-relaxed text-sub">体重・体の写真・メニューは、ほかの人には送りません。</p>
      </div>
    </div>
  );
}
