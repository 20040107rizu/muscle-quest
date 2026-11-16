"use client";

import { useMemo, useState } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { Card, Initial, LevelBadge, Loading, PageHeader, Segmented, SectionTitle } from "@/components/ui/primitives";
import { addDays, parseDateKey } from "@/domain/dates";
import type { Activity } from "@/domain/types";
import { bestE1RM, volumeOf } from "@/domain/xp";
import { getRepo, useMyData } from "@/data/hooks";
import { mockReactionsOn } from "@/data/mock/friends";

export default function MyPage() {
  const me = useMyData();
  const [tab, setTab] = useState<"history" | "bests">("history");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bw, setBw] = useState(65);

  const xpByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of me?.xpEvents ?? []) m.set(e.date, (m.get(e.date) ?? 0) + e.total);
    return m;
  }, [me?.xpEvents]);

  const bests = useMemo(() => {
    const map = new Map<string, { name: string; maxW: number; e1: number; count: number; last: string; lastE1: number; prevE1: number | null }>();
    // workouts は新しい順
    for (const w of me?.workouts ?? []) {
      const cur = map.get(w.exerciseId);
      const e1 = bestE1RM(w.sets);
      const maxW = Math.max(...w.sets.map((s) => s.weightKg));
      if (!cur) map.set(w.exerciseId, { name: w.exerciseName, maxW, e1, count: 1, last: w.date, lastE1: e1, prevE1: null });
      else {
        cur.maxW = Math.max(cur.maxW, maxW);
        cur.e1 = Math.max(cur.e1, e1);
        if (cur.count === 1) cur.prevE1 = e1;
        cur.count++;
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [me?.workouts]);

  const grouped = useMemo(() => {
    const g = new Map<string, Activity[]>();
    for (const a of me?.activities ?? []) g.set(a.date, [...(g.get(a.date) ?? []), a]);
    return [...g.entries()];
  }, [me?.activities]);

  if (!me) return <Loading />;
  const c = me.character;
  const totalSets = me.workouts.reduce((a, w) => a + w.sets.length, 0);
  const totalVol = me.workouts.reduce((a, w) => a + volumeOf(w.sets), 0);
  const totalKm = me.runs.reduce((a, r) => a + r.distanceKm, 0);

  // 直近5週のカレンダー（月曜始まり）
  const todayDow = (parseDateKey(me.today).getDay() + 6) % 7;
  const calStart = addDays(me.today, -(28 + todayDow));
  const cal = Array.from({ length: 35 }, (_, i) => addDays(calStart, i));

  return (
    <div className="space-y-5">
      <PageHeader title="マイページ" />

      <Card>
        <div className="flex items-center gap-3">
          <Initial name={me.profile.displayName} size={52} />
          <div className="flex-1">
            <p className="text-lg font-black">{me.profile.displayName}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <LevelBadge level={c.level} size="sm" />
              <span className="text-xs text-sub">{c.tier.name}</span>
              <span className="text-xs text-sub">・ {me.profile.bodyweightKg}kg</span>
            </div>
            <p className="mt-1 font-num text-xs text-sub">フレンドコード {me.profile.friendCode}</p>
          </div>
          <button
            onClick={() => {
              setName(me.profile.displayName);
              setBw(me.profile.bodyweightKg);
              setEditing((e) => !e);
            }}
            className="rounded-lg bg-panel-2 px-3 py-1.5 text-xs"
          >
            編集
          </button>
        </div>
        {editing && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <label className="block text-xs text-sub">
              表示名
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="mt-1 w-full rounded-lg bg-panel-2 px-3 py-2 text-sm text-ink outline-none" />
            </label>
            <label className="block text-xs text-sub">
              体重 (kg) — 自重種目の負荷計算に使用。友達には公開されません
              <input type="number" value={bw} onChange={(e) => setBw(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-panel-2 px-3 py-2 font-num text-sm text-ink outline-none" />
            </label>
            <button
              onClick={async () => {
                await getRepo().updateProfile({ displayName: name, bodyweightKg: bw });
                setEditing(false);
              }}
              className="w-full rounded-lg bg-accent py-2 text-sm font-bold text-white"
            >
              保存
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "運動日数", v: c.activeDays, u: "日" },
          { l: "総セット", v: totalSets, u: "set" },
          { l: "総挙上量", v: totalVol >= 10000 ? (totalVol / 1000).toFixed(1) : totalVol, u: totalVol >= 10000 ? "t" : "kg" },
          { l: "総走行距離", v: totalKm.toFixed(1), u: "km" },
          { l: "連続日数", v: c.streak, u: "日" },
          { l: "総経験値", v: c.totalXp.toLocaleString(), u: "XP" },
        ].map((x) => (
          <div key={x.l} className="rounded-2xl border border-line bg-panel px-3 py-2.5">
            <p className="text-[10px] text-sub">{x.l}</p>
            <p className="font-num text-xl font-bold">
              {x.v}
              <span className="ml-0.5 text-[10px] text-sub">{x.u}</span>
            </p>
          </div>
        ))}
      </div>

      <section>
        <SectionTitle>アクティビティ</SectionTitle>
        <Card className="!p-3">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] text-sub">
            {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cal.map((d) => {
              const xp = xpByDate.get(d) ?? 0;
              const future = d > me.today;
              const o = xp === 0 ? 0 : Math.min(1, 0.25 + xp / 800);
              return (
                <div
                  key={d}
                  title={`${d}: ${xp}XP`}
                  className={`aspect-square rounded-md ${d === me.today ? "ring-1 ring-ink/60" : ""} ${future ? "opacity-20" : ""}`}
                  style={{ background: xp ? `rgba(255,107,44,${o})` : "rgba(255,255,255,0.05)" }}
                />
              );
            })}
          </div>
        </Card>
      </section>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "history", label: "過去の記録" },
          { value: "bests", label: "自己ベスト" },
        ]}
      />

      {tab === "history" ? (
        <div className="space-y-4">
          {grouped.length === 0 && <Card className="text-center text-sm text-sub">まだ記録がありません</Card>}
          {grouped.map(([date, acts]) => (
            <div key={date}>
              <p className="mb-1.5 px-1 text-xs font-bold text-sub">
                {date === me.today ? "今日" : date.replace(/-/g, "/")}
                <span className="ml-2 font-num text-accent">+{acts.reduce((a, x) => a + x.xp, 0)}XP</span>
              </p>
              <div className="space-y-2">
                {acts.map((a) => (
                  <ActivityCard
                    key={a.id}
                    a={a}
                    name={me.profile.displayName}
                    now={me.now}
                    received={mockReactionsOn(a.id, me.friendIds, a.createdAt, me.now)}
                    right={
                      <button
                        aria-label="削除"
                        onClick={() => window.confirm("この記録を削除しますか？獲得した経験値も取り消されます") && getRepo().deleteActivity(a.type, a.id)}
                        className="text-xs text-sub"
                      >
                        ✕
                      </button>
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="!p-0">
          {bests.length === 0 && <p className="p-4 text-center text-sm text-sub">筋トレを記録すると自己ベストが表示されます</p>}
          {bests.map((b) => {
            const diff = b.prevE1 != null ? b.lastE1 - b.prevE1 : null;
            return (
              <div key={b.name} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-[10px] text-sub">
                    {b.count}回記録 ・ 最終 {b.last.slice(5).replace("-", "/")}
                    {diff != null && (
                      <span className={`ml-1 font-bold ${diff >= 0 ? "text-good" : "text-bad"}`}>
                        前回比 {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)}kg
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-num text-lg font-bold">{b.maxW}kg</p>
                  <p className="text-[10px] text-sub">推定MAX {b.e1.toFixed(1)}kg</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <button
        onClick={async () => {
          if (window.confirm("この端末のすべての記録を削除してリセットしますか？（元に戻せません）")) {
            await getRepo().resetAll();
            location.href = "/";
          }
        }}
        className="w-full py-3 text-xs text-sub"
      >
        データをリセット
      </button>
    </div>
  );
}
