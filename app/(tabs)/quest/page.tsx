"use client";

import Link from "next/link";
import { Card, Loading, PageHeader } from "@/components/ui/primitives";
import { findItem } from "@/domain/items";
import { currentFloor, DUNGEONS, findDungeon, findTitle, floorProgress, isDungeonCleared, isUnlocked, TITLES } from "@/domain/quests";
import { useMyData } from "@/data/hooks";

export default function QuestPage() {
  const me = useMyData();
  if (!me) return <Loading />;
  const clearedDungeons = DUNGEONS.filter((d) => isDungeonCleared(d, me.cleared)).length;
  const title = findTitle(me.profile.titleId);

  return (
    <div className="space-y-4">
      <PageHeader title="クエスト" sub="鍛えた分だけ、ダンジョンの奥へ進める" />

      <Card className="flex items-center gap-4 !p-4">
        <div className="flex-1">
          <p className="text-[10px] text-sub">称号</p>
          <p className="font-bold">{title ? `【${title.name}】` : "なし"}</p>
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
          <p className="text-[10px] text-sub">アイテム</p>
          <p className="font-num text-xl font-bold">{me.owned.items.length}</p>
        </div>
      </Card>

      <div className="space-y-3">
        {DUNGEONS.map((d) => {
          const unlocked = isUnlocked(d, me.cleared);
          const done = isDungeonCleared(d, me.cleared);
          const fi = currentFloor(d, me.cleared);
          const floor = fi != null ? d.floors[fi] : null;
          const prog = floor ? floorProgress(floor, me.questStats) : null;
          const clearedFloors = d.floors.length - (fi == null ? 0 : d.floors.length - fi);
          const item = findItem(d.reward.itemId);
          const ttl = findTitle(d.reward.titleId);
          const body = (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 ${unlocked ? "border-line bg-panel" : "border-line/50 bg-panel/50"}`}
              style={unlocked ? { backgroundImage: `linear-gradient(120deg, ${d.color}22, transparent 60%)` } : undefined}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid size-14 shrink-0 place-items-center rounded-xl text-3xl ${unlocked ? "" : "grayscale opacity-40"}`}
                  style={{ background: `${d.color}26` }}
                  aria-hidden
                >
                  {done ? "🏆" : unlocked ? floor?.emoji : "🔒"}
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
                        {prog.ready ? <span className="font-bold text-accent-2">挑戦できる！</span> : <span className="text-sub">ボスHP {Math.round((1 - prog.ratio) * 100)}%</span>}
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(3, (1 - prog.ratio) * 100)}%`, background: prog.ready ? "#ffb547" : d.color }} />
                      </div>
                    </div>
                  )}
                  {done && <p className="mt-1.5 text-[11px] font-bold text-accent-2">踏破済み</p>}
                  <p className="mt-2 text-[10px] text-sub">
                    報酬: {ttl && `称号【${ttl.name}】`} {item && `・${item.name}`}
                  </p>
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
