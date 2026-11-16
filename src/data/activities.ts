import type { Activity, RunRecord, WorkoutEntry, XpEvent } from "@/domain/types";

/** 自分の記録をタイムライン/ランキング共通の Activity 形式に変換 */
export function toActivities(workouts: WorkoutEntry[], runs: RunRecord[], xpEvents: XpEvent[]): Activity[] {
  const xp = new Map(xpEvents.map((e) => [e.id, e]));
  const out: Activity[] = [];
  for (const w of workouts) {
    const e = xp.get(`workout:${w.id}`);
    out.push({
      id: w.id,
      userId: w.userId,
      type: "workout",
      date: w.date,
      createdAt: w.createdAt,
      xp: e?.total ?? 0,
      byStat: e?.byStat ?? {},
      workout: { exerciseId: w.exerciseId, exerciseName: w.exerciseName, sets: w.sets },
    });
  }
  for (const r of runs) {
    const e = xp.get(`run:${r.id}`);
    out.push({
      id: r.id,
      userId: r.userId,
      type: "run",
      date: r.date,
      createdAt: r.createdAt,
      xp: e?.total ?? 0,
      byStat: e?.byStat ?? {},
      run: { distanceKm: r.distanceKm, durationS: r.durationS },
    });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

/** ミッション報酬など、Activityに紐づかない経験値を日付ごとに集計 */
export function bonusXpByDate(xpEvents: XpEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of xpEvents) if (e.sourceType === "mission") out[e.date] = (out[e.date] ?? 0) + e.total;
  return out;
}
