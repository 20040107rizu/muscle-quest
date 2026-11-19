import { diffDays } from "./dates";
import { paceSecPerKm } from "./xp";
import type { Exercise, RunRecord, SetRecord, ValidationResult } from "./types";

/** 過去何日まで遡って記録できるか */
export const MAX_BACKFILL_DAYS = 7;
/** 人間の限界に近いペース（秒/km）。これより速い記録は拒否 */
export const FASTEST_PACE = 150;
/** これより遅いペースはランニングとして扱わない（秒/km） */
export const SLOWEST_PACE = 1200;

export function validateDate(date: string, today: string): string[] {
  const d = diffDays(today, date);
  if (d < 0) return ["未来の日付には記録できません"];
  if (d > MAX_BACKFILL_DAYS) return [`記録できるのは${MAX_BACKFILL_DAYS}日前までです`];
  return [];
}

export function validateSets(
  ex: Exercise,
  sets: SetRecord[],
  bestWeightKg: number | null,
  date: string,
  today: string,
  bodyweightKg?: number,
): ValidationResult {
  const errors: string[] = [...validateDate(date, today)];
  const warnings: string[] = [];
  if (sets.length === 0) errors.push("セットを1つ以上入力してください");
  if (sets.length > 20) errors.push("1回の記録は20セットまでです");
  sets.forEach((s, i) => {
    const n = i + 1;
    if (!Number.isFinite(s.weightKg) || s.weightKg < 0) errors.push(`${n}セット目: 重量が不正です`);
    else if (s.weightKg > ex.maxWeightKg) errors.push(`${n}セット目: ${ex.name}は${ex.maxWeightKg}kgまでです`);
    if (ex.timed) {
      if (!Number.isInteger(s.reps) || s.reps < 5) errors.push(`${n}セット目: 時間は5秒以上`);
      else if (s.reps > 600) errors.push(`${n}セット目: 時間は600秒（10分）までです`);
      if (s.weightKg !== 0) errors.push(`${n}セット目: この種目は重さを入れません`);
    } else if (!Number.isInteger(s.reps) || s.reps < 1) errors.push(`${n}セット目: 回数は1回以上`);
    else if (s.reps > 100) errors.push(`${n}セット目: 回数は100回までです`);
    if (ex.assist && bodyweightKg != null && s.weightKg >= bodyweightKg) errors.push(`${n}セット目: アシスト重量は体重(${bodyweightKg}kg)未満にしてください`);
    if (!ex.bodyweight && !ex.assist && s.weightKg === 0) warnings.push(`${n}セット目: 重量が0kgです`);
  });
  const top = Math.max(0, ...sets.map((s) => s.weightKg));
  if (!ex.assist && bestWeightKg != null && bestWeightKg > 0 && top > bestWeightKg * 1.3 && top - bestWeightKg >= 10) {
    warnings.push(`自己ベスト(${bestWeightKg}kg)を大きく上回っています。入力ミスはありませんか？`);
  }
  return { errors: dedupe(errors), warnings: dedupe(warnings) };
}

export function validateRun(
  run: Pick<RunRecord, "distanceKm" | "durationS" | "date">,
  existing: RunRecord[],
  today: string,
): ValidationResult {
  const errors: string[] = [...validateDate(run.date, today)];
  const warnings: string[] = [];
  if (!(run.distanceKm >= 0.1)) errors.push("距離は0.1km以上で入力してください");
  if (run.distanceKm > 100) errors.push("距離は100kmまでです");
  if (!(run.durationS >= 60)) errors.push("時間は1分以上で入力してください");
  if (run.durationS > 24 * 3600) errors.push("時間が長すぎます");
  if (errors.length === 0) {
    const pace = paceSecPerKm(run.distanceKm, run.durationS);
    if (pace < FASTEST_PACE) errors.push("ペースが速すぎます（人間の限界を超えています）");
    if (pace > SLOWEST_PACE) errors.push("ペースが遅すぎます（20分/km超はランとして記録できません）");
    if (isDuplicateRun(run, existing)) errors.push("同じ日に同じ内容のランが既に記録されています");
    const sameDayKm = existing.filter((r) => r.date === run.date).reduce((a, r) => a + r.distanceKm, 0);
    if (sameDayKm + run.distanceKm > 50) warnings.push("1日の走行距離が50kmを超えます。入力ミスはありませんか？");
  }
  return { errors, warnings };
}

export function isDuplicateRun(run: Pick<RunRecord, "distanceKm" | "durationS" | "date">, existing: RunRecord[]): boolean {
  return existing.some(
    (r) => r.date === run.date && Math.abs(r.distanceKm - run.distanceKm) < 0.05 && Math.abs(r.durationS - run.durationS) <= 5,
  );
}

function dedupe(a: string[]) {
  return [...new Set(a)];
}
