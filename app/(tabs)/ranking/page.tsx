"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/avatar/Avatar";
import { Card, Initial, LevelBadge, Loading, PageHeader, Segmented } from "@/components/ui/primitives";
import type { CharacterState } from "@/domain/character";
import { RANKINGS, rank, type RankingKey, type UserMetrics } from "@/domain/ranking";
import { useFriends, useMyData } from "@/data/hooks";

const DESCRIPTIONS: Record<RankingKey, string> = {
  today: "今日獲得した経験値",
  week: "今週（月曜〜）獲得した経験値",
  month: "今月獲得した経験値",
  days: "これまでに運動した日数の合計",
  streak: "今日（または昨日）まで連続で運動した日数",
  run: "今月のランニング距離",
  growth: "直近30日の推定1RMが、それ以前と比べて何%伸びたか（種目平均）",
};

interface Row {
  id: string;
  name: string;
  isMe: boolean;
  metrics: UserMetrics;
  character: CharacterState;
  href?: string;
}

export default function RankingPage() {
  const me = useMyData();
  const friends = useFriends(me?.friendIds, me?.now ?? 0);
  const [key, setKey] = useState<RankingKey>("week");
  if (!me) return <Loading />;

  const def = RANKINGS.find((r) => r.key === key)!;
  const rows: Row[] = [
    { id: "me", name: me.profile.displayName, isMe: true, metrics: me.metrics, character: me.character },
    ...friends.map((f) => ({ id: f.user.id, name: f.user.name, isMe: false, metrics: f.metrics, character: f.character, href: `/friends/${f.user.id}` })),
  ];
  const ranked = rank(rows, (r) => def.pick(r.metrics));
  const fmt = (v: number) => (key === "growth" ? `${v > 0 ? "+" : ""}${v}` : v.toLocaleString());
  const podium = ranked.slice(0, 3);
  const order = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="space-y-4">
      <PageHeader title="ランキング" sub="友達同士で競おう" />
      <Segmented value={key} onChange={setKey} options={RANKINGS.map((r) => ({ value: r.key, label: r.label }))} />
      <p className="px-1 text-[11px] text-sub">{DESCRIPTIONS[key]}</p>

      <div className="flex items-end justify-center gap-2 pt-2">
        {order.map((r) => {
          const first = r.rank === 1;
          const h = r === podium[0] ? "h-24" : r === podium[1] ? "h-16" : "h-12";
          return (
            <div key={r.item.id} className="flex w-1/3 flex-col items-center">
              <Avatar dev={r.item.character.dev} fat={r.item.character.fat} cardio={r.item.character.cardio} className={first ? "h-40 w-full" : "h-32 w-full"} glow={first} />
              <p className={`mt-1 truncate text-sm font-bold ${r.item.isMe ? "text-accent" : ""}`}>{r.item.name}</p>
              <p className="font-num text-base font-bold">
                {fmt(r.value)}
                <span className="text-[10px] text-sub">{def.unit}</span>
              </p>
              <div className={`mt-1 grid w-full place-items-center rounded-t-xl ${h} ${first ? "bg-gradient-to-b from-accent-2/50 to-accent-2/10" : "bg-panel-2"}`}>
                <span className="font-num text-3xl font-bold">{r.rank}</span>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="!p-0">
        {ranked.map((r) => {
          const inner = (
            <>
              <span className={`w-6 text-center font-num text-xl font-bold ${r.rank <= 3 ? "text-accent-2" : "text-sub"}`}>{r.rank}</span>
              <Initial name={r.item.name} size={34} color={r.item.isMe ? "#ff6b2c" : "#7c8597"} />
              <div className="flex-1">
                <p className="text-sm font-bold">
                  {r.item.name}
                  {r.item.isMe && <span className="ml-1 text-[10px] text-accent">あなた</span>}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <LevelBadge level={r.item.character.level} size="sm" />
                  <span className="text-[10px] text-sub">{r.item.character.tier.name}</span>
                </div>
              </div>
              <span className="font-num text-xl font-bold">
                {fmt(r.value)}
                <span className="ml-0.5 text-[10px] text-sub">{def.unit}</span>
              </span>
            </>
          );
          const cls = `flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${r.item.isMe ? "bg-accent/10" : ""}`;
          return r.item.href ? (
            <Link key={r.item.id} href={r.item.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={r.item.id} className={cls}>
              {inner}
            </div>
          );
        })}
      </Card>
      <p className="px-1 text-[10px] leading-relaxed text-sub">
        ※ 経験値系ランキングは、1日の獲得上限（1,500XP）や同種目の逓減を適用した後の値で集計されます。同じ記録の連投や極端な入力では順位を上げられません。
      </p>
    </div>
  );
}
