import type { Activity } from "./types";

export interface Mission {
  id: string;
  label: string;
  bonusXp: number;
  progress: (today: Activity[]) => { current: number; target: number };
}

/** デイリーミッション。報酬は (日付, ミッションID) で一意なので1日1回しか受け取れない */
export const DAILY_MISSIONS: Mission[] = [
  {
    id: "log_workout",
    label: "筋トレを1種目記録する",
    bonusXp: 30,
    progress: (t) => ({ current: Math.min(1, t.filter((a) => a.type === "workout").length), target: 1 }),
  },
  {
    id: "sets_8",
    label: "合計8セットこなす",
    bonusXp: 50,
    progress: (t) => ({
      current: Math.min(8, t.reduce((s, a) => s + (a.workout?.sets.length ?? 0), 0)),
      target: 8,
    }),
  },
  {
    id: "run_2km",
    label: "2km以上走る",
    bonusXp: 40,
    progress: (t) => {
      const km = t.reduce((s, a) => s + (a.run?.distanceKm ?? 0), 0);
      return { current: Math.min(2, Math.round(km * 10) / 10), target: 2 };
    },
  },
];

export function missionEventId(date: string, missionId: string) {
  return `mission:${date}:${missionId}`;
}
