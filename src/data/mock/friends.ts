import { addDays, parseDateKey, toDateKey } from "@/domain/dates";
import { findExercise } from "@/domain/exercises";
import type { Activity, SetRecord } from "@/domain/types";
import { applyDailyCap, computeRunXp, computeWorkoutXp } from "@/domain/xp";

/**
 * オンライン機能のモック。Supabase 接続後はサーバーから同じ形の Activity を受け取る。
 * 日付と userId から決定的に生成するので、リロードしても内容が変わらない。
 */
export interface MockUser {
  id: string;
  name: string;
  code: string;
  bodyweightKg: number;
  activeRate: number;
  runRate: number;
  /** 分割法：日替わりで回す種目リスト */
  program: string[][];
  /** 種目ごとの60日前の重量 */
  baseWeights: Record<string, number>;
  /** 60日間の重量の伸び率 */
  growth: number;
  runKm: [number, number];
  paceS: [number, number];
  /** 何日前からアプリを使っているか */
  joinedDaysAgo: number;
  comment: string;
}

export const MOCK_USERS: MockUser[] = [
  {
    id: "u_kenta", name: "ケンタ", code: "MQ-2001", bodyweightKg: 78, activeRate: 0.68, runRate: 0.12,
    program: [["bench_press", "incline_db_press", "triceps_pushdown"], ["lat_pulldown", "seated_row", "dumbbell_curl"], ["squat", "leg_press", "ab_crunch"], ["shoulder_press", "lateral_raise", "dumbbell_curl"]],
    baseWeights: { bench_press: 80, incline_db_press: 26, triceps_pushdown: 30, lat_pulldown: 60, seated_row: 55, dumbbell_curl: 14, squat: 90, leg_press: 160, ab_crunch: 40, shoulder_press: 40, lateral_raise: 9 },
    growth: 0.1, runKm: [2, 4], paceS: [330, 380], joinedDaysAgo: 120, comment: "ベンチ100kgが目標",
  },
  {
    id: "u_sora", name: "ソラ", code: "MQ-2002", bodyweightKg: 62, activeRate: 0.75, runRate: 0.72,
    program: [["squat", "leg_curl", "hanging_leg_raise"], ["push_up", "pull_up", "ab_crunch"]],
    baseWeights: { squat: 50, leg_curl: 30, hanging_leg_raise: 0, push_up: 0, pull_up: 0, ab_crunch: 25 },
    growth: 0.08, runKm: [4, 12], paceS: [285, 340], joinedDaysAgo: 90, comment: "フルマラソン完走したい",
  },
  {
    id: "u_hana", name: "ハル", code: "MQ-2003", bodyweightKg: 58, activeRate: 0.55, runRate: 0.35,
    program: [["chest_press", "lat_pulldown", "shoulder_press"], ["leg_press", "leg_extension", "ab_crunch"], ["deadlift", "seated_row", "dumbbell_curl"]],
    baseWeights: { chest_press: 30, lat_pulldown: 35, shoulder_press: 20, leg_press: 80, leg_extension: 30, ab_crunch: 20, deadlift: 60, seated_row: 30, dumbbell_curl: 7 },
    growth: 0.18, runKm: [3, 6], paceS: [350, 420], joinedDaysAgo: 60, comment: "週3ジム継続中",
  },
  {
    id: "u_riku", name: "リク", code: "MQ-2004", bodyweightKg: 70, activeRate: 0.4, runRate: 0.3,
    program: [["chest_press", "lat_pulldown", "leg_press"]],
    baseWeights: { chest_press: 25, lat_pulldown: 30, leg_press: 60 },
    growth: 0.35, runKm: [1.5, 3], paceS: [400, 480], joinedDaysAgo: 21, comment: "筋トレ初心者です",
  },
  {
    id: "u_daichi", name: "ダイチ", code: "MQ-2005", bodyweightKg: 92, activeRate: 0.88, runRate: 0.2,
    program: [["bench_press", "incline_db_press", "lateral_raise", "triceps_pushdown"], ["deadlift", "pull_up", "seated_row", "dumbbell_curl"], ["squat", "leg_press", "leg_curl", "hanging_leg_raise"]],
    baseWeights: { bench_press: 130, incline_db_press: 42, lateral_raise: 14, triceps_pushdown: 50, deadlift: 210, pull_up: 20, seated_row: 90, dumbbell_curl: 22, squat: 180, leg_press: 300, leg_curl: 70, hanging_leg_raise: 10 },
    growth: 0.04, runKm: [3, 5], paceS: [320, 360], joinedDaysAgo: 400, comment: "大会に向けて減量中",
  },
];

export const MOCK_DEFAULT_FRIENDS = ["u_kenta", "u_sora", "u_hana"];

export function findMockUserByCode(code: string) {
  return MOCK_USERS.find((u) => u.code === code);
}

export function findMockUser(id: string) {
  return MOCK_USERS.find((u) => u.id === id);
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HISTORY_DAYS = 60;
const cache = new Map<string, Activity[]>();

/** モックユーザーの活動履歴（新しい順）。今日の分は現在時刻より前のものだけ */
export function mockActivities(user: MockUser, now = Date.now()): Activity[] {
  const today = toDateKey(now);
  const key = `${user.id}:${today}:${Math.floor(now / 600000)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const out: Activity[] = [];
  const days = Math.min(HISTORY_DAYS, user.joinedDaysAgo);
  let programIdx = 0;
  for (let offset = days; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const r = rng(`${user.id}:${date}`);
    if (r() > user.activeRate) continue;
    const dayStart = parseDateKey(date).getTime();
    let createdAt = dayStart + (6 + Math.floor(r() * 15)) * 3600000 + Math.floor(r() * 60) * 60000;
    if (createdAt > now) continue;
    let dayXp = 0;
    const progress = 1 + user.growth * ((days - offset) / Math.max(1, days));

    if (r() < user.runRate) {
      const km = Math.round((user.runKm[0] + r() * (user.runKm[1] - user.runKm[0])) * 10) / 10;
      const pace = user.paceS[0] + r() * (user.paceS[1] - user.paceS[0]);
      const durationS = Math.round(km * pace);
      const xp = applyDailyCap(computeRunXp(km, durationS, 0), dayXp);
      dayXp += xp.total;
      out.push({ id: `${user.id}:${date}:run`, userId: user.id, type: "run", date, createdAt, xp: xp.total, byStat: xp.byStat, run: { distanceKm: km, durationS } });
      createdAt += 45 * 60000;
      if (r() < 0.6) continue;
    }

    const exIds = user.program[programIdx % user.program.length];
    programIdx++;
    exIds.forEach((exId, i) => {
      const ex = findExercise(exId);
      if (!ex) return;
      const nSets = 3 + Math.floor(r() * 2);
      const w = Math.max(0, Math.round(((user.baseWeights[exId] ?? 20) * progress) / ex.step) * ex.step);
      const sets: SetRecord[] = Array.from({ length: nSets }, () => ({ weightKg: w, reps: 8 + Math.floor(r() * 5) }));
      const xp = applyDailyCap(computeWorkoutXp({ exercise: ex, sets, priorSetsToday: 0, bodyweightKg: user.bodyweightKg }), dayXp);
      dayXp += xp.total;
      const at = createdAt + i * 15 * 60000;
      if (at > now) return;
      out.push({ id: `${user.id}:${date}:${exId}`, userId: user.id, type: "workout", date, createdAt: at, xp: xp.total, byStat: xp.byStat, workout: { exerciseId: exId, exerciseName: ex.name, sets } });
    });
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  cache.set(key, out);
  return out;
}

/** 経験値はアプリ開始前の分もあるとみなして、古参ユーザーは底上げする */
export function mockLegacyXp(user: MockUser): number {
  return Math.max(0, user.joinedDaysAgo - HISTORY_DAYS) * 160;
}

/** 自分の投稿に友達から届く応援（モック） */
export function mockReactionsOn(activityId: string, friendIds: string[], createdAt: number, now = Date.now()) {
  if (now - createdAt < 3 * 60000) return [];
  const kinds = ["💪", "🔥", "👏"] as const;
  const out: { userId: string; name: string; kind: (typeof kinds)[number] }[] = [];
  for (const fid of friendIds) {
    const u = findMockUser(fid);
    if (!u) continue;
    const r = rng(`react:${activityId}:${fid}`);
    if (r() < 0.45) out.push({ userId: fid, name: u.name, kind: kinds[Math.floor(r() * 3)] });
  }
  return out;
}
