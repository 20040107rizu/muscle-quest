import { describe, expect, it } from "vitest";
import { validateRun, validateSets } from "@/domain/antiCheat";
import { buildCharacter, computeStreak } from "@/domain/character";
import { findExercise } from "@/domain/exercises";
import { computeMetrics, rank } from "@/domain/ranking";
import { applyDailyCap, computeRunXp, computeWorkoutXp, levelFromXp } from "@/domain/xp";

const bench = findExercise("bench_press")!;

describe("xp", () => {
  it("部位配分に従って経験値が入る", () => {
    const r = computeWorkoutXp({ exercise: bench, sets: [{ weightKg: 60, reps: 10 }], priorSetsToday: 0, bodyweightKg: 65 });
    expect(r.total).toBeGreaterThan(20);
    expect(r.byStat.chest!).toBeGreaterThan(r.byStat.arms!);
    expect(r.byStat.legs).toBeUndefined();
  });
  it("同じ種目を大量にやると逓減する", () => {
    const one = computeWorkoutXp({ exercise: bench, sets: [{ weightKg: 60, reps: 10 }], priorSetsToday: 0, bodyweightKg: 65 }).total;
    const late = computeWorkoutXp({ exercise: bench, sets: [{ weightKg: 60, reps: 10 }], priorSetsToday: 12, bodyweightKg: 65 }).total;
    expect(late).toBeLessThan(one * 0.2);
  });
  it("日次上限で切り捨てる", () => {
    const r = applyDailyCap({ total: 300, byStat: { chest: 300 } }, 1400, 1500);
    expect(r.total).toBe(100);
    expect(r.capped).toBe(true);
  });
  it("ランは心肺と脚に入る", () => {
    const r = computeRunXp(5, 1650, 0);
    expect(r.byStat.cardio!).toBeGreaterThan(r.byStat.legs!);
  });
  it("レベル計算", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(249).level).toBe(2);
    expect(levelFromXp(250).level).toBe(3);
  });
});

describe("anti-cheat", () => {
  it("上限超えの重量は拒否", () => {
    expect(validateSets(bench, [{ weightKg: 999, reps: 1 }], null, "2026-01-10", "2026-01-10").errors.length).toBe(1);
  });
  it("自己ベスト大幅更新は警告", () => {
    expect(validateSets(bench, [{ weightKg: 120, reps: 5 }], 60, "2026-01-10", "2026-01-10").warnings.length).toBe(1);
  });
  it("未来・古すぎる日付は拒否", () => {
    expect(validateSets(bench, [{ weightKg: 60, reps: 5 }], null, "2026-01-11", "2026-01-10").errors.length).toBe(1);
    expect(validateSets(bench, [{ weightKg: 60, reps: 5 }], null, "2025-12-01", "2026-01-10").errors.length).toBe(1);
  });
  it("速すぎるペースは拒否、同じ内容のランは確認だけ（2回走ることもある）", () => {
    expect(validateRun({ distanceKm: 10, durationS: 1000, date: "2026-01-10" }, [], "2026-01-10").errors.length).toBe(1);
    const existing = [{ id: "a", userId: "me", createdAt: 0, date: "2026-01-10", distanceKm: 5, durationS: 1800 }];
    const dup = validateRun({ distanceKm: 5, durationS: 1802, date: "2026-01-10" }, existing, "2026-01-10");
    expect(dup.errors).toEqual([]);
    expect(dup.warnings[0]).toMatch("同じ");
  });
});

describe("character & ranking", () => {
  it("ストリーク", () => {
    expect(computeStreak(["2026-01-08", "2026-01-09"], "2026-01-10")).toBe(2);
    expect(computeStreak(["2026-01-08", "2026-01-10"], "2026-01-10")).toBe(1);
    expect(computeStreak(["2026-01-07"], "2026-01-10")).toBe(0);
  });
  it("胸を鍛えると胸だけ発達", () => {
    const c = buildCharacter([{ total: 5000, byStat: { chest: 5000 }, date: "2026-01-10" }], ["2026-01-10"], "2026-01-10");
    expect(c.dev.chest).toBeGreaterThan(0.5);
    expect(c.dev.legs).toBe(0);
  });
  it("同値は同順位", () => {
    const r = rank([{ v: 10 }, { v: 30 }, { v: 10 }], (x) => x.v);
    expect(r.map((x) => x.rank)).toEqual([1, 2, 2]);
  });
  it("成長率", () => {
    const mk = (date: string, w: number) => ({ id: date, userId: "x", type: "workout" as const, date, createdAt: 0, xp: 10, byStat: {}, workout: { exerciseId: "bench_press", exerciseName: "", sets: [{ weightKg: w, reps: 1 }] } });
    const m = computeMetrics([mk("2025-11-01", 100), mk("2026-01-09", 110)], "2026-01-10");
    expect(m.growthPct).toBe(10);
  });
});

describe("hero appearance", () => {
  it("レベルで段階が決まる", async () => {
    const { heroStage } = await import("@/domain/character");
    expect(heroStage(1)).toBe(1);
    expect(heroStage(12)).toBe(3);
    expect(heroStage(50)).toBe(6);
  });
  it("突出した部位でタイプが決まる", async () => {
    const { heroType } = await import("@/domain/character");
    const base = { chest: 500, back: 500, shoulders: 500, arms: 500, legs: 500, core: 500, cardio: 500 };
    expect(heroType(base)).toBe("balance");
    expect(heroType({ ...base, chest: 1500 })).toBe("chest");
    expect(heroType({ ...base, cardio: 2000 })).toBe("runner");
    // 1位と2位が近ければバランス型（低い部位に引きずられない）
    expect(heroType({ chest: 141, back: 153, shoulders: 192, arms: 150, legs: 162, core: 39, cardio: 0 })).toBe("balance");
    expect(heroType({ ...base, chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, cardio: 0 })).toBe("balance");
  });
});
