import type { Exercise, MuscleGroup, Profile } from "@/domain/types";
import { findExercise, primaryGroup } from "@/domain/exercises";
import { LocalRepository } from "../local/localRepository";
import type { PlayerSnapshot, ReactionKind, RunInput, SaveResult, Social, WorkoutInput } from "../repository";

/**
 * オンライン版。記録は今まで通りこの端末（IndexedDB）に保存し、
 * 変更があるたびに少し待ってからサーバー（/api/sync）へ送る。経験値はサーバーで計算し直される。
 * ほかのプレイヤーは /api/players から取る（筋トレかランを1回以上記録した人だけ）。
 * 端末は「合言葉（トークン）」で見分ける。合言葉はこの端末の中だけに保存する。
 */
const KEY = "mq-online";

interface Identity {
  token: string;
  playerId?: string;
}

function loadIdentity(): Identity {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v && /^[a-f0-9]{64}$/.test(v.token)) return v;
  } catch {
    // 保存できない環境では毎回新しい合言葉になる
  }
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const id: Identity = { token: [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("") };
  saveIdentity(id);
  return id;
}
function saveIdentity(id: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(id));
  } catch {
    // 無視
  }
}

export class OnlineRepository extends LocalRepository {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private syncing = false;
  private again = false;
  private identity: Identity | null = null;

  private id() {
    return (this.identity ??= loadIdentity());
  }

  /** 自分のプレイヤーID（まだ送ったことがなければ undefined） */
  myPlayerId() {
    return this.id().playerId;
  }

  /** 少し待ってからまとめて送る（連続で記録しても1回で済む） */
  queueSync(delay = 1500) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), delay);
  }

  async sync(): Promise<void> {
    if (this.syncing) {
      this.again = true;
      return;
    }
    this.syncing = true;
    try {
      const [profile, workouts, runs, custom, reactions, battles] = await Promise.all([
        this.getProfile(),
        this.listWorkouts(),
        this.listRuns(),
        this.listCustomExercises(),
        this.listMyReactions(),
        this.listBattles(),
      ]);
      // 記録が1件もない端末は登録しない（開いただけの人は友達に出さない）
      if (!profile || workouts.length + runs.length === 0) return;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: this.id().token,
          name: profile.named ? profile.displayName : "",
          titleId: profile.titleId ?? null,
          aura: profile.aura ?? null,
          bodyweightKg: profile.bodyweightKg,
          customExercises: custom.map((e: Exercise) => ({ id: e.id, name: e.name, group: primaryGroup(e) as MuscleGroup, bodyweight: !!e.bodyweight })),
          workouts: workouts.map((w) => ({ id: w.id, exerciseId: w.exerciseId, date: w.date, createdAt: w.createdAt, sets: w.sets })),
          runs: runs.map((r) => ({ id: r.id, date: r.date, createdAt: r.createdAt, distanceKm: r.distanceKm, durationS: r.durationS })),
          // ほかの人の記録（ID が「プレイヤーID:記録ID」）への応援だけ送る
          cheers: reactions.filter((x) => x.activityId.includes(":")).map((x) => ({ activityId: x.activityId, kind: x.kind })),
          // 自分が申し込んだ対決だけ送る（申し込まれた対決は "in:" で始まる）
          battles: battles.filter((b) => !b.id.startsWith("in:")).map((b) => ({ friendId: b.friendId, start: b.start })),
          avatar: profile.avatar ?? null,
          clears: (await this.listQuestClears()).map((c) => c.id),
          menus: (await this.listMenus()).map((m) => ({
            name: m.name,
            exercises: m.exerciseIds.map((id) => ({ id, name: findExercise(id, custom)?.name ?? "" })).filter((e) => e.name),
          })),
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { playerId?: string };
        if (j.playerId && j.playerId !== this.id().playerId) {
          this.identity = { ...this.id(), playerId: j.playerId };
          saveIdentity(this.identity);
        }
      }
    } catch {
      // 通信できないときは次の変更で送り直す
    } finally {
      this.syncing = false;
      if (this.again) {
        this.again = false;
        this.queueSync(500);
      }
    }
  }

  async init(): Promise<Profile> {
    const p = await super.init();
    this.queueSync(800);
    return p;
  }

  async listPlayers(): Promise<PlayerSnapshot[]> {
    return (await this.listSocial()).players;
  }

  /**
   * ほかのプレイヤー・応援・自分あての受け取り（応援と、申し込まれた対決）。
   * 申し込まれた対決はこの端末にも保存して、自分の対決一覧に出す。
   */
  async listSocial(): Promise<Social> {
    try {
      const res = await fetch("/api/players", { headers: { "x-mq-token": this.id().token }, cache: "no-store" });
      if (!res.ok) return { players: [], cheers: {} };
      const j = (await res.json()) as {
        players: PlayerSnapshot[];
        cheers: Social["cheers"];
        me: { playerId: string; cheers: { activityId: string; from: string; kind: string }[]; battles: { challenger: string; opponent: string; start: string; end: string }[] } | null;
      };
      if (j.me?.playerId && j.me.playerId !== this.id().playerId) {
        this.identity = { ...this.id(), playerId: j.me.playerId };
        saveIdentity(this.identity);
      }
      const me = this.myPlayerId();
      const others = j.players.filter((p) => p.id !== me);
      this.playerCount = others.filter((p) => p.activities.length > 0).length;
      const cheers: Social["cheers"] = { ...j.cheers };
      // 自分の記録あての応援は、この端末の記録IDで引けるようにする
      for (const c of j.me?.cheers ?? []) (cheers[c.activityId] ??= []).push({ from: c.from, kind: c.kind });
      if (me && j.me) {
        const incoming = j.me.battles.filter((b) => b.opponent === me);
        for (const b of incoming) {
          const id = `in:${b.challenger}:${b.start}`;
          if (!(await this.db.battles.get(id))) await this.db.battles.put({ id, friendId: b.challenger, start: b.start, end: b.end, createdAt: Date.now() });
        }
      }
      return { players: others, cheers, meId: me };
    } catch {
      return { players: [], cheers: {} };
    }
  }

  async toggleReaction(activityId: string, kind: ReactionKind) {
    await super.toggleReaction(activityId, kind);
    this.queueSync();
  }
  async challengeFloor(dungeonId: string, floor: number) {
    const r = await super.challengeFloor(dungeonId, floor);
    if (r.ok) this.queueSync(500);
    return r;
  }
  async startBattle(friendId: string) {
    const r = await super.startBattle(friendId);
    if (r.ok) this.queueSync(300);
    return r;
  }

  async saveWorkout(input: WorkoutInput, opts?: { confirm?: boolean }): Promise<SaveResult> {
    const r = await super.saveWorkout(input, opts);
    if (r.ok) this.queueSync();
    return r;
  }
  async saveRun(input: RunInput, opts?: { confirm?: boolean }): Promise<SaveResult> {
    const r = await super.saveRun(input, opts);
    if (r.ok) this.queueSync();
    return r;
  }
  async deleteActivity(type: "workout" | "run", id: string) {
    await super.deleteActivity(type, id);
    this.queueSync();
  }
  async updateProfile(patch: Parameters<LocalRepository["updateProfile"]>[0]) {
    await super.updateProfile(patch);
    this.queueSync();
  }
  async setTitle(titleId: string | null) {
    await super.setTitle(titleId);
    this.queueSync();
  }
  async saveMenu(name: string, exerciseIds: string[], id?: string) {
    const m = await super.saveMenu(name, exerciseIds, id);
    this.queueSync();
    return m;
  }
  async deleteMenu(id: string) {
    await super.deleteMenu(id);
    this.queueSync();
  }
  async setAvatar(dataUrl: string | null) {
    await super.setAvatar(dataUrl);
    this.queueSync(300);
  }
  async setAura(auraId: string | null) {
    await super.setAura(auraId);
    this.queueSync();
  }
}
