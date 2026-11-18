import { diffDays, startOfWeek } from "./dates";
import type { TitleRarity } from "./quests";

/**
 * 週替わりボス。毎週月曜に入れ替わり、自分と友達みんなの「その週の経験値」の合計でHPを削る。
 * 倒した週に自分も1回以上運動していれば、そのボスの限定称号がもらえる。
 */
export interface WeeklyBoss {
  id: string;
  name: string;
  /** public/bosses の画像名 */
  image: string;
  hp: number;
  titleId: string;
  titleName: string;
  rarity: TitleRarity;
}

export const WEEKLY_BOSSES: WeeklyBoss[] = [
  { id: "gold_knight", name: "黄金の騎士", image: "extra_gold_knight", hp: 3000, titleId: "w_gold_knight", titleName: "黄金騎士を討つ者", rarity: "SR" },
  { id: "dark_dragon", name: "暗黒竜", image: "tower_4_dragon", hp: 3600, titleId: "w_dark_dragon", titleName: "竜殺しの一団", rarity: "SSR" },
  { id: "iron_colossus", name: "鉄の巨神", image: "final_2_colossus", hp: 3300, titleId: "w_iron_colossus", titleName: "巨神砕き", rarity: "SR" },
  { id: "storm_god", name: "嵐の風神", image: "wind_4_god", hp: 3000, titleId: "w_storm_god", titleName: "嵐を越えし者", rarity: "SR" },
];

/** 基準の月曜日（ここから何週目かでボスが決まる） */
const EPOCH_MONDAY = "2024-01-01";

export function weeklyBossFor(today: string): { boss: WeeklyBoss; weekKey: string; daysLeft: number } {
  const weekKey = startOfWeek(today);
  const n = Math.floor(diffDays(weekKey, EPOCH_MONDAY) / 7);
  const boss = WEEKLY_BOSSES[((n % WEEKLY_BOSSES.length) + WEEKLY_BOSSES.length) % WEEKLY_BOSSES.length];
  return { boss, weekKey, daysLeft: 6 - diffDays(today, weekKey) };
}

export function findWeeklyBoss(id: string) {
  return WEEKLY_BOSSES.find((b) => b.id === id);
}

/** 討伐記録 */
export interface WeeklyClear {
  id: string; // 週の月曜日 YYYY-MM-DD
  bossId: string;
  clearedAt: number;
}
