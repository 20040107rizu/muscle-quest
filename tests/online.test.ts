import { afterEach, describe, expect, it, vi } from "vitest";
import { recompute } from "@/server/recompute";
import { OnlineRepository } from "@/data/online/onlineRepository";
import { MuscleQuestDB } from "@/data/local/db";
import { toDateKey, addDays } from "@/domain/dates";

const now = new Date("2026-11-19T03:00:00Z").getTime(); // 日本時間 12時
const today = "2026-11-19";
const base = { customExercises: [], bodyweightKg: 65, received: {}, now };
const set = (w: number, r: number) => ({ weightKg: w, reps: r });

describe("サーバーでの経験値の計算し直し", () => {
  it("正しい記録は受け付け、経験値はサーバーが計算する（送られた値は使わない）", () => {
    const acts = recompute({
      ...base,
      workouts: [{ id: "w1", exerciseId: "bench_press", date: today, createdAt: now - 1000, sets: [set(60, 10), set(60, 8)], xp: 99999 } as never],
      runs: [{ id: "r1", date: today, createdAt: now - 500, distanceKm: 5, durationS: 1800 }],
    });
    expect(acts.map((a) => a.id)).toEqual(["w1", "r1"]);
    expect(acts[0].xp).toBeGreaterThan(0);
    expect(acts[0].xp).toBeLessThan(1500);
  });

  it("未来の日付・8日以上前の日付・不正な値・ありえないペースは捨てる", () => {
    const acts = recompute({
      ...base,
      workouts: [
        { id: "future", exerciseId: "squat", date: addDays(today, 2), createdAt: now, sets: [set(60, 10)] },
        { id: "old", exerciseId: "squat", date: addDays(today, -9), createdAt: now, sets: [set(60, 10)] },
        { id: "heavy", exerciseId: "dumbbell_curl", date: today, createdAt: now, sets: [set(9999, 10)] },
        { id: "unknown", exerciseId: "nope", date: today, createdAt: now, sets: [set(10, 10)] },
      ],
      runs: [{ id: "fast", date: today, createdAt: now, distanceKm: 10, durationS: 600 }],
    });
    expect(acts).toEqual([]);
  });

  it("前に受け取った記録は、受け取った時刻を基準に日付を確かめる（古い記録が消えない）", () => {
    const old = now - 30 * 86400_000;
    const acts = recompute({
      ...base,
      received: { w1: old },
      workouts: [{ id: "w1", exerciseId: "squat", date: toDateKey(old), createdAt: old, sets: [set(60, 10)] }],
      runs: [],
    });
    expect(acts.length).toBe(1);
    expect(acts[0].receivedAt).toBe(old);
  });

  it("1日の上限（1500）を超えない", () => {
    const workouts = Array.from({ length: 40 }, (_, i) => ({ id: `w${i}`, exerciseId: i % 2 ? "squat" : "deadlift", date: today, createdAt: now - 1000 + i, sets: Array.from({ length: 10 }, () => set(150, 10)) }));
    const acts = recompute({ ...base, workouts, runs: [] });
    expect(acts.reduce((s, a) => s + a.xp, 0)).toBeLessThanOrEqual(1500);
  });
});

describe("オンライン版の端末側", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("記録が無いうちは送らない。記録したら送り、ほかのプレイヤーから自分を除く", async () => {
    const calls: { url: string; body?: { workouts: unknown[]; name: string } }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        if (url === "/api/sync") return new Response(JSON.stringify({ playerId: "me-1" }));
        return new Response(JSON.stringify({ players: [{ id: "me-1", name: "自分", activities: [] }, { id: "p2", name: "相手", activities: [] }] }));
      }),
    );
    const repo = new OnlineRepository(new MuscleQuestDB(`online-${Math.random()}`));
    await repo.init();
    await repo.sync();
    expect(calls.filter((c) => c.url === "/api/sync").length).toBe(0);

    await repo.updateProfile({ displayName: "マッスル太郎" });
    const d = toDateKey(Date.now());
    await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1100, date: d });
    await repo.sync();
    const sent = calls.filter((c) => c.url === "/api/sync");
    expect(sent.length).toBeGreaterThan(0);
    expect(sent[sent.length - 1].body?.name).toBe("マッスル太郎");
    expect(repo.myPlayerId()).toBe("me-1");
    expect((await repo.listPlayers()).map((p) => p.id)).toEqual(["p2"]);
  });
});

describe("応援と対決が相手に届く（端末側）", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("送った応援と申し込んだ対決を送り、申し込まれた対決と届いた応援を受け取る", async () => {
    const sent: { cheers: unknown[]; battles: unknown[] }[] = [];
    const d = toDateKey(Date.now());
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === "/api/sync") {
          sent.push(JSON.parse(String(init!.body)));
          return new Response(JSON.stringify({ playerId: "me-1" }));
        }
        return new Response(
          JSON.stringify({
            players: [{ id: "p2", name: "相手", activities: [{ id: "p2:a1", userId: "p2", type: "run", date: d, createdAt: 1, xp: 10, byStat: {} }] }],
            cheers: { "p2:a1": [{ from: "me-1", kind: "🔥" }] },
            me: { playerId: "me-1", cheers: [{ activityId: "r1", from: "p2", kind: "💪" }], battles: [{ challenger: "p2", opponent: "me-1", start: d, end: addDays(d, 6) }] },
          }),
        );
      }),
    );
    const repo = new OnlineRepository(new MuscleQuestDB(`online-social-${Math.random()}`));
    await repo.init();
    await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1100, date: d });
    const social = await repo.listSocial();
    expect(social.cheers["r1"]).toEqual([{ from: "p2", kind: "💪" }]);
    expect((await repo.listBattles()).map((b) => b.id)).toEqual([`in:p2:${d}`]);
    // 申し込まれた対決があるので、同じ相手には重ねて申し込めない
    expect((await repo.startBattle("p2")).ok).toBe(false);
    await repo.toggleReaction("p2:a1", "🔥");
    await repo.sync();
    const last = sent[sent.length - 1];
    expect(last.cheers).toEqual([{ activityId: "p2:a1", kind: "🔥" }]);
    expect(last.battles).toEqual([]);
  });
});
