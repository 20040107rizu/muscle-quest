// ドメイン全体で使う型。UI・DB実装には依存しない。

export const MUSCLE_GROUPS = ["chest", "back", "shoulders", "arms", "legs", "core"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** キャラクターのステータス（筋肉6部位 + 心肺） */
export const STAT_KEYS = [...MUSCLE_GROUPS, "cardio"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type XpBreakdown = Partial<Record<StatKey, number>>;

export const STAT_LABELS: Record<StatKey, string> = {
  chest: "胸",
  back: "背中",
  shoulders: "肩",
  arms: "腕",
  legs: "脚",
  core: "体幹",
  cardio: "心肺",
};

export interface Exercise {
  id: string;
  name: string;
  /** 部位ごとの経験値配分（合計 1.0） */
  distribution: Partial<Record<MuscleGroup, number>>;
  /** 自重種目（体重の一部を負荷として計算） */
  bodyweight?: boolean;
  /** アシスト式マシン（入力重量 = 補助重量。少ないほど高負荷） */
  assist?: boolean;
  /** 秒数で記録する種目（プランクなど）。SetRecord.reps に秒数を入れ、重量は 0 */
  timed?: boolean;
  /** 不正入力防止用の重量上限 (kg) */
  maxWeightKg: number;
  /** 重量ステッパーの刻み (kg) */
  step: number;
  isCustom?: boolean;
}

export interface SetRecord {
  weightKg: number;
  reps: number;
}

/** 1種目ぶんの記録（複数セット） */
export interface WorkoutEntry {
  id: string; // クライアント発行のUUID（重複送信防止キー）
  userId: string;
  date: string; // YYYY-MM-DD（ローカル日付）
  createdAt: number;
  exerciseId: string;
  exerciseName: string;
  sets: SetRecord[];
}

export interface RunRecord {
  id: string;
  userId: string;
  date: string;
  createdAt: number;
  distanceKm: number;
  durationS: number;
}

export type XpSourceType = "workout" | "run" | "mission" | "bonus";

/** 経験値台帳。id = `${sourceType}:${sourceId}` で一意 → 二重計上が構造的に起きない */
export interface XpEvent {
  id: string;
  userId: string;
  sourceType: XpSourceType;
  sourceId: string;
  date: string;
  createdAt: number;
  total: number;
  byStat: XpBreakdown;
}

/** 自分・友達共通の活動フォーマット（タイムライン・ランキング用） */
export interface Activity {
  id: string;
  userId: string;
  type: "workout" | "run";
  date: string;
  createdAt: number;
  xp: number;
  byStat: XpBreakdown;
  workout?: { exerciseId: string; exerciseName: string; sets: SetRecord[] };
  run?: { distanceKm: number; durationS: number };
}

export interface Profile {
  id: string;
  displayName: string;
  bodyweightKg: number;
  friendCode: string;
  createdAt: number;
  /** 表示中の称号 */
  titleId?: string;
  /** 体の後ろにまとうオーラ（アイテムID） */
  aura?: string;
  /** プロフィール写真（小さく縮めた JPEG の data URL）。友達にも見える */
  avatar?: string;
  /** 名前を自分で決めたか（オンライン版では、決めるまで名前の入力を求める） */
  named?: boolean;
}

/** 最後に戦ったときのボスの残りHP（0..1）。HPは戦って初めて分かる */
export interface QuestAttempt {
  id: string; // `${dungeonId}:${floor}`
  dungeonId: string;
  floor: number;
  remaining: number;
  at: number;
}

export interface QuestClear {
  id: string; // `${dungeonId}:${floor}`
  dungeonId: string;
  floor: number;
  clearedAt: number;
}

export interface ValidationResult {
  errors: string[];
  /** 警告は確認すれば保存可能 */
  warnings: string[];
}

/** 保存した筋トレメニュー（例: 胸の日）。順番どおりに種目を進める */
export interface WorkoutMenu {
  id: string;
  name: string;
  exerciseIds: string[];
  createdAt: number;
}

/** 体重と体の写真（写真はこの端末の中だけに保存し、友達には送らない） */
export interface BodyLog {
  id: string; // 日付 YYYY-MM-DD（1日1件）
  date: string;
  weightKg?: number;
  /** 縮小した写真（data URL） */
  photo?: string;
  /** カレンダーに並べる小さい写真（data URL） */
  thumb?: string;
  updatedAt: number;
}
