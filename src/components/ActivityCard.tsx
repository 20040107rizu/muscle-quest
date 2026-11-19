"use client";

import Link from "next/link";
import { isAssist, isTimed } from "@/domain/exercises";
import { formatDuration, formatPace, timeAgo, toDateKey } from "@/domain/dates";
import type { Activity, SetRecord } from "@/domain/types";
import { volumeOf } from "@/domain/xp";
import { REACTION_KINDS, type ReactionKind } from "@/data/repository";
import { Initial } from "./ui/primitives";

/** セットの要約: 同じ重量×回数が続く部分をまとめる */
export function summarizeSets(sets: SetRecord[], assist = false, timed = false): string {
  const groups: { w: number; r: number; n: number }[] = [];
  for (const s of sets) {
    const last = groups[groups.length - 1];
    if (last && last.w === s.weightKg && last.r === s.reps) last.n++;
    else groups.push({ w: s.weightKg, r: s.reps, n: 1 });
  }
  if (timed) return groups.map((g) => `${g.r}秒${g.n > 1 ? `×${g.n}` : ""}`).join(" / ");
  return groups.map((g) => `${assist ? "補助" : ""}${g.w}kg×${g.r}回${g.n > 1 ? `×${g.n}` : ""}`).join(" / ");
}

export function ActivityBody({ a }: { a: Activity }) {
  if (a.workout) {
    const assist = isAssist(a.workout.exerciseId);
    const timed = isTimed(a.workout.exerciseId);
    return (
      <div>
        <p className="font-bold">{a.workout.exerciseName}</p>
        <p className="mt-0.5 font-num text-sm text-ink/80">{summarizeSets(a.workout.sets, assist, timed)}</p>
        <p className="mt-0.5 text-[11px] text-sub">
          {a.workout.sets.length}セット ・{" "}
          {timed ? `計${a.workout.sets.reduce((s, x) => s + x.reps, 0)}秒` : assist ? `計${a.workout.sets.reduce((s, x) => s + x.reps, 0)}回` : `総挙上 ${volumeOf(a.workout.sets).toLocaleString()}kg`}
        </p>
      </div>
    );
  }
  if (a.run) {
    return (
      <div>
        <p className="font-bold">ランニング</p>
        <p className="mt-0.5 flex gap-3 font-num text-sm">
          <span>
            <b className="text-lg text-cardio">{a.run.distanceKm.toFixed(2)}</b> km
          </span>
          <span>{formatDuration(a.run.durationS)}</span>
          <span>{formatPace(a.run.durationS / a.run.distanceKm)}/km</span>
        </p>
      </div>
    );
  }
  return null;
}

export function ActivityCard({
  a,
  name,
  userHref,
  now,
  myReactions,
  onReact,
  received,
  right,
}: {
  a: Activity;
  name: string;
  userHref?: string;
  now: number;
  myReactions?: Set<string>;
  onReact?: (kind: ReactionKind) => void;
  received?: { name: string; kind: string }[];
  right?: React.ReactNode;
}) {
  const head = (
    <div className="flex items-center gap-2">
      <Initial name={name} size={32} color={a.type === "run" ? "#4cc9f0" : "#ff6b2c"} />
      <div className="leading-tight">
        <p className="text-sm font-bold">{name}</p>
        <p className="text-[10px] text-sub">
          {toDateKey(a.createdAt) !== a.date ? `${Number(a.date.slice(5, 7))}/${Number(a.date.slice(8))}の分・${timeAgo(a.createdAt, now)}に記録` : timeAgo(a.createdAt, now)}
        </p>
      </div>
    </div>
  );
  return (
    <article className="mq-rise skin-card p-2.5">
      <div className="flex items-start justify-between">
        {userHref ? <Link href={userHref}>{head}</Link> : head}
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/15 px-2 py-0.5 font-num text-xs font-bold text-accent">+{a.xp} XP</span>
          {right}
        </div>
      </div>
      <div className="mt-2.5 border-l-2 pl-3" style={{ borderColor: a.type === "run" ? "#4cc9f0" : "#ff6b2c" }}>
        <ActivityBody a={a} />
      </div>
      {onReact && (
        <div className="mt-3 flex gap-1.5">
          {REACTION_KINDS.map((k) => {
            const on = myReactions?.has(`${a.id}:${k}`);
            return (
              <button
                key={k}
                onClick={() => onReact(k)}
                className={`rounded-full border px-3 py-1 text-sm transition ${on ? "border-accent bg-accent/15" : "border-line bg-panel-2 opacity-70"}`}
                aria-pressed={on}
              >
                {k}
                {on && <span className="ml-1 text-[10px] font-bold text-accent">応援済</span>}
              </button>
            );
          })}
        </div>
      )}
      {received && received.length > 0 && (
        <p className="mt-2 text-[11px] text-sub">
          {received.map((r) => `${r.kind}${r.name}`).join("  ")} から応援
        </p>
      )}
    </article>
  );
}
