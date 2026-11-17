/**
 * ボス画像の場所。ダンジョンID → 各階の画像ファイル名（public/bosses/*.webp）。
 */
import { assetUrl } from "./assets";

export const BOSS_FILES: Record<string, string[]> = {
  cave: ["cave_1_slime", "cave_2_goblin", "cave_3_orc"],
  chest_temple: ["chest_1_sentinel", "chest_2_golem", "chest_3_knight", "chest_4_god"],
  back_mountain: ["back_1_lizard", "back_2_troll", "back_3_eagle", "back_4_giant"],
  leg_castle: ["leg_1_ogre", "leg_2_soldier", "leg_3_king"],
  wind_corridor: ["wind_1_spirit", "wind_2_wolf", "wind_3_bird", "wind_4_god"],
  tower: ["tower_1_shadow", "tower_2_witch", "tower_3_keeper", "tower_4_dragon"],
  final_castle: ["final_1_generals", "final_2_colossus", "final_3_overlord"],
};

export function bossImageUrl(dungeonId: string, floor: number): string | undefined {
  const f = BOSS_FILES[dungeonId]?.[floor];
  return f ? assetUrl(`bosses/${f}.webp`) : undefined;
}
