"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addDays, parseDateKey } from "@/domain/dates";
import { isTimed } from "@/domain/exercises";
import type { Activity } from "@/domain/types";
import { Card } from "./ui/primitives";

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function dayLabel(date: string, today: string) {
  if (date === today) return "今日";
  if (date === addDays(today, -1)) return "昨日";
  const d = parseDateKey(date);
  return `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）`;
}

/**
 * 日ごとのトレーニング一覧。記録した日ではなく「やった日」でまとめる
 * （今日あとから記録した昨日の分は、昨日に入る）。
 */
export function DayLog({ activities, today, renderCard, emptyText = "この日の記録はありません" }: { activities: Activity[]; today: string; renderCard: (a: Activity) => ReactNode; emptyText?: string }) {
  const [date, setDate] = useState(today);
  // 記録がある日（新しい順・直近60日）
  const days = useMemo(() => [...new Set(activities.map((a) => a.date))].filter((d) => d <= today).sort().reverse().slice(0, 60), [activities, today]);
  const list = useMemo(() => activities.filter((a) => a.date === date).sort((a, b) => a.createdAt - b.createdAt), [activities, date]);

  const workouts = list.filter((a) => a.workout);
  const sets = workouts.filter((a) => !isTimed(a.workout!.exerciseId)).reduce((s, a) => s + a.workout!.sets.length, 0);
  const km = list.reduce((s, a) => s + (a.run?.distanceKm ?? 0), 0);
  const xp = list.reduce((s, a) => s + a.xp, 0);
  const chip = (d: string) => (
    <button key={d} onClick={() => setDate(d)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${d === date ? "bg-ink text-bg" : "bg-panel text-sub"}`}>
      {dayLabel(d, today)}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setDate(addDays(date, -1))} className="rounded-lg bg-panel px-3 py-1.5 text-sm text-sub" aria-label="前の日">
          ‹
        </button>
        <p className="font-bold">{dayLabel(date, today)}のトレーニング</p>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
          className="rounded-lg bg-panel px-3 py-1.5 text-sm text-sub disabled:opacity-30"
          aria-label="次の日"
        >
          ›
        </button>
      </div>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {chip(today)}
        {chip(addDays(today, -1))}
        {days.filter((d) => d !== today && d !== addDays(today, -1)).map(chip)}
      </div>
      {list.length > 0 && (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { l: "筋トレ", v: `${workouts.length}種目` },
            { l: "セット", v: `${sets}` },
            { l: "ラン", v: `${km ? km.toFixed(1) : 0}km` },
            { l: "経験値", v: `+${xp}` },
          ].map((x) => (
            <div key={x.l} className="skin-card py-1">
              <p className="text-[10px] text-sub">{x.l}</p>
              <p className="font-num text-base font-bold">{x.v}</p>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2">
        {list.length === 0 ? <Card className="text-center text-sm text-sub">{emptyText}</Card> : list.map((a) => <div key={a.id}>{renderCard(a)}</div>)}
      </div>
    </div>
  );
}
