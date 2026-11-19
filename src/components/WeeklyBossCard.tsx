"use client";

import { TitleView } from "./ui/TitleView";
import Link from "next/link";
import { useState } from "react";
import { weeklyBossFor } from "@/domain/weekly";
import { findTitle } from "@/domain/quests";
import type { Activity } from "@/domain/types";
import { getRepo, useFriends, useMyData } from "@/data/hooks";
import { assetUrl } from "./assets";
import { sfx } from "./fx/sound";
import { useFx } from "./fx/FxLayer";
import { Initial } from "./ui/primitives";
import { SkinButton } from "./ui/SkinButton";
import { SkinGauge } from "./ui/SkinGauge";

const xpBetween = (acts: Activity[], from: string, to: string) => acts.filter((a) => a.date >= from && a.date <= to).reduce((s, a) => s + a.xp, 0);

/**
 * 週替わりボス。自分と友達みんなの「今週の経験値」の合計でHPを削る。
 * compact: ホーム用の小さい表示（友達画面へのリンク付き）
 */
export function WeeklyBossCard({ compact = false }: { compact?: boolean }) {
  const me = useMyData();
  const friends = useFriends(me?.now ?? 0);
  const { confetti, shake } = useFx();
  const [err, setErr] = useState("");
  if (!me) return null;

  const { boss, weekKey, daysLeft } = weeklyBossFor(me.today);
  const mine = xpBetween(me.activities, weekKey, me.today);
  const members = [
    { id: "me", name: me.profile.displayName, xp: mine, isMe: true },
    ...friends.map((f) => ({ id: f.user.id, name: f.user.name, xp: xpBetween(f.activities, weekKey, me.today), isMe: false })),
  ].sort((a, b) => b.xp - a.xp);
  const team = members.reduce((s, m) => s + m.xp, 0);
  const defeated = team >= boss.hp;
  const claimed = me.weeklyClears.some((c) => c.id === weekKey);
  const title = findTitle(boss.titleId)!;
  const hpLeft = Math.max(0, 1 - team / boss.hp);

  async function claim() {
    const r = await getRepo().claimWeeklyBoss(me!.today);
    if (!r.ok) return setErr(r.error ?? "受け取れませんでした");
    sfx.levelUp();
    confetti(200);
    shake(1.4);
  }

  const art = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={assetUrl(`bosses/${boss.image}.webp`)}
      alt={boss.name}
      draggable={false}
      className={`shrink-0 select-none object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.6)] ${defeated ? "opacity-60 grayscale" : ""}`}
      style={{ width: compact ? 64 : 120, height: compact ? 64 : 120 }}
    />
  );

  const body = (
    <>
      <div className={`flex items-center gap-3 ${compact ? "" : "flex-col text-center"}`}>
        {art}
        <div className="min-w-0 flex-1 self-stretch">
          <p className="text-[10px] text-sub">
            週替わりボス ・ {daysLeft === 0 ? "今日まで" : `あと${daysLeft + 1}日`}
          </p>
          <p className="font-bold">{defeated ? `${boss.name} を倒した！` : `${boss.name} が現れた`}</p>
          <SkinGauge kind="hp" value={Math.max(defeated ? 0 : 0.02, hpLeft)} h={compact ? 12 : 18} className="mt-1.5" />
          <p className="mt-1 text-[10px] text-sub">
            みんなの今週の経験値 <span className="font-num font-bold text-ink">{team.toLocaleString()}</span> / {boss.hp.toLocaleString()}
          </p>
        </div>
      </div>
      {!compact && (
        <>
          <div className="mt-3 space-y-1">
            {members.map((m) => (
              <div key={m.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${m.isMe ? "bg-accent/10" : ""}`}>
                <Initial name={m.name} size={22} color={m.isMe ? "#ff6b2c" : "#7c8597"} />
                <span className="flex-1 font-bold">{m.name}</span>
                <span className="font-num">{m.xp.toLocaleString()} ダメージ</span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center">
            <p className="text-[10px] text-sub">倒すともらえる限定称号</p>
            <div className="mt-1 flex justify-center">
              <TitleView title={title} />
            </div>
            {claimed ? (
              <p className="mt-2 text-xs font-bold text-good">受け取り済み（称号図鑑でつけられます）</p>
            ) : defeated ? (
              <SkinButton variant="gold" onClick={claim} className="mt-3 h-12 w-full text-sm">
                {mine > 0 ? "限定称号を受け取る" : "1回運動すると受け取れる"}
              </SkinButton>
            ) : (
              <p className="mt-2 text-[11px] text-sub">鍛えた分だけダメージ。今週中にみんなで倒そう（自分も1回以上運動すると受け取れる）</p>
            )}
            {err && <p className="mt-1 text-xs text-bad">{err}</p>}
          </div>
        </>
      )}
    </>
  );

  if (compact) {
    return (
      <Link href="/friends" className="block skin-card p-3">
        {body}
      </Link>
    );
  }
  return <div className="skin-card-hot p-4">{body}</div>;
}
