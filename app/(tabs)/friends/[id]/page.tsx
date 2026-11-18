"use client";

import { UiIcon } from "@/components/ui/UiIcon";
import { TitlePlate } from "@/components/ui/TitlePlate";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { HeroFigure } from "@/components/HeroFigure";
import { StatBars } from "@/components/StatBars";
import { useFeedback } from "@/components/ui/Feedback";
import { Card, LevelBadge, Loading, SectionTitle, XpBar } from "@/components/ui/primitives";
import { buildFriendView, getRepo, useMyData } from "@/data/hooks";
import { findMockUser } from "@/data/mock/friends";
import { findTitle } from "@/domain/quests";

export default function FriendDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMyData();
  const { confirm: ask } = useFeedback();
  const user = findMockUser(id);
  const view = useMemo(() => (user && me ? buildFriendView(user, me.now) : null), [user, me]);
  const myReactions = useMemo(() => new Set(me?.reactions.map((r) => r.id)), [me?.reactions]);

  if (!me) return <Loading />;
  if (!user || !view) return <p className="pt-10 text-center text-sm text-sub">ユーザーが見つかりません</p>;
  const isFriend = me.friendIds.includes(user.id);
  const c = view.character;
  const todayActs = view.activities.filter((a) => a.date === me.today);

  return (
    <div className="space-y-4 pt-4">
      <Link href="/friends" className="text-sm text-sub">
        ‹ 友達
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_50%_20%,#2a2f3a_0%,#14171d_60%)]">
        <div className="absolute left-4 top-4 z-10">
          <p className="text-2xl font-black">{user.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <LevelBadge level={c.level} />
            <span className="text-sm font-bold">{c.tier.name}</span>
          </div>
          {findTitle(view.titleId) && <TitlePlate name={findTitle(view.titleId)!.name} rarity={findTitle(view.titleId)!.rarity} className="mt-1" />}
        </div>
        <div className="absolute right-4 top-4 z-10 text-right">
          <p className="text-[10px] text-sub">連続</p>
          <p className="font-num text-2xl font-bold"><UiIcon name="flame" className="mr-0.5" />{c.streak}</p>
        </div>
        <HeroFigure c={c} aura={view.aura} glow={c.daysSinceActive === 0} className="mx-auto h-[320px] w-full pt-10" />
        <div className="px-4 pb-4">
          <p className="mb-2 text-center text-xs text-sub">「{user.comment}」</p>
          <XpBar into={c.levelInto} needed={c.levelNeeded} />
        </div>
      </div>

      {!isFriend && (
        <button onClick={() => getRepo().addFriendByCode(user.code)} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white">
          友達に追加
        </button>
      )}

      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { l: "今日", v: view.metrics.todayXp, u: "XP" },
          { l: "今週", v: view.metrics.weekXp, u: "XP" },
          { l: "累計", v: view.metrics.activeDays, u: "日" },
          { l: "今月ラン", v: view.metrics.monthRunKm, u: "km" },
        ].map((x) => (
          <div key={x.l} className="skin-card py-1">
            <p className="text-[10px] text-sub">{x.l}</p>
            <p className="font-num text-lg font-bold">
              {x.v.toLocaleString()}
              <span className="text-[9px] text-sub">{x.u}</span>
            </p>
          </div>
        ))}
      </div>

      <Card>
        <p className="mb-2 text-sm font-bold">部位ステータス</p>
        <StatBars c={c} />
      </Card>

      <section>
        <SectionTitle>今日のトレーニング</SectionTitle>
        {todayActs.length === 0 ? (
          <Card className="text-center text-sm text-sub">今日はまだ記録がありません</Card>
        ) : (
          <div className="space-y-2">
            {todayActs.map((a) => (
              <ActivityCard key={a.id} a={a} name={user.name} now={me.now} myReactions={myReactions} onReact={(k) => getRepo().toggleReaction(a.id, k)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>最近の記録</SectionTitle>
        <div className="space-y-2">
          {view.activities
            .filter((a) => a.date !== me.today)
            .slice(0, 12)
            .map((a) => (
              <ActivityCard key={a.id} a={a} name={user.name} now={me.now} myReactions={myReactions} onReact={(k) => getRepo().toggleReaction(a.id, k)} />
            ))}
        </div>
      </section>

      {isFriend && (
        <button
          onClick={async () => {
            if (await ask(`${user.name}さんを友達から外しますか？`, { ok: "外す", danger: true })) {
              await getRepo().removeFriend(user.id);
              router.push("/friends");
            }
          }}
          className="w-full py-3 text-xs text-sub"
        >
          友達から外す
        </button>
      )}
    </div>
  );
}
