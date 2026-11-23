import { validateRun, validateSets } from "@/domain/antiCheat";
import { findExercise, makeCustomExercise } from "@/domain/exercises";
import { MUSCLE_GROUPS, type Exercise, type MuscleGroup, type RunRecord, type SetRecord, type XpBreakdown } from "@/domain/types";
import { applyDailyCap, computeRunXp, computeWorkoutXp } from "@/domain/xp";
import { buildCharacter } from "@/domain/character";
import { buildQuestStats, simulateClears } from "@/domain/quests";
import type { Activity } from "@/domain/types";

/**
 * サーバー側で経験値を計算し直す。ブラウザから送られた経験値は使わない。
 * - 記録の日付は「サーバーが初めて受け取った時刻」から7日前まで（未来は不可）
 * - 1日の上限・同じ種目のやりすぎによる逓減・不正な値のチェックは、端末の計算と同じ
 * - 会心・自己ベスト・宝箱などのおまけは含めない（ランキングや対決にも使わないため）
 * - チェックに通らなかった記録は捨てる
 */
export interface SyncWorkout {
  id: string;
  exerciseId: string;
  date: string;
  createdAt: number;
  sets: SetRecord[];
}
export interface SyncRun {
  id: string;
  date: string;
  createdAt: number;
  distanceKm: number;
  durationS: number;
}
export interface SyncCustomExercise {
  id: string;
  name: string;
  group: MuscleGroup;
  bodyweight: boolean;
}
export interface ServerActivity {
  id: string;
  type: "workout" | "run";
  date: string;
  createdAt: number;
  receivedAt: number;
  xp: number;
  byStat: XpBreakdown;
  detail: { exerciseId: string; exerciseName: string; sets: SetRecord[] } | { distanceKm: number; durationS: number };
}

/** 受け取った時刻の「日付」。端末の時差（日本など）を考えて、未来側は14時間まで許す */
function latestLocalDate(receivedAt: number) {
  const d = new Date(receivedAt + 14 * 3600_000);
  return d.toISOString().slice(0, 10);
}

/**
 * 送られてきた「撃破した階」のうち、記録から見て本当に倒せる力があるものだけを返す。
 * （記録からの条件を満たしている階だけを順に進めた結果と照らし合わせる）
 */
export function verifyClears(acts: ServerActivity[], claimed: unknown, now: number): string[] {
  if (!Array.isArray(claimed)) return [];
  const activities: Activity[] = acts.map((a) => ({
    id: a.id,
    userId: "",
    type: a.type,
    date: a.date,
    createdAt: a.createdAt,
    xp: a.xp,
    byStat: a.byStat,
    ...(a.type === "workout" ? { workout: a.detail as Activity["workout"] } : { run: a.detail as Activity["run"] }),
  }));
  const today = latestLocalDate(now);
  const character = buildCharacter(activities.map((a) => ({ total: a.xp, byStat: a.byStat, date: a.date })), activities.map((a) => a.date), today);
  const possible = simulateClears(buildQuestStats(activities, character, today), true);
  return [...new Set(claimed.map(String))].filter((id) => possible.has(id)).slice(0, 200);
}

export function recompute(input: {
  workouts: SyncWorkout[];
  runs: SyncRun[];
  customExercises: SyncCustomExercise[];
  bodyweightKg: number;
  /** 記録ID → サーバーが初めて受け取った時刻（新しい記録は無い） */
  received: Record<string, number>;
  now: number;
}): ServerActivity[] {
  const custom: Exercise[] = input.customExercises
    .filter((c) => MUSCLE_GROUPS.includes(c.group))
    .map((c) => makeCustomExercise(c.id, String(c.name).slice(0, 30), c.group, !!c.bodyweight));
  const bw = Math.min(250, Math.max(30, Number(input.bodyweightKg) || 65));

  type Item = { kind: "w"; w: SyncWorkout } | { kind: "r"; r: SyncRun };
  const items: Item[] = [...input.workouts.map((w) => ({ kind: "w" as const, w })), ...input.runs.map((r) => ({ kind: "r" as const, r }))];
  const at = (i: Item) => (i.kind === "w" ? i.w.createdAt : i.r.createdAt);
  items.sort((a, b) => at(a) - at(b));

  const out: ServerActivity[] = [];
  const xpByDate = new Map<string, number>();
  const bestWeight = new Map<string, number>();
  const runsSoFar: RunRecord[] = [];
  const setsByExDate = new Map<string, number>();

  for (const it of items) {
    const id = it.kind === "w" ? it.w.id : it.r.id;
    const receivedAt = input.received[id] ?? input.now;
    const createdAt = Math.min(Number(at(it)) || receivedAt, receivedAt + 600_000);
    const today = latestLocalDate(receivedAt);

    if (it.kind === "w") {
      const w = it.w;
      const ex = findExercise(w.exerciseId, custom);
      if (!ex || !Array.isArray(w.sets)) continue;
      const sets = w.sets.map((s) => ({ weightKg: Number(s.weightKg), reps: Math.round(Number(s.reps)) }));
      const best = bestWeight.get(ex.id) ?? null;
      const v = validateSets(ex, sets, best, w.date, today, bw);
      if (v.errors.length) continue;
      const key = `${ex.id}:${w.date}`;
      const prior = setsByExDate.get(key) ?? 0;
      const raw = computeWorkoutXp({ exercise: ex, sets, priorSetsToday: prior, bodyweightKg: bw });
      const gained = applyDailyCap(raw, xpByDate.get(w.date) ?? 0);
      setsByExDate.set(key, prior + sets.length);
      xpByDate.set(w.date, (xpByDate.get(w.date) ?? 0) + gained.total);
      bestWeight.set(ex.id, Math.max(best ?? 0, ...sets.map((s) => s.weightKg)));
      out.push({ id, type: "workout", date: w.date, createdAt, receivedAt, xp: gained.total, byStat: gained.byStat, detail: { exerciseId: ex.id, exerciseName: ex.name, sets } });
    } else {
      const r = it.r;
      const run = { distanceKm: Number(r.distanceKm), durationS: Math.round(Number(r.durationS)), date: r.date };
      const v = validateRun(run, runsSoFar, today);
      if (v.errors.length) continue;
      const priorKm = runsSoFar.filter((x) => x.date === run.date).reduce((a, x) => a + x.distanceKm, 0);
      const gained = applyDailyCap(computeRunXp(run.distanceKm, run.durationS, priorKm), xpByDate.get(run.date) ?? 0);
      xpByDate.set(run.date, (xpByDate.get(run.date) ?? 0) + gained.total);
      runsSoFar.push({ id, userId: "", createdAt, ...run });
      out.push({ id, type: "run", date: run.date, createdAt, receivedAt, xp: gained.total, byStat: gained.byStat, detail: { distanceKm: run.distanceKm, durationS: run.durationS } });
    }
  }
  return out;
}

