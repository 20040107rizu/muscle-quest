import { addDays } from "./dates";
import type { Activity } from "./types";

/**
 * 友達との1週間対決。申し込んだ日から7日間に稼いだ経験値（筋トレ・ランの分だけ。
 * 会心・宝箱などのおまけは含めない）で勝負する。
 */
export interface Battle {
  id: string;
  friendId: string;
  start: string;
  end: string;
  createdAt: number;
}

export const BATTLE_DAYS = 7;
export const MAX_ACTIVE_BATTLES = 3;

export function battleEnd(start: string) {
  return addDays(start, BATTLE_DAYS - 1);
}

export function battleScore(activities: Activity[], b: Pick<Battle, "start" | "end">): number {
  return activities.filter((a) => a.date >= b.start && a.date <= b.end).reduce((s, a) => s + a.xp, 0);
}

export type BattleState = "active" | "won" | "lost" | "draw";

export function battleState(b: Battle, today: string, mine: number, theirs: number): BattleState {
  if (today <= b.end) return "active";
  return mine > theirs ? "won" : mine < theirs ? "lost" : "draw";
}
