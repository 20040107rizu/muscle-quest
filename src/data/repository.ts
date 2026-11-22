import type { Reward } from "@/domain/quests";
import type { Activity, BodyLog, Exercise, MuscleGroup, Profile, QuestAttempt, QuestClear, RunRecord, SetRecord, StatKey, WorkoutEntry, WorkoutMenu, XpEvent } from "@/domain/types";
import type { Battle } from "@/domain/battle";
import type { ChestTier } from "@/domain/chest";
import type { WeeklyClear } from "@/domain/weekly";

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
  /** 会心ボーナス（0 なら会心なし） */
  critXp?: number;
  /** 自己ベスト更新ボーナス（0 なら更新なし） */
  prXp?: number;
  /** 自己ベスト更新の内容（例: 「推定1RM 82.5kg」） */
  prLabel?: string;
  /** 今日この記録が何件目か（コンボ表示用） */
  comboToday?: number;
  /** この記録で新しく手に入ったオーラ（レベル・連続日数の節目など） */
  newItems?: string[];
  /** この記録で新しく手に入った称号 */
  newTitles?: string[];
  /** 毎日の宝箱を開けたときの中身 */
  chest?: { tier: ChestTier; xp: number };
}

export interface ChallengeResult {
  ok: boolean;
  errors: string[];
  /** この挑戦でダンジョンを踏破した場合の報酬 */
  reward: Reward | null;
  duplicate?: boolean;
  /** 戦闘後のボスの残りHP（0..1）。挑戦できなかった場合は undefined */
  remaining?: number;
  /** 撃破で新しく手に入ったオーラ（撃破と同時に条件を満たしたもの） */
  newItems?: string[];
  /** 撃破で新しく手に入った称号 */
  newTitles?: string[];
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
  /** プロフィール写真（小さく縮めた JPEG の data URL）。null で外す */
  setAvatar(dataUrl: string | null): Promise<void>;

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
  /** 各ボスと最後に戦ったときの残りHP */
  listQuestAttempts(): Promise<QuestAttempt[]>;
  /** ボスに挑戦。条件はサーバー側（ここ）で記録から再計算して判定する */
  challengeFloor(dungeonId: string, floor: number): Promise<ChallengeResult>;
  /** 獲得済みのオーラだけまとえる。null で外す */
  setAura(auraId: string | null): Promise<void>;
  setTitle(titleId: string | null): Promise<void>;

  // ---- 筋トレメニュー ----
  listMenus(): Promise<WorkoutMenu[]>;
  /** id を渡すとそのメニューを書き換える（無ければ新しく作る） */
  saveMenu(name: string, exerciseIds: string[], id?: string): Promise<WorkoutMenu>;
  deleteMenu(id: string): Promise<void>;

  // ---- 体重・写真（写真は端末の中だけ） ----
  listBodyLogs(): Promise<BodyLog[]>;
  /** その日の体重・写真を保存（どちらか片方だけでもよい）。今日の体重はプロフィールの体重にも反映 */
  saveBodyLog(date: string, patch: { weightKg?: number; photo?: string | null; thumb?: string }): Promise<void>;

  // ---- 毎日の宝箱 ----
  /** 今日1回以上運動していれば開けられる（1日1回） */
  openDailyChest(date: string): Promise<SaveResult>;

  // ---- 週替わりボス ----
  listWeeklyClears(): Promise<WeeklyClear[]>;
  /** 今週のボスの討伐報酬を受け取る。HPは自分と友達の今週の経験値から計算する */
  claimWeeklyBoss(date: string): Promise<{ ok: boolean; error?: string; titleId?: string }>;

  // ---- 友達との対決 ----
  listBattles(): Promise<Battle[]>;
  startBattle(friendId: string): Promise<{ ok: boolean; error?: string }>;

  // ---- ソーシャル ----
  /**
   * ほかのプレイヤー全員（自分以外）。遊んでいる人は全員お互いに友達として表示する。
   * 筋トレかランを1回以上記録した人だけを返す。端末だけで動く版では空。
   */
  listPlayers(): Promise<PlayerSnapshot[]>;
  /**
   * ほかのプレイヤーと、応援（記録ID → 誰が何を送ったか）。自分の記録あての応援も入る（記録IDは自分の端末のID）。
   * 自分のプレイヤーID（まだ無ければ undefined）も返す。
   */
  listSocial(): Promise<Social>;
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

export interface Social {
  players: PlayerSnapshot[];
  cheers: Record<string, { from: string; kind: string }[]>;
  meId?: string;
}

/** ほかのプレイヤーの公開情報（体重・写真・メニューなどは含めない） */
export interface PlayerSnapshot {
  id: string;
  name: string;
  titleId?: string;
  aura?: string;
  /** プロフィール写真の URL（設定していなければ undefined） */
  avatarUrl?: string;
  /** 撃破したクエストの階（「ダンジョンID:階」。サーバーが確かめたもの） */
  clears?: string[];
  /** 筋トレメニュー */
  menus?: { name: string; exercises: { id: string; name: string }[] }[];
  activities: Activity[];
}
