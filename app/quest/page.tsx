"use client";

import { TitleView } from "@/components/ui/TitleView";
import { ITEMS } from "@/domain/items";
import { UiIcon } from "@/components/ui/UiIcon";
import { SkinGauge } from "@/components/ui/SkinGauge";
import Link from "next/link";
import { BossArt } from "@/components/BossArt";
import { Card, Loading, PageHeader } from "@/components/ui/primitives";
import { clearId, currentFloor, DUNGEONS, findDungeon, findTitle, floorProgress, isDungeonCleared, isUnlocked, TITLES } from "@/domain/quests";
import { useFriends, useMyData, type FriendView } from "@/data/hooks";
import { Initial } from "@/components/ui/primitives";

/** 友達がこのダンジョンのどこにいるか（1階でも倒した人だけ） */
function FriendsHere({ d, friends }: { d: (typeof DUNGEONS)[number]; friends: FriendView[] }) {
  const here = friends
    .map((f) => {
      const n = d.floors.filter((_, i) => f.cleared.has(clearId(d.id, i))).length;
      return { f, n, done: isDungeonCleared(d, f.cleared) };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  if (!here.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {here.slice(0, 6).map(({ f, n, done }) => (
        <span key={f.user.id} className="flex items-center gap-1 rounded-full bg-black/30 py-0.5 pl-0.5 pr-2 text-[10px]">
          <Initial name={f.user.name} size={20} src={f.user.avatar} color="#7c8597" />
          <span className="max-w-[5.5rem] truncate font-bold">{f.user.name}</span>
          <span className={done ? "font-bold text-accent-2" : "text-sub"}>{done ? "踏破" : `${d.floors[n]?.name.split(" ")[0] ?? ""}で挑戦中`}</span>
        </span>
      ))}
      {here.length > 6 && <span className="self-center text-[10px] text-sub">ほか{here.length - 6}人</span>}
    </div>
  );
}

export default function QuestPage() {
  const me = useMyData();
  const friends = useFriends(me?.now ?? 0);
  if (!me) return <Loading />;
  const clearedDungeons = DUNGEONS.filter((d) => isDungeonCleared(d, me.cleared)).length;
  const title = findTitle(me.profile.titleId);

  return (
    <div className="space-y-4">
      <PageHeader title="クエスト" sub="鍛えた分だけ、ダンジョンの奥へ進める" />

      <Card className="flex items-center gap-4 !p-4">
        <div className="flex-1">
          <p className="text-[10px] text-sub">称号</p>
          <p className="font-bold">{title ? <TitleView title={title} size="sm" /> : "なし"}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-sub">踏破</p>
          <p className="font-num text-xl font-bold">
            {clearedDungeons}
            <span className="text-xs text-sub">/{DUNGEONS.length}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-sub">称号</p>
          <p className="font-num text-xl font-bold">
            {me.owned.titles.length}
            <span className="text-xs text-sub">/{TITLES.length}</span>
          </p>
        </div>
        <div className="text-center">
          <p className="whitespace-nowrap text-[10px] text-sub">オーラ</p>
          <p className="font-num text-xl font-bold">
            {me.owned.items.length}
            <span className="text-xs text-sub">/{ITEMS.length}</span>
          </p>
        </div>
      </Card>

      <div className="space-y-3">
        {DUNGEONS.map((d) => {
          const unlocked = isUnlocked(d, me.cleared);
          const done = isDungeonCleared(d, me.cleared);
          const fi = currentFloor(d, me.cleared);
          const floor = fi != null ? d.floors[fi] : null;
          const prog = floor ? floorProgress(floor, me.questStats) : null;
          // 最後に戦ったときの残りHP（未挑戦なら undefined → ???）
          const lastHp = fi != null ? me.lastHp.get(clearId(d.id, fi)) : undefined;
          const clearedFloors = d.floors.length - (fi == null ? 0 : d.floors.length - fi);
          const body = (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 ${unlocked ? "border-line bg-panel" : "border-line/50 bg-panel/50"}`}
              style={unlocked ? { backgroundImage: `linear-gradient(120deg, ${d.color}22, transparent 60%)` } : undefined}
            >
              <div className="flex items-start gap-3">
                <div className="relative grid size-16 shrink-0 place-items-center rounded-xl" style={{ background: `${d.color}26` }}>
                  {/* 挑戦中のボス / 踏破済みは最終ボス / 未解放は最終ボスのシルエット */}
                  <BossArt dungeonId={d.id} floor={fi ?? d.floors.length - 1} size={60} dim={!unlocked} />
                  {done && <span className="absolute -bottom-1 -right-1 text-base" aria-label="踏破済み">🏆</span>}
                  {!unlocked && <UiIcon name="lock" alt="未解放" className="absolute -bottom-1 -right-1 !h-6" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-black ${unlocked ? "" : "text-sub"}`}>{d.name}</p>
                    <span className="shrink-0 font-num text-xs text-sub">
                      {clearedFloors}/{d.floors.length}階
                    </span>
                  </div>
                  <p className="text-[11px] text-sub">{d.theme}</p>
                  {!unlocked && (
                    <p className="mt-1.5 text-[11px] text-sub">
                      解放条件: {d.unlockAfter.map((id) => findDungeon(id)?.name).join("・")}を踏破
                    </p>
                  )}
                  {unlocked && floor && prog && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px]">
                        <span>
                          {floor.name}：<b>{floor.boss}</b>
                        </span>
                        <span className="text-sub">{lastHp == null ? "HP ???" : `HP ${Math.round(lastHp * 100)}%`}</span>
                      </div>
                      <SkinGauge kind="hp" value={Math.max(0.02, lastHp ?? 1)} h={12} className="mt-1" />
                    </div>
                  )}
                  {done && <p className="mt-1.5 text-[11px] font-bold text-accent-2">踏破済み</p>}
                  <FriendsHere d={d} friends={friends} />
                </div>
              </div>
            </div>
          );
          return unlocked ? (
            <Link key={d.id} href={`/quest/${d.id}`} className="block">
              {body}
            </Link>
          ) : (
            <div key={d.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
