"use client";

import { TitleView } from "@/components/ui/TitleView";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { WeeklyBossCard } from "@/components/WeeklyBossCard";
import { BattleList } from "@/components/Battle";
import { HeroFigure } from "@/components/HeroFigure";
import { Card, LevelBadge, Loading, PageHeader, Segmented, SectionTitle } from "@/components/ui/primitives";
import { addDays } from "@/domain/dates";
import { findTitle } from "@/domain/quests";
import { getRepo, useFriends, useMyData } from "@/data/hooks";

export default function FriendsPage() {
  const me = useMyData();
  const friends = useFriends(me?.now ?? 0);
  const [filter, setFilter] = useState<"today" | "week">("today");

  const myReactions = useMemo(() => new Set(me?.reactions.map((r) => r.id)), [me?.reactions]);
  const feed = useMemo(() => {
    if (!me) return [];
    const from = filter === "today" ? me.today : addDays(me.today, -6);
    return friends
      .flatMap((f) => f.activities.filter((a) => a.date >= from).map((a) => ({ a, f })))
      .sort((x, y) => y.a.createdAt - x.a.createdAt)
      .slice(0, 40);
  }, [friends, filter, me]);

  if (!me) return <Loading />;

  return (
    <div className="space-y-5">
      <PageHeader title="友達" sub="このゲームで遊んでいる人は全員友達です" />

      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {friends.map((f) => {
          const activeToday = f.metrics.todayXp > 0;
          return (
            <Link key={f.user.id} href={`/friends/${f.user.id}`} className="w-28 shrink-0 skin-card p-1 text-center">
              <div className="relative">
                <HeroFigure c={f.character} aura={f.aura} className="mx-auto h-28 w-full" />
                {activeToday && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-good ring-2 ring-panel" aria-label="今日運動済み" />}
              </div>
              <p className="mt-1 truncate text-sm font-bold">{f.user.name}</p>
              <div className="mt-0.5 flex items-center justify-center gap-1">
                <LevelBadge level={f.character.level} size="sm" />
              </div>
              {findTitle(f.titleId) && <TitleView title={findTitle(f.titleId)!} size="xs" className="mt-0.5" />}
              <p className="mt-1 text-[10px] text-sub">{activeToday ? `今日 +${f.metrics.todayXp}XP` : "今日はまだ"}</p>
            </Link>
          );
        })}
      </div>

      <WeeklyBossCard />

      <BattleList />

      <section>
        <SectionTitle>タイムライン</SectionTitle>
        <div className="mb-3">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "today", label: "今日" },
              { value: "week", label: "直近7日" },
            ]}
          />
        </div>
        <div className="space-y-2">
          {feed.map(({ a, f }) => (
            <ActivityCard
              key={a.id}
              a={a}
              name={f.user.name}
              userHref={`/friends/${f.user.id}`}
              now={me.now}
              myReactions={myReactions}
              onReact={(k) => getRepo().toggleReaction(a.id, k)}
            />
          ))}
          {feed.length === 0 && <Card className="text-center text-sm text-sub">{filter === "today" ? "今日はまだ誰も記録していません。一番乗りしよう！" : "記録がありません"}</Card>}
        </div>
      </section>

    </div>
  );
}
