import { validateRun, validateSets } from "@/domain/antiCheat";
import { toDateKey } from "@/domain/dates";
import { findExercise, makeCustomExercise } from "@/domain/exercises";
import { DAILY_MISSIONS, missionEventId } from "@/domain/missions";
import type { Activity, BodyLog, Exercise, MuscleGroup, Profile, WorkoutMenu, XpEvent } from "@/domain/types";
import { applyDailyCap, bestE1RM, computeRunXp, computeWorkoutXp, levelFromXp } from "@/domain/xp";
import { critBonus, isCritical, PR_BONUS } from "@/domain/bonus";
import { findMockUser, findMockUserByCode, mockActivities, MOCK_DEFAULT_FRIENDS } from "../mock/friends";
import { chestEventId, rollChest } from "@/domain/chest";
import { weeklyBossFor } from "@/domain/weekly";
import { battleEnd, MAX_ACTIVE_BATTLES } from "@/domain/battle";
import { toActivities } from "../activities";
import { buildCharacter } from "@/domain/character";
import { findItem } from "@/domain/items";
import { buildQuestStats, clearId, currentFloor, findDungeon, floorProgress, isDungeonCleared, isUnlocked, ownedRewards, titleStatsFrom } from "@/domain/quests";
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
    return db.transaction("rw", [db.workouts, db.runs, db.xpEvents, db.profile, db.exercises, db.questClears, db.weeklyClears, db.friendships, db.reactions], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.snapshot();
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
        ...(await this.gained(ownedBefore)),
      };
    });
  }

  async saveRun(input: RunInput, opts: { confirm?: boolean } = {}): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.runs, db.workouts, db.xpEvents, db.questClears, db.weeklyClears, db.friendships, db.reactions], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.snapshot();
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
        ...(await this.gained(ownedBefore)),
      };
    });
  }

  async claimMission(date: string, missionId: string): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.workouts, db.runs, db.xpEvents, db.questClears, db.weeklyClears, db.friendships, db.reactions], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.snapshot();
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
      return { ...res, ok: true, xpGained: mission.bonusXp, levelAfter: after, ...(await this.gained(ownedBefore)) };
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
    return db.transaction("rw", [db.questClears, db.questAttempts, db.workouts, db.runs, db.xpEvents, db.weeklyClears, db.friendships, db.reactions], async () => {
      const fail = (e: string): ChallengeResult => ({ ok: false, errors: [e], reward: null });
      const d = findDungeon(dungeonId);
      if (!d || !d.floors[floor]) return fail("ダンジョンが見つかりません");
      const cleared = await this.clearedSet();
      if (cleared.has(clearId(dungeonId, floor))) return { ok: true, errors: [], reward: null, duplicate: true };
      if (!isUnlocked(d, cleared)) return fail("まだ解放されていません");
      if (currentFloor(d, cleared) !== floor) return fail("前の階をクリアしてください");
      // 残りHPは記録から計算し、ここで保存する（画面からは書き換えられない）
      const ownedBefore = await this.snapshot();
      const prog = floorProgress(d.floors[floor], await this.questStats());
      const id = clearId(dungeonId, floor);
      const remaining = prog.ready ? 0 : Math.round((1 - prog.ratio) * 1000) / 1000;
      await db.questAttempts.put({ id, dungeonId, floor, remaining, at: this.now() });
      if (!prog.ready) return { ...fail("まだ力が足りない…条件を満たしてから再挑戦しよう"), remaining };
      await db.questClears.put({ id, dungeonId, floor, clearedAt: this.now() });
      cleared.add(id);
      return { ok: true, errors: [], reward: isDungeonCleared(d, cleared) ? d.reward : null, remaining: 0, ...(await this.gained(ownedBefore)) };
    });
  }

  /** 今持っているオーラ（レベル・連続日数・走行距離から計算） */
  private async ownedItemIds(): Promise<string[]> {
    return ownedRewards(await this.clearedSet(), await this.questStats()).items;
  }

  /** 今持っている称号（記録・クエスト・週替わりボス・友達・応援から計算） */
  private async ownedTitleIds(): Promise<string[]> {
    const [workouts, runs, xpEvents, weekly, friends, cheers] = await Promise.all([
      this.db.workouts.toArray(),
      this.db.runs.toArray(),
      this.db.xpEvents.toArray(),
      this.db.weeklyClears.toArray(),
      this.db.friendships.count(),
      this.db.reactions.count(),
    ]);
    const cleared = await this.clearedSet();
    const questStats = await this.questStats();
    const activities = toActivities(workouts, runs, xpEvents);
    const ts = titleStatsFrom({ activities, questStats, cleared, weeklyBosses: weekly.length, friends, cheers });
    return ownedRewards(cleared, questStats, weekly.map((w) => w.bossId), ts).titles;
  }

  /** 記録の前後で持ち物を比べ、新しく手に入ったオーラと称号を返す */
  private async snapshot() {
    return { items: await this.ownedItemIds(), titles: await this.ownedTitleIds() };
  }
  private async gained(before: { items: string[]; titles: string[] }) {
    const now = await this.snapshot();
    return { newItems: now.items.filter((id) => !before.items.includes(id)), newTitles: now.titles.filter((id) => !before.titles.includes(id)) };
  }


  async setAura(auraId: string | null) {
    const p = await this.init();
    if (auraId && (!findItem(auraId) || !(await this.ownedItemIds()).includes(auraId))) throw new Error("このオーラはまだ手に入れていません");
    await this.db.profile.put({ ...p, aura: auraId ?? undefined });
  }

  async setTitle(titleId: string | null) {
    const p = await this.init();
    if (titleId && !(await this.ownedTitleIds()).includes(titleId)) throw new Error("この称号はまだ獲得していません");
    await this.db.profile.put({ ...p, titleId: titleId ?? undefined });
  }

  // ---------- 筋トレメニュー ----------

  listMenus() {
    return this.db.menus.orderBy("createdAt").toArray();
  }

  async saveMenu(name: string, exerciseIds: string[]): Promise<WorkoutMenu> {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) throw new Error("メニュー名を入力してください");
    const custom = await this.db.exercises.toArray();
    const ids = [...new Set(exerciseIds)].filter((id) => findExercise(id, custom)).slice(0, 12);
    if (!ids.length) throw new Error("種目を1つ以上入れてください");
    const menu: WorkoutMenu = { id: uuid(), name: trimmed, exerciseIds: ids, createdAt: this.now() };
    await this.db.menus.put(menu);
    return menu;
  }

  async deleteMenu(id: string) {
    await this.db.menus.delete(id);
  }

  // ---------- 体重・写真 ----------

  listBodyLogs(): Promise<BodyLog[]> {
    return this.db.bodyLogs.orderBy("date").toArray();
  }

  async saveBodyLog(date: string, patch: { weightKg?: number; photo?: string | null }) {
    const today = this.today();
    if (date > today) throw new Error("未来の日付には記録できません");
    if (patch.weightKg != null && (patch.weightKg < 30 || patch.weightKg > 250)) throw new Error("体重は30〜250kgで入力してください");
    if (patch.photo && patch.photo.length > 1_500_000) throw new Error("写真が大きすぎます");
    const cur = (await this.db.bodyLogs.get(date)) ?? { id: date, date, updatedAt: 0 };
    const next: BodyLog = { ...cur, updatedAt: this.now() };
    if (patch.weightKg != null) next.weightKg = Math.round(patch.weightKg * 10) / 10;
    if (patch.photo === null) delete next.photo;
    else if (patch.photo) next.photo = patch.photo;
    if (next.weightKg == null && !next.photo) await this.db.bodyLogs.delete(date);
    else await this.db.bodyLogs.put(next);
    // 最新の体重は経験値の計算（自重種目など）にも使う
    if (patch.weightKg != null) {
      const latest = (await this.db.bodyLogs.orderBy("date").reverse().toArray()).find((l) => l.weightKg != null);
      if (latest?.date === date) await this.updateProfile({ bodyweightKg: next.weightKg });
    }
  }

  // ---------- 毎日の宝箱 ----------

  async openDailyChest(date: string): Promise<SaveResult> {
    const db = this.db;
    return db.transaction("rw", [db.workouts, db.runs, db.xpEvents, db.profile, db.questClears, db.weeklyClears, db.friendships, db.reactions], async () => {
      const before = levelFromXp(await this.totalXp()).level;
      const ownedBefore = await this.snapshot();
      const res = emptyResult(before);
      if (date !== this.today()) return { ...res, errors: ["今日の宝箱だけ開けられます"] };
      const p = await this.init();
      const roll = rollChest(p.friendCode, date);
      if (await db.xpEvents.get(chestEventId(date))) return { ...res, ok: true, duplicate: true, chest: roll };
      const moved = (await db.workouts.where("date").equals(date).count()) + (await db.runs.where("date").equals(date).count());
      if (!moved) return { ...res, errors: ["今日1回運動すると開けられます"] };
      await this.putXp("bonus", `chest:${date}`, date, this.now(), roll.xp, {});
      const after = levelFromXp(await this.totalXp()).level;
      return { ...res, ok: true, xpGained: roll.xp, levelAfter: after, chest: roll, ...(await this.gained(ownedBefore)) };
    });
  }

  // ---------- 週替わりボス ----------

  listWeeklyClears() {
    return this.db.weeklyClears.toArray();
  }

  /** その週に稼いだ経験値（筋トレ・ランの分だけ） */
  private async myXpBetween(from: string, to: string) {
    const [workouts, runs, xpEvents] = await Promise.all([this.db.workouts.toArray(), this.db.runs.toArray(), this.db.xpEvents.toArray()]);
    return sumXpBetween(toActivities(workouts, runs, xpEvents), from, to);
  }

  async claimWeeklyBoss(date: string) {
    const today = this.today();
    if (date !== today) return { ok: false, error: "今週のボスだけ受け取れます" };
    const { boss, weekKey } = weeklyBossFor(today);
    if (await this.db.weeklyClears.get(weekKey)) return { ok: true, titleId: boss.titleId };
    const mine = await this.myXpBetween(weekKey, today);
    if (mine <= 0) return { ok: false, error: "今週まだ運動していません。1回運動すると受け取れます" };
    let team = mine;
    for (const id of await this.listFriendIds()) {
      const u = findMockUser(id);
      if (u) team += sumXpBetween(mockActivities(u, this.now()), weekKey, today);
    }
    if (team < boss.hp) return { ok: false, error: "まだ倒せていません" };
    await this.db.weeklyClears.put({ id: weekKey, bossId: boss.id, clearedAt: this.now() });
    return { ok: true, titleId: boss.titleId };
  }

  // ---------- 友達との対決 ----------

  listBattles() {
    return this.db.battles.orderBy("start").reverse().toArray();
  }

  async startBattle(friendId: string) {
    if (!(await this.db.friendships.get(friendId))) return { ok: false, error: "友達ではありません" };
    const today = this.today();
    const all = await this.db.battles.toArray();
    const active = all.filter((b) => b.end >= today);
    if (active.some((b) => b.friendId === friendId)) return { ok: false, error: "この友達とは対決中です" };
    if (active.length >= MAX_ACTIVE_BATTLES) return { ok: false, error: `同時に対決できるのは${MAX_ACTIVE_BATTLES}人までです` };
    await this.db.battles.put({ id: `${friendId}:${today}`, friendId, start: today, end: battleEnd(today), createdAt: this.now() });
    return { ok: true };
  }

  async resetAll() {
    await this.db.delete();
  }
}

export const newId = uuid;

function sumXpBetween(acts: Activity[], from: string, to: string) {
  return acts.filter((a) => a.date >= from && a.date <= to).reduce((s, a) => s + a.xp, 0);
}
