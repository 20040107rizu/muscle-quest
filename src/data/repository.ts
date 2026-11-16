import type { GearSlot } from "@/domain/items";
import type { Reward } from "@/domain/quests";
import type { Activity, Exercise, MuscleGroup, Profile, QuestClear, RunRecord, SetRecord, StatKey, WorkoutEntry, XpEvent } from "@/domain/types";

/**
 * データアクセスの抽象。画面はこのインターフェースだけに依存する。
 * MVP: LocalRepository (IndexedDB)。本番: SupabaseRepository に差し替え。
 */
export interface SaveResult {
  ok: boolean;
  errors: string[];
  /** confirm=false で警告がある場合は保存せずに返す */
  warnings: string[];
  xpGained: number;
  byStat: Partial<Record<StatKey, number>>;
  capped: boolean;
  levelBefore: number;
  levelAfter: number;
  /** 同じIDで既に保存済みだった（二重送信） */
  duplicate?: boolean;
}

export interface ChallengeResult {
  ok: boolean;
  errors: string[];
  /** この挑戦でダンジョンを踏破した場合の報酬 */
  reward: Reward | null;
  duplicate?: boolean;
}

export interface WorkoutInput {
  id: string;
  exerciseId: string;
  sets: SetRecord[];
  date: string;
}

export interface RunInput {
  id: string;
  distanceKm: number;
  durationS: number;
  date: string;
}

export interface Repository {
  /** 初回起動時の初期化（プロフィール作成など）。冪等 */
  init(): Promise<Profile>;
  getProfile(): Promise<Profile | undefined>;
  updateProfile(patch: Partial<Pick<Profile, "displayName" | "bodyweightKg">>): Promise<void>;

  listCustomExercises(): Promise<Exercise[]>;
  addCustomExercise(name: string, group: MuscleGroup, bodyweight: boolean): Promise<Exercise>;

  saveWorkout(input: WorkoutInput, opts?: { confirm?: boolean }): Promise<SaveResult>;
  saveRun(input: RunInput, opts?: { confirm?: boolean }): Promise<SaveResult>;
  deleteActivity(type: "workout" | "run", id: string): Promise<void>;
  claimMission(date: string, missionId: string): Promise<SaveResult>;

  listWorkouts(): Promise<WorkoutEntry[]>;
  listRuns(): Promise<RunRecord[]>;
  listXpEvents(): Promise<XpEvent[]>;

  // ---- クエスト ----
  listQuestClears(): Promise<QuestClear[]>;
  /** ボスに挑戦。条件はサーバー側（ここ）で記録から再計算して判定する */
  challengeFloor(dungeonId: string, floor: number): Promise<ChallengeResult>;
  /** 獲得済みのアイテムだけ装備できる。null で外す */
  equipItem(slot: GearSlot, itemId: string | null): Promise<void>;
  setTitle(titleId: string | null): Promise<void>;

  // ---- ソーシャル ----
  listFriendIds(): Promise<string[]>;
  addFriendByCode(code: string): Promise<{ ok: boolean; error?: string; userId?: string }>;
  removeFriend(userId: string): Promise<void>;
  toggleReaction(activityId: string, kind: ReactionKind): Promise<void>;
  listMyReactions(): Promise<Reaction[]>;

  /** この端末のデータをすべて削除（開発・検証用） */
  resetAll(): Promise<void>;
}

export const REACTION_KINDS = ["💪", "🔥", "👏"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export interface Reaction {
  id: string; // `${activityId}:${kind}`
  activityId: string;
  kind: ReactionKind;
  createdAt: number;
}

export type { Activity };
