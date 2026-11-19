"use client";

import { TitleView } from "@/components/ui/TitleView";
import { UiIcon } from "@/components/ui/UiIcon";
import { SkinGauge } from "@/components/ui/SkinGauge";
import { SkinButton, SkinFace } from "@/components/ui/SkinButton";
import Link from "next/link";
import { useMemo } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { chestOpened, DailyChest } from "@/components/DailyChest";
import { WeeklyBossCard } from "@/components/WeeklyBossCard";
import { HeroFigure } from "@/components/HeroFigure";
import { BossArt } from "@/components/BossArt";
import { FxImg } from "@/components/fx/FxImg";
import { useFeedback } from "@/components/ui/Feedback";
import { Card, Initial, LevelBadge, Loading, SectionTitle, XpBar } from "@/components/ui/primitives";
import { DAILY_MISSIONS, missionEventId } from "@/domain/missions";
import { clearId, currentFloor, DUNGEONS, findTitle, floorProgress, isUnlocked } from "@/domain/quests";
import { rank } from "@/domain/ranking";
import { getRepo, useFriends, useCheers, useMyData } from "@/data/hooks";

export default function HomePage() {
  const me = useMyData();
  const cheersFor = useCheers();
  const friends = useFriends(me?.now ?? 0);
  const { showResult } = useFeedback();

  const todayActs = useMemo(() => me?.activities.filter((a) => a.date === me.today) ?? [], [me]);
  const feed = useMemo(
    () =>
      friends
        // 友達ごとの最新の活動を1件ずつ
        .flatMap((f) => f.activities.slice(0, 1).map((a) => ({ a, f })))
        .sort((x, y) => y.a.createdAt - x.a.createdAt)
        .slice(0, 3),
    [friends],
  );

  if (!me) return <Loading />;
  const c = me.character;
  const sets = todayActs.reduce((s, a) => s + (a.workout?.sets.length ?? 0), 0);
  const km = todayActs.reduce((s, a) => s + (a.run?.distanceKm ?? 0), 0);

  const weekly = rank(
    [{ name: me.profile.displayName, isMe: true, v: me.metrics.weekXp, avatar: me.profile.avatar }, ...friends.map((f) => ({ name: f.user.name, isMe: false, v: f.metrics.weekXp, avatar: f.user.avatar }))],
    (x) => x.v,
  );
  const myRank = weekly.find((r) => r.item.isMe)!;

  let mood = "今日も一緒に鍛えよう";
  if (c.daysSinceActive === 0) mood = "パンプアップ中！いい追い込みだ";
  else if (c.daysSinceActive == null) mood = "最初のトレーニングを記録しよう";
  else if (c.daysSinceActive > 3) mood = `${c.daysSinceActive}日休み… 筋肉がしぼみかけてる`;
  else if (c.streak > 1) mood = `${c.streak}日連続！この調子`;

  const title = findTitle(me.profile.titleId);
  // 一番倒しやすいボスを表示（HPや勝敗は表示しない）
  const quest = DUNGEONS.filter((d) => isUnlocked(d, me.cleared))
    .map((d) => {
      const fi = currentFloor(d, me.cleared);
      if (fi == null) return null;
      const floor = d.floors[fi];
      return { d, fi, floor, prog: floorProgress(floor, me.questStats) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => Number(b.prog.ready) - Number(a.prog.ready) || b.prog.ratio - a.prog.ratio)[0];
  const questHp = quest ? me.lastHp.get(clearId(quest.d.id, quest.fi)) : undefined;
  const claimed = new Set(me.xpEvents.filter((e) => e.sourceType === "mission").map((e) => e.id));

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between pt-4">
        <p className="font-num text-lg font-bold tracking-[0.18em]">
          MUSCLE<span className="text-accent">QUEST</span>
        </p>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${c.streak >= 3 ? "bg-accent/20 ring-1 ring-accent/50" : "bg-panel"}`}>
            {/* 連続日数が伸びるほど炎が大きく燃える */}
            <FxImg
              name="flame"
              alt=""
              className={c.streak > 0 ? "mq-flame" : "opacity-40 grayscale"}
              style={{ width: `${Math.min(2.1, 1.1 + c.streak * 0.09)}em`, height: `${Math.min(2.1, 1.1 + c.streak * 0.09)}em` }}
            />
            <span className="font-num font-bold">{c.streak}</span>
            <span className="text-[10px] text-sub">日連続</span>
          </div>
          <Link href="/me" aria-label="マイページ" className="rounded-full ring-2 ring-line">
            <Initial name={me.profile.displayName} size={32} src={me.profile.avatar} />
          </Link>
        </div>
      </header>

      {/* キャラクター */}
      <Link href="/character" className="relative block overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_50%_20%,#2a2f3a_0%,#14171d_55%,#0b0d11_100%)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,181,71,0.18),transparent_70%)]" />
        <div className="absolute left-4 top-4 z-10">
          <LevelBadge level={c.level} />
          <p className="mt-1.5 text-lg font-black">{c.tier.name}</p>
          <p className="text-[11px] text-sub">{c.tier.title}</p>
          
        </div>
        <div className="absolute right-4 top-4 z-10 text-right text-[10px] text-sub">
          <p>パワー</p>
          <p className="font-num text-lg font-bold text-ink">{Math.round((c.stats.chest + c.stats.back + c.stats.shoulders + c.stats.arms + c.stats.legs + c.stats.core) / 10)}</p>
          <p className="mt-1">スタミナ</p>
          <p className="font-num text-lg font-bold text-cardio">{Math.round(c.stats.cardio / 10)}</p>
        </div>
        <HeroFigure c={c} aura={me.profile.aura} glow={c.daysSinceActive === 0} className="mx-auto h-[360px] w-full pt-6" />
        <div className="relative z-10 -mt-2 px-4 pb-4">
          {title && (
            <div className="mb-1 flex justify-center">
              <TitleView title={title} size="lg" />
            </div>
          )}
          <p className="mb-2 text-center text-xs text-ink/80">{mood}</p>
          <XpBar into={c.levelInto} needed={c.levelNeeded} />
        </div>
      </Link>

      {/* 今日 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "今日のXP", value: me.metrics.todayXp, unit: "XP", color: "text-accent" },
          { label: "セット数", value: sets, unit: "set", color: "text-ink" },
          { label: "走行距離", value: km.toFixed(1), unit: "km", color: "text-cardio" },
        ].map((t) => (
          <div key={t.label} className="skin-card px-2 py-1.5">
            <p className="text-[10px] text-sub">{t.label}</p>
            <p className={`font-num text-2xl font-bold ${t.color}`}>
              {t.value}
              <span className="ml-0.5 text-[10px] text-sub">{t.unit}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/workout" className="group/skin block">
          <SkinFace className="h-14 w-full text-sm"><UiIcon name="workout" className="mr-1" />筋トレを記録</SkinFace>
        </Link>
        <Link href="/run" className="group/skin block">
          <SkinFace variant="run" className="h-14 w-full text-sm"><UiIcon name="run" className="mr-1" />ランを記録</SkinFace>
        </Link>
      </div>

      <DailyChest today={me.today} friendCode={me.profile.friendCode} moved={todayActs.length > 0} opened={chestOpened(me.xpEvents, me.today)} />

      <WeeklyBossCard compact />

      {/* クエスト */}
      {quest && (
        <Link href={`/quest/${quest.d.id}`} className="block skin-card-hot p-3" style={{ backgroundImage: `linear-gradient(120deg, ${quest.d.color}26, transparent 65%)` }}>
          <div className="flex items-center gap-3">
            <span className="shrink-0">
              <BossArt dungeonId={quest.d.id} floor={quest.fi} size={64} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-sub">
                クエスト ・ {quest.d.name} {quest.floor.name}
              </p>
              <p className="font-bold">{`${quest.floor.boss} が待ち構えている`}</p>
              <SkinGauge kind="hp" value={Math.max(0.02, questHp ?? 1)} h={12} className="mt-1.5" />
              <p className="mt-1 text-[10px] text-sub">
                {questHp == null ? "HP ???" : `HP ${Math.round(questHp * 100)}%（前回の戦闘）`} ・ 鍛えた分だけダメージを与えられる
              </p>
            </div>
            <span className="text-sub">›</span>
          </div>
        </Link>
      )}

      {/* ミッション */}
      <section>
        <SectionTitle>デイリーミッション</SectionTitle>
        <Card className="space-y-3 !p-3">
          {DAILY_MISSIONS.map((m) => {
            const p = m.progress(todayActs);
            const done = p.current >= p.target;
            const got = claimed.has(missionEventId(me.today, m.id));
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className={`text-sm ${got ? "text-sub line-through" : ""}`}>{m.label}</p>
                  <SkinGauge kind="ms" value={p.current / p.target} h={12} className="mt-1" />
                </div>
                <button
                  disabled={!done || got}
                  onClick={async () => showResult(await getRepo().claimMission(me.today, m.id), "ミッション達成！")}
                  className={`w-20 rounded-lg py-1.5 text-xs font-bold ${got ? "bg-panel-2 text-sub" : done ? "bg-accent-2 text-bg" : "bg-panel-2 text-sub"}`}
                >
                  {got ? "受取済" : done ? `+${m.bonusXp}XP` : `${p.current}/${p.target}`}
                </button>
              </div>
            );
          })}
        </Card>
      </section>

      {/* 友達 */}
      <section>
        <SectionTitle href="/friends">友達の動き</SectionTitle>
        <div className="space-y-2">
          {feed.map(({ a, f }) => (
            <ActivityCard key={a.id} a={a} name={f.user.name} userHref={`/friends/${f.user.id}`} now={me.now} received={cheersFor(a.id)} avatar={f.user.avatar} />
          ))}
          {feed.length === 0 && <Card className="text-center text-sm text-sub">友達を追加して一緒に鍛えよう</Card>}
        </div>
      </section>

      {/* ランキング */}
      <section>
        <SectionTitle href="/ranking">今週のランキング</SectionTitle>
        <Card className="!p-0">
          {weekly.slice(0, 3).map((r) => (
            <div key={r.item.name} className={`flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 ${r.item.isMe ? "bg-accent/10" : ""}`}>
              <span className="w-5 font-num text-lg font-bold text-sub">{r.rank}</span>
              <Initial name={r.item.name} size={28} color={r.item.isMe ? "#ff6b2c" : "#7c8597"} src={r.item.avatar} />
              <span className="flex-1 text-sm font-bold">{r.item.name}</span>
              <span className="font-num text-base font-bold">{r.value.toLocaleString()} XP</span>
            </div>
          ))}
          {myRank.rank > 3 && (
            <div className="flex items-center gap-3 bg-accent/10 px-4 py-2.5">
              <span className="w-5 font-num text-lg font-bold text-sub">{myRank.rank}</span>
              <Initial name={myRank.item.name} size={28} src={myRank.item.avatar} />
              <span className="flex-1 text-sm font-bold">{myRank.item.name}</span>
              <span className="font-num text-base font-bold">{myRank.value.toLocaleString()} XP</span>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
