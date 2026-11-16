import type { RunRecord } from "./types";
import { paceSecPerKm } from "./xp";

export const BEST_DISTANCES = [1, 3, 5, 10];

/** Xkm 以上走ったランのペースから Xkm のタイムを換算し、最速を返す */
export function bestTimeFor(runs: Pick<RunRecord, "distanceKm" | "durationS">[], km: number): number | null {
  const c = runs.filter((r) => r.distanceKm >= km).map((r) => paceSecPerKm(r.distanceKm, r.durationS) * km);
  return c.length ? Math.min(...c) : null;
}
