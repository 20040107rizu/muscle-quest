"use client";

import Link from "next/link";
import { useState } from "react";
import { BATTLE_DAYS, battleScore, battleState, MAX_ACTIVE_BATTLES, type Battle, type BattleState } from "@/domain/battle";
import { diffDays } from "@/domain/dates";
import { getRepo, useFriends, useMyData, type FriendView } from "@/data/hooks";
import { sfx } from "./fx/sound";
import { SectionTitle } from "./ui/primitives";
import { SkinButton } from "./ui/SkinButton";
import { UiIcon } from "./ui/UiIcon";

const STATE_LABEL: Record<BattleState, string> = { active: "対決中", won: "勝利！", lost: "敗北", draw: "引き分け" };

/** 1件の対決（自分 vs 友達のスコア） */
function BattleRow({ b, friend, myScore, today }: { b: Battle; friend?: FriendView; myScore: number; today: string }) {
  const theirs = friend ? battleScore(friend.activities, b) : 0;
  const st = battleState(b, today, myScore, theirs);
  const total = Math.max(1, myScore + theirs);
  const left = diffDays(b.end, today);
  return (
    <div className={`skin-card p-3 ${st === "won" ? "ring-2 ring-accent-2" : ""}`}>
      <div className="flex items-center justify-between text-[10px] text-sub">
        <span>
          {b.start.slice(5).replace("-", "/")}〜{b.end.slice(5).replace("-", "/")}
        </span>
        <span className={`font-bold ${st === "won" ? "text-accent-2" : st === "lost" ? "text-bad" : st === "active" ? "text-ink" : "text-sub"}`}>
          {st === "won" && <UiIcon name="crown" className="mr-0.5" />}
          {STATE_LABEL[st]}
          {st === "active" && `（${left === 0 ? "今日まで" : `あと${left + 1}日`}）`}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="w-16 truncate text-xs font-bold">あなた</span>
        <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${(myScore / total) * 100}%` }} />
          <div className="absolute inset-y-0 right-0 bg-cardio" style={{ width: `${(theirs / total) * 100}%` }} />
        </div>
        <Link href={`/friends/${b.friendId}`} className="w-16 truncate text-right text-xs font-bold">
          {friend?.user.name ?? "？"}
        </Link>
      </div>
      <div className="mt-1 flex justify-between font-num text-sm font-bold">
        <span className="text-accent">{myScore.toLocaleString()}</span>
        <span className="text-cardio">{theirs.toLocaleString()}</span>
      </div>
    </div>
  );
}

/** 友達画面: 対決の一覧と通算成績 */
export function BattleList() {
  const me = useMyData();
  const friends = useFriends(me?.friendIds, me?.now ?? 0);
  if (!me) return null;
  const rows = me.battles.map((b) => {
    const friend = friends.find((f) => f.user.id === b.friendId);
    const mine = battleScore(me.activities, b);
    return { b, friend, mine, st: battleState(b, me.today, mine, friend ? battleScore(friend.activities, b) : 0) };
  });
  const wins = rows.filter((r) => r.st === "won").length;
  const losses = rows.filter((r) => r.st === "lost").length;
  return (
    <section>
      <SectionTitle>1週間対決</SectionTitle>
      <div className="space-y-2">
        {rows.length > 0 && (
          <p className="px-1 text-xs text-sub">
            通算 <span className="font-num font-bold text-accent-2">{wins}勝</span> {losses}敗
            {wins > 0 && <UiIcon name="crown" className="ml-1" />}
          </p>
        )}
        {rows.slice(0, 6).map((r) => (
          <BattleRow key={r.b.id} b={r.b} friend={r.friend} myScore={r.mine} today={me.today} />
        ))}
        {rows.length === 0 && <p className="skin-card p-3 text-center text-xs text-sub">友達のページから対決を申し込めます。{BATTLE_DAYS}日間で稼いだ経験値で勝負！</p>}
      </div>
    </section>
  );
}

/** 友達の詳細画面: 対決を申し込む／この友達との対決 */
export function BattlePanel({ friend }: { friend: FriendView }) {
  const me = useMyData();
  const [err, setErr] = useState("");
  if (!me) return null;
  const mine = me.battles.filter((b) => b.friendId === friend.user.id);
  const active = mine.find((b) => b.end >= me.today);
  const activeCount = me.battles.filter((b) => b.end >= me.today).length;
  const past = mine.filter((b) => b !== active);
  const wins = past.filter((b) => battleScore(me.activities, b) > battleScore(friend.activities, b)).length;

  return (
    <section>
      <SectionTitle>1週間対決</SectionTitle>
      <div className="space-y-2">
        {active ? (
          <BattleRow b={active} friend={friend} myScore={battleScore(me.activities, active)} today={me.today} />
        ) : (
          <div className="skin-card p-3 text-center">
            <p className="text-xs text-sub">
              {friend.user.name} と、今日から{BATTLE_DAYS}日間で稼いだ経験値で勝負（会心・宝箱などのおまけは含みません）
            </p>
            <SkinButton
              variant="danger"
              disabled={activeCount >= MAX_ACTIVE_BATTLES}
              onClick={async () => {
                const r = await getRepo().startBattle(friend.user.id);
                if (!r.ok) return setErr(r.error ?? "申し込めませんでした");
                setErr("");
                sfx.crit();
              }}
              className="mt-2 h-12 w-full text-sm"
            >
              {activeCount >= MAX_ACTIVE_BATTLES ? `同時に${MAX_ACTIVE_BATTLES}人まで` : "対決を申し込む"}
            </SkinButton>
            {err && <p className="mt-1 text-xs text-bad">{err}</p>}
          </div>
        )}
        {past.length > 0 && (
          <p className="px-1 text-xs text-sub">
            {friend.user.name} との成績：<span className="font-num font-bold text-accent-2">{wins}勝</span> {past.length - wins}敗・引き分け
          </p>
        )}
        {past.slice(0, 3).map((b) => (
          <BattleRow key={b.id} b={b} friend={friend} myScore={battleScore(me.activities, b)} today={me.today} />
        ))}
      </div>
    </section>
  );
}

