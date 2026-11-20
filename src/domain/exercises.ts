import type { Exercise, MuscleGroup } from "./types";

/** ジムにある定番種目。distribution は鍛えられる部位への経験値配分 */
export const PRESET_EXERCISES: Exercise[] = [
  { id: "bench_press", name: "ベンチプレス", distribution: { chest: 0.7, shoulders: 0.15, arms: 0.15 }, maxWeightKg: 400, step: 2.5 },
  { id: "chest_press", name: "チェストプレス", distribution: { chest: 0.75, shoulders: 0.1, arms: 0.15 }, maxWeightKg: 300, step: 2.5 },
  { id: "incline_db_press", name: "インクラインダンベルプレス", distribution: { chest: 0.6, shoulders: 0.3, arms: 0.1 }, maxWeightKg: 100, step: 1 },
  { id: "close_grip_bench", name: "ベンチプレス（クローズグリップ）", distribution: { chest: 0.5, arms: 0.4, shoulders: 0.1 }, maxWeightKg: 300, step: 2.5 },
  { id: "incline_chest_press", name: "インクラインチェストプレス（マシン）", distribution: { chest: 0.75, shoulders: 0.15, arms: 0.1 }, maxWeightKg: 250, step: 2.5 },
  { id: "cable_crossover", name: "ケーブルクロスオーバー", distribution: { chest: 0.85, shoulders: 0.15 }, maxWeightKg: 150, step: 2.5 },
  { id: "dips", name: "ディップス", distribution: { chest: 0.5, arms: 0.4, shoulders: 0.1 }, bodyweight: true, maxWeightKg: 100, step: 2.5 },
  { id: "push_up", name: "腕立て伏せ", distribution: { chest: 0.6, arms: 0.25, core: 0.15 }, bodyweight: true, maxWeightKg: 100, step: 5 },
  { id: "lat_pulldown", name: "ラットプルダウン", distribution: { back: 0.75, arms: 0.25 }, maxWeightKg: 250, step: 2.5 },
  { id: "seated_row", name: "シーテッドロー", distribution: { back: 0.75, arms: 0.15, shoulders: 0.1 }, maxWeightKg: 250, step: 2.5 },
  { id: "one_arm_db_row", name: "ワンハンド・ダンベルローイング", distribution: { back: 0.75, arms: 0.15, shoulders: 0.1 }, maxWeightKg: 80, step: 1 },
  { id: "assisted_chin", name: "チンニングマシン", distribution: { back: 0.65, arms: 0.35 }, assist: true, maxWeightKg: 150, step: 2.5 },
  { id: "pull_up", name: "懸垂", distribution: { back: 0.7, arms: 0.3 }, bodyweight: true, maxWeightKg: 100, step: 2.5 },
  { id: "deadlift", name: "デッドリフト", distribution: { back: 0.45, legs: 0.4, core: 0.15 }, maxWeightKg: 500, step: 2.5 },
  { id: "squat", name: "スクワット", distribution: { legs: 0.8, core: 0.2 }, maxWeightKg: 500, step: 2.5 },
  { id: "leg_press", name: "レッグプレス", distribution: { legs: 1.0 }, maxWeightKg: 600, step: 5 },
  { id: "leg_extension", name: "レッグエクステンション", distribution: { legs: 1.0 }, maxWeightKg: 200, step: 2.5 },
  { id: "leg_curl", name: "レッグカール", distribution: { legs: 1.0 }, maxWeightKg: 200, step: 2.5 },
  { id: "shoulder_press", name: "ショルダープレス", distribution: { shoulders: 0.8, arms: 0.2 }, maxWeightKg: 250, step: 2.5 },
  { id: "standing_db_press", name: "スタンディング・ダンベルショルダープレス", distribution: { shoulders: 0.75, arms: 0.15, core: 0.1 }, maxWeightKg: 80, step: 1 },
  { id: "lateral_raise", name: "サイドレイズ", distribution: { shoulders: 1.0 }, maxWeightKg: 60, step: 1 },
  { id: "dumbbell_curl", name: "ダンベルカール", distribution: { arms: 1.0 }, maxWeightKg: 80, step: 1 },
  { id: "triceps_pushdown", name: "トライセプスプッシュダウン", distribution: { arms: 1.0 }, maxWeightKg: 150, step: 2.5 },
  { id: "ab_crunch", name: "アブドミナルクランチ", distribution: { core: 1.0 }, maxWeightKg: 200, step: 2.5 },
  { id: "hanging_leg_raise", name: "ハンギングレッグレイズ", distribution: { core: 0.85, arms: 0.15 }, bodyweight: true, maxWeightKg: 50, step: 2.5 },
  { id: "bent_knee_situp", name: "ベントニーシットアップ", distribution: { core: 1.0 }, bodyweight: true, maxWeightKg: 30, step: 1 },
  { id: "floor_crunch", name: "クランチ（床・脚上げ）", distribution: { core: 1.0 }, bodyweight: true, maxWeightKg: 30, step: 1 },
  { id: "twist_crunch", name: "ツイストクランチ", distribution: { core: 1.0 }, bodyweight: true, maxWeightKg: 30, step: 1 },
  { id: "front_plank", name: "フロントプランク", distribution: { core: 0.8, shoulders: 0.1, chest: 0.1 }, bodyweight: true, timed: true, maxWeightKg: 0, step: 1 },
  { id: "twist_leg_raise", name: "ツイストレッグレイズ", distribution: { core: 1.0 }, bodyweight: true, maxWeightKg: 30, step: 1 },
  { id: "seated_knee_up", name: "シーテッド・ニーアップ", distribution: { core: 1.0 }, bodyweight: true, maxWeightKg: 30, step: 1 },
];

export const EXERCISE_GROUP_ORDER: { group: MuscleGroup; label: string }[] = [
  { group: "chest", label: "胸" },
  { group: "back", label: "背中" },
  { group: "legs", label: "脚" },
  { group: "shoulders", label: "肩" },
  { group: "arms", label: "腕" },
  { group: "core", label: "体幹" },
];

/** 配分が一番大きい部位 = メイン部位 */
export function primaryGroup(ex: Exercise): MuscleGroup {
  let best: MuscleGroup = "chest";
  let max = -1;
  for (const [g, v] of Object.entries(ex.distribution) as [MuscleGroup, number][]) {
    if (v > max) {
      max = v;
      best = g;
    }
  }
  return best;
}

/** ユーザー追加種目。メイン部位を1つ選ぶだけで作れる（初心者向け） */
export function makeCustomExercise(id: string, name: string, group: MuscleGroup, bodyweight = false): Exercise {
  return {
    id,
    name: name.trim(),
    distribution: { [group]: 1.0 },
    bodyweight,
    maxWeightKg: 500,
    step: 2.5,
    isCustom: true,
  };
}

/** アシスト式（重量が少ないほど強い）種目か */
/** 自重種目（腕立て・懸垂・腹筋など）か */
export function isBodyweight(id: string): boolean {
  return !!PRESET_EXERCISES.find((e) => e.id === id)?.bodyweight;
}

/** 秒数で記録する種目（プランクなど）か */
export function isTimed(id: string): boolean {
  return !!PRESET_EXERCISES.find((e) => e.id === id)?.timed;
}

export function isAssist(id: string): boolean {
  return !!PRESET_EXERCISES.find((e) => e.id === id)?.assist;
}

export function findExercise(id: string, custom: Exercise[] = []): Exercise | undefined {
  return PRESET_EXERCISES.find((e) => e.id === id) ?? custom.find((e) => e.id === id);
}
