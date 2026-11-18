import { validateRun, validateSets } from "@/domain/antiCheat";
import { toDateKey } from "@/domain/dates";
import { findExercise, makeCustomExercise } from "@/domain/exercises";
import { DAILY_MISSIONS, missionEventId } from "@/domain/missions";
import type { Exercise, MuscleGroup, Profile, XpEvent } from "@/domain/types";
import { applyDailyCap, bestE1RM, computeRunXp, computeWorkoutXp, levelFromXp } from "@/domain/xp";
import { critBonus, isCritical, PR_BONUS } from "@/domain/bonus";
import { findMockUserByCode, MOCK_DEFAULT_FRIENDS } from "../mock/friends";
import { toActivities } from "../activities";
import { buildCharacter } from "@/domain/character";
import { findItem } from "@/domain/items";
import { buildQuestStats, clearId, currentFloor, findDungeon, floorProgress, isDungeonCleared, isUnlocked, ownedRewards } from "@/domain/quests";
import type { ChallengeResult, Reaction, ReactionKind, Repository, RunInput, SaveResult, WorkoutInput } from "../repository";
import { MuscleQuestDB } from "./db";

export const ME = "me";

const emptyResult = (level: number): SaveResult => ({
  ok: false,
  errors: [],
  warnings: [],
  xpGained: 0,
  byStat: {},
  capped: false,
  levelBefore: level,
  levelAfter: level,
});

function uuid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class LocalRepository implements Repository {
  constructor(
    private db = new MuscleQuestDB(),
    private now: () => number = () => Date.now(),
  ) {}

  private today() {
    return toDateKey(this.now());
  }

  /** 読み取り専用（ライブクエリ内から呼べる） */
  getProfile(): Promise<Profile | undefined> {
    return this.db.profile.get(ME);
  }

  /** 初回起動時にプロフィールを作成 */
  async init(): Promise<Profile> {
    const p = await this.db.profile.get(ME);
    if (p) return p;
    const created: Profile = {
      id: ME,
      displayName: "あなた",
      bodyweightKg: 65,
      friendCode: `MQ-${String(Math.floor(1000 + Math.random() * 9000))}`,
      createdAt: this.now(),
    };
    await this.db.transaction("rw", this.db.profile, this.db.friendships, async () => {
      await this.db.profile.put(created);
      // 初回は数人の友達が既にいる状態にする（モック）
      for (const userId of MOCK_DEFAULT_FRIENDS) await this.db.friendships.put({ userId, createdAt: this.now() });
    });
    return created;
  }

  async updateProfile(patch: Partial<Pick<Profile, "displayName" | "bodyweightKg">>) {
    const p = await this.init();
    const next = { ...p };
    if (patch.displayName != null) next.displayName = patch.displayName.trim().slice(0, 20) || p.displayName;
    if (patch.bodyweightKg != null && patch.bodyweightKg >= 30 && patch.bodyweightKg <= 250) next.bodyweightKg = patch.bodyweightKg;
    await this.db.profile.put(next);
  }

  listCustomExercises() {
    return this.db.exercises.toArray();
  }

  async addCustomExercise(name: string, group: MuscleGroup, bodyweight: boolean): Promise<Exercise> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("種目名を入力してください");
    const ex = makeCustomExercise(`custom_${uuid()}`, trimmed.slice(0, 30), group, bodyweight);
    await this.db.exercises.put(ex);
    return ex;
  }

  private async totalXp() {
    return (await this.db.xpEvents.toArray()).reduce((a, e) => a + e.total, 0);
  }

  /** その日の（ミッション以外の）獲得経験値 */
  private async xpOnDate(date: string) {
    const evs = await this.db.xpEvents.where("date").equals(date).toArray();
    return evs.filter((e) => e.sourceType !== "mission" && e.sourceType !== "bonus").reduce((a, e) => a + e.total, 0);
  }

  async saveWorkout(input: WorkoutInput, opts: { confirm?: boolean } = {}): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.workouts, db.runs, db.xpEvents, db.profile, db.exercises, db.questClears], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.ownedItemIds();
      const res = emptyResult(before);

      // 同じIDの再送信は何もしない（二重計上防止）
      if (await db.workouts.get(input.id)) return { ...res, ok: true, duplicate: true };

      const custom = await db.exercises.toArray();
      const ex = findExercise(input.exerciseId, custom);
      if (!ex) return { ...res, errors: ["種目が見つかりません"] };

      const sets = input.sets.map((s) => ({ weightKg: Number(s.weightKg), reps: Math.round(Number(s.reps)) }));
      const history = await db.workouts.where("exerciseId").equals(ex.id).toArray();
      const best = history.length ? Math.max(...history.flatMap((h) => h.sets.map((s) => s.weightKg))) : null;
      const bodyweightKg = (await db.profile.get(ME))?.bodyweightKg ?? 65;
      const v = validateSets(ex, sets, best, input.date, this.today(), bodyweightKg);
      if (v.errors.length) return { ...res, errors: v.errors, warnings: v.warnings };
      if (v.warnings.length && !opts.confirm) return { ...res, warnings: v.warnings };

      const priorSetsToday = history.filter((h) => h.date === input.date).reduce((a, h) => a + h.sets.length, 0);
      const raw = computeWorkoutXp({ exercise: ex, sets, priorSetsToday, bodyweightKg });
      const gained = applyDailyCap(raw, await this.xpOnDate(input.date));

      const createdAt = this.now();
      await db.workouts.put({
        id: input.id,
        userId: ME,
        date: input.date,
        createdAt,
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets,
      });
      await this.putXp("workout", input.id, input.date, createdAt, gained.total, gained.byStat);

      // ご褒美: 会心（確率）と自己ベスト更新（推定1RM。アシスト種目は対象外）
      const critXp = gained.total > 0 && isCritical(input.id) ? critBonus(gained.total) : 0;
      const prevBest = Math.max(0, ...history.map((h) => bestE1RM(h.sets)));
      const newBest = bestE1RM(sets);
      const isPR = !ex.assist && history.length > 0 && newBest > prevBest;
      const prXp = isPR ? PR_BONUS : 0;
      await this.putBonus(input.id, input.date, createdAt, critXp, prXp, gained.byStat, gained.total);
      const comboToday = (await db.workouts.where("date").equals(input.date).count()) + (await db.runs.where("date").equals(input.date).count());
      const after = levelFromXp(await this.totalXp()).level;
      return {
        ...res,
        ok: true,
        warnings: v.warnings,
        xpGained: gained.total,
        byStat: gained.byStat,
        capped: gained.capped,
        levelAfter: after,
        critXp,
        prXp,
        prLabel: isPR ? `推定1RM ${newBest.toFixed(1)}kg（前回まで ${prevBest.toFixed(1)}kg）` : undefined,
        comboToday,
        newItems: await this.newItemsSince(ownedBefore),
      };
    });
  }

  async saveRun(input: RunInput, opts: { confirm?: boolean } = {}): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.runs, db.workouts, db.xpEvents, db.questClears], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.ownedItemIds();
      const res = emptyResult(before);
      if (await db.runs.get(input.id)) return { ...res, ok: true, duplicate: true };

      const existing = await db.runs.toArray();
      const run = { distanceKm: Number(input.distanceKm), durationS: Math.round(Number(input.durationS)), date: input.date };
      const v = validateRun(run, existing, this.today());
      if (v.errors.length) return { ...res, errors: v.errors, warnings: v.warnings };
      if (v.warnings.length && !opts.confirm) return { ...res, warnings: v.warnings };

      const priorKm = existing.filter((r) => r.date === run.date).reduce((a, r) => a + r.distanceKm, 0);
      const gained = applyDailyCap(computeRunXp(run.distanceKm, run.durationS, priorKm), await this.xpOnDate(run.date));
      const createdAt = this.now();
      await db.runs.put({ id: input.id, userId: ME, createdAt, ...run });
      await this.putXp("run", input.id, run.date, createdAt, gained.total, gained.byStat);

      const critXp = gained.total > 0 && isCritical(input.id) ? critBonus(gained.total) : 0;
      const longest = Math.max(0, ...existing.map((r) => r.distanceKm));
      const isPR = existing.length > 0 && run.distanceKm > longest;
      const prXp = isPR ? PR_BONUS : 0;
      await this.putBonus(input.id, run.date, createdAt, critXp, prXp, gained.byStat, gained.total);
      const comboToday = (await db.workouts.where("date").equals(run.date).count()) + (await db.runs.where("date").equals(run.date).count());
      const after = levelFromXp(await this.totalXp()).level;
      return {
        ...res,
        ok: true,
        warnings: v.warnings,
        xpGained: gained.total,
        byStat: gained.byStat,
        capped: gained.capped,
        levelAfter: after,
        critXp,
        prXp,
        prLabel: isPR ? `最長距離 ${run.distanceKm}km（前回まで ${longest}km）` : undefined,
        comboToday,
        newItems: await this.newItemsSince(ownedBefore),
      };
    });
  }

  async claimMission(date: string, missionId: string): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.workouts, db.runs, db.xpEvents, db.questClears], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.ownedItemIds();
      const res = emptyResult(before);
      const mission = DAILY_MISSIONS.find((m) => m.id === missionId);
      if (!mission) return { ...res, errors: ["ミッションが見つかりません"] };
      if (date !== this.today()) return { ...res, errors: ["今日のミッションのみ受け取れます"] };
      const evId = missionEventId(date, missionId);
      if (await db.xpEvents.get(evId)) return { ...res, ok: true, duplicate: true };

      const acts = toActivities(
        await db.workouts.where("date").equals(date).toArray(),
        await db.runs.where("date").equals(date).toArray(),
        await db.xpEvents.where("date").equals(date).toArray(),
      );
      const p = mission.progress(acts);
      if (p.current < p.target) return { ...res, errors: ["まだ達成していません"] };

      await db.xpEvents.put({
        id: evId,
        userId: ME,
        sourceType: "mission",
        sourceId: `${date}:${missionId}`,
        date,
        createdAt: this.now(),
        total: mission.bonusXp,
        byStat: {},
      });
      const after = levelFromXp(await this.totalXp()).level;
      return { ...res, ok: true, xpGained: mission.bonusXp, levelAfter: after, newItems: await this.newItemsSince(ownedBefore) };
    });
  }

  /** 会心・自己ベストのボーナス。会心分は部位にも配分（体が育つ）、自己ベスト分は部位なし */
  private async putBonus(recordId: string, date: string, createdAt: number, critXp: number, prXp: number, byStat: XpEvent["byStat"], base: number) {
    const total = critXp + prXp;
    if (total <= 0) return;
    const scaled: XpEvent["byStat"] = {};
    if (critXp > 0 && base > 0) {
      for (const [k, v] of Object.entries(byStat)) scaled[k as keyof typeof scaled] = Math.round(((v ?? 0) * critXp) / base);
    }
    await this.putXp("bonus", recordId, date, createdAt, total, scaled);
  }

  private putXp(sourceType: XpEvent["sourceType"], sourceId: string, date: string, createdAt: number, total: number, byStat: XpEvent["byStat"]) {
    return this.db.xpEvents.put({ id: `${sourceType}:${sourceId}`, userId: ME, sourceType, sourceId, date, createdAt, total, byStat });
  }

  async deleteActivity(type: "workout" | "run", id: string) {
    const db = this.db;
    await db.transaction("rw", [db.workouts, db.runs, db.xpEvents], async () => {
      if (type === "workout") await db.workouts.delete(id);
      else await db.runs.delete(id);
      await db.xpEvents.delete(`${type}:${id}`);
      await db.xpEvents.delete(`bonus:${id}`);
    });
  }

  listWorkouts() {
    return this.db.workouts.orderBy("createdAt").reverse().toArray();
  }
  listRuns() {
    return this.db.runs.orderBy("createdAt").reverse().toArray();
  }
  listXpEvents() {
    return this.db.xpEvents.toArray();
  }

  async listFriendIds() {
    return (await this.db.friendships.toArray()).map((f) => f.userId);
  }

  async addFriendByCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const me = await this.init();
    if (normalized === me.friendCode) return { ok: false, error: "自分のコードです" };
    const user = findMockUserByCode(normalized);
    if (!user) return { ok: false, error: "ユーザーが見つかりません" };
    if (await this.db.friendships.get(user.id)) return { ok: false, error: "既に友達です" };
    await this.db.friendships.put({ userId: user.id, createdAt: this.now() });
    return { ok: true, userId: user.id };
  }

  async removeFriend(userId: string) {
    await this.db.friendships.delete(userId);
  }

  async toggleReaction(activityId: string, kind: ReactionKind) {
    const id = `${activityId}:${kind}`;
    if (await this.db.reactions.get(id)) await this.db.reactions.delete(id);
    else await this.db.reactions.put({ id, activityId, kind, createdAt: this.now() });
  }

  listMyReactions(): Promise<Reaction[]> {
    return this.db.reactions.toArray();
  }

  // ---------- クエスト ----------

  listQuestClears() {
    return this.db.questClears.toArray();
  }

  listQuestAttempts() {
    return this.db.questAttempts.toArray();
  }

  private async clearedSet() {
    return new Set((await this.db.questClears.toArray()).map((c) => c.id));
  }

  /** 記録から判定用の数値を計算（画面から渡された値は信用しない） */
  private async questStats() {
    const [workouts, runs, xpEvents] = await Promise.all([this.db.workouts.toArray(), this.db.runs.toArray(), this.db.xpEvents.toArray()]);
    const today = this.today();
    const acts = toActivities(workouts, runs, xpEvents);
    const c = buildCharacter(xpEvents, acts.map((a) => a.date), today);
    return buildQuestStats(acts, { level: c.level, stats: c.stats, streak: c.streak, activeDays: c.activeDays }, today);
  }

  async challengeFloor(dungeonId: string, floor: number): Promise<ChallengeResult> {
    const db = this.db;
    return db.transaction("rw", [db.questClears, db.questAttempts, db.workouts, db.runs, db.xpEvents], async () => {
      const fail = (e: string): ChallengeResult => ({ ok: false, errors: [e], reward: null });
      const d = findDungeon(dungeonId);
      if (!d || !d.floors[floor]) return fail("ダンジョンが見つかりません");
      const cleared = await this.clearedSet();
      if (cleared.has(clearId(dungeonId, floor))) return { ok: true, errors: [], reward: null, duplicate: true };
      if (!isUnlocked(d, cleared)) return fail("まだ解放されていません");
      if (currentFloor(d, cleared) !== floor) return fail("前の階をクリアしてください");
      // 残りHPは記録から計算し、ここで保存する（画面からは書き換えられない）
      const ownedBefore = await this.ownedItemIds();
      const prog = floorProgress(d.floors[floor], await this.questStats());
      const id = clearId(dungeonId, floor);
      const remaining = prog.ready ? 0 : Math.round((1 - prog.ratio) * 1000) / 1000;
      await db.questAttempts.put({ id, dungeonId, floor, remaining, at: this.now() });
      if (!prog.ready) return { ...fail("まだ力が足りない…条件を満たしてから再挑戦しよう"), remaining };
      await db.questClears.put({ id, dungeonId, floor, clearedAt: this.now() });
      cleared.add(id);
      return { ok: true, errors: [], reward: isDungeonCleared(d, cleared) ? d.reward : null, remaining: 0, newItems: await this.newItemsSince(ownedBefore) };
    });
  }

  /** 今持っているアイテム（クリア状況・レベル・連続日数から計算） */
  private async ownedItemIds(): Promise<string[]> {
    return ownedRewards(await this.clearedSet(), await this.questStats()).items;
  }

  private async newItemsSince(before: string[]): Promise<string[]> {
    const now = await this.ownedItemIds();
    return now.filter((id) => !before.includes(id));
  }

  async setAura(auraId: string | null) {
    const p = await this.init();
    if (auraId && (!findItem(auraId) || !(await this.ownedItemIds()).includes(auraId))) throw new Error("このオーラはまだ手に入れていません");
    await this.db.profile.put({ ...p, aura: auraId ?? undefined });
  }

  async setTitle(titleId: string | null) {
    const p = await this.init();
    if (titleId && !ownedRewards(await this.clearedSet(), await this.questStats()).titles.includes(titleId)) throw new Error("この称号はまだ獲得していません");
    await this.db.profile.put({ ...p, titleId: titleId ?? undefined });
  }

  async resetAll() {
    await this.db.delete();
  }
}

export const newId = uuid;
