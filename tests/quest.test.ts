import { beforeEach, describe, expect, it } from "vitest";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { toDateKey } from "@/domain/dates";
import { findExercise } from "@/domain/exercises";
import { buildQuestStats, DUNGEONS, evaluate, ownedRewards, simulateClears } from "@/domain/quests";
import { computeWorkoutXp } from "@/domain/xp";

const today = toDateKey(Date.now());
let repo: LocalRepository;
let n = 0;
beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`quest-${n++}`));
  await repo.init();
});

describe("チンニングマシン", () => {
  const chin = findExercise("assisted_chin")!;
  it("アシストが少ないほど経験値が多い", () => {
    const easy = computeWorkoutXp({ exercise: chin, sets: [{ weightKg: 40, reps: 10 }], priorSetsToday: 0, bodyweightKg: 70 }).total;
    const hard = computeWorkoutXp({ exercise: chin, sets: [{ weightKg: 10, reps: 10 }], priorSetsToday: 0, bodyweightKg: 70 }).total;
    expect(hard).toBeGreaterThan(easy);
  });
  it("体重以上のアシストは拒否", async () => {
    const r = await repo.saveWorkout({ id: "c", exerciseId: "assisted_chin", date: today, sets: [{ weightKg: 80, reps: 10 }] });
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch("アシスト");
  });
  it("背中と腕に経験値が入る", async () => {
    const r = await repo.saveWorkout({ id: "c", exerciseId: "assisted_chin", date: today, sets: [{ weightKg: 20, reps: 8 }] });
    expect(r.byStat.back!).toBeGreaterThan(r.byStat.arms!);
  });
});

describe("クエスト", () => {
  it("条件を満たさないとクリアできない", async () => {
    const r = await repo.challengeFloor("cave", 0);
    expect(r.ok).toBe(false);
  });

  it("鍛えると階をクリアでき、同じ階は二重にクリアされない", async () => {
    await repo.saveWorkout({ id: "w", exerciseId: "squat", date: today, sets: Array.from({ length: 5 }, () => ({ weightKg: 60, reps: 10 })) });
    expect((await repo.challengeFloor("cave", 0)).ok).toBe(true);
    expect((await repo.challengeFloor("cave", 0)).duplicate).toBe(true);
    // 順番を飛ばせない
    expect((await repo.challengeFloor("cave", 2)).ok).toBe(false);
  });

  it("戦った後の残りHPが保存され、勝つと0になる", async () => {
    await repo.saveWorkout({ id: "w1", exerciseId: "squat", date: today, sets: [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }] });
    const lost = await repo.challengeFloor("cave", 0);
    expect(lost.ok).toBe(false);
    expect(lost.remaining).toBeCloseTo(0.6, 2); // 5セット中2セット → 残り60%
    expect((await repo.listQuestAttempts()).find((a) => a.id === "cave:0")?.remaining).toBeCloseTo(0.6, 2);
    await repo.saveWorkout({ id: "w2", exerciseId: "squat", date: today, sets: Array.from({ length: 3 }, () => ({ weightKg: 60, reps: 10 })) });
    const won = await repo.challengeFloor("cave", 0);
    expect(won.ok).toBe(true);
    expect(won.remaining).toBe(0);
  });

  it("未解放のダンジョンには挑めない", async () => {
    expect((await repo.challengeFloor("chest_temple", 0)).errors[0]).toMatch("解放");
  });

  it("未獲得のアイテム・称号は装備できない", async () => {
    await expect(repo.equipItem("head", "headband_white")).rejects.toThrow();
    await expect(repo.setTitle("adventurer")).rejects.toThrow();
  });

  it("条件の評価と全踏破報酬", () => {
    const s = buildQuestStats([], { level: 40, stats: { chest: 9e3, back: 9e3, shoulders: 9e3, arms: 9e3, legs: 9e3, core: 9e3, cardio: 9e3 }, streak: 20, activeDays: 60 }, today);
    expect(evaluate({ kind: "e1rm", exercises: ["bench_press"], label: "", value: 60 }, s).done).toBe(false);
    s.e1rm = { bench_press: 100, lat_pulldown: 100, squat: 120 };
    s.totalSets = 100;
    s.totalRunKm = 100;
    s.longestRunKm = 12;
    s.weekXp = 3000;
    const cleared = simulateClears(s);
    expect(DUNGEONS.every((d) => d.floors.every((_, i) => cleared.has(`${d.id}:${i}`)))).toBe(true);
    expect(ownedRewards(cleared).items).toContain("aura_gold");
  });
});
