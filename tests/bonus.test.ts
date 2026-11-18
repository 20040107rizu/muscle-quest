import { beforeEach, describe, expect, it } from "vitest";
import { bonusXpByDate } from "@/data/activities";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { CRIT_RATE, isCritical } from "@/domain/bonus";
import { toDateKey } from "@/domain/dates";

const today = toDateKey(Date.now());
let repo: LocalRepository;
let n = 0;
beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`bonus-${n++}`));
  await repo.init();
});

// 会心になるID・ならないIDを探す
const ids = Array.from({ length: 400 }, (_, i) => `id-${i}`);
const critId = ids.find((id) => isCritical(id))!;
const normalId = ids.find((id) => !isCritical(id))!;

describe("会心", () => {
  it("おおよそ設定どおりの確率で出る", () => {
    const rate = ids.filter((id) => isCritical(id)).length / ids.length;
    expect(rate).toBeGreaterThan(CRIT_RATE * 0.5);
    expect(rate).toBeLessThan(CRIT_RATE * 1.6);
  });

  it("会心だと経験値が1.5倍になり、再送信しても結果は同じ", async () => {
    const sets = [{ weightKg: 60, reps: 10 }];
    const r = await repo.saveWorkout({ id: critId, exerciseId: "squat", date: today, sets });
    expect(r.critXp).toBe(Math.round(r.xpGained * 0.5));
    const again = await repo.saveWorkout({ id: critId, exerciseId: "squat", date: today, sets });
    expect(again.duplicate).toBe(true);
    const normal = await repo.saveWorkout({ id: normalId, exerciseId: "bench_press", date: today, sets });
    expect(normal.critXp).toBe(0);
  });

  it("ボーナスはランキング（日別XP）に入らず、削除すると消える", async () => {
    await repo.saveWorkout({ id: critId, exerciseId: "squat", date: today, sets: [{ weightKg: 60, reps: 10 }] });
    const evs = await repo.listXpEvents();
    expect(evs.some((e) => e.sourceType === "bonus")).toBe(true);
    expect(bonusXpByDate(evs)[today] ?? 0).toBe(0);
    await repo.deleteActivity("workout", critId);
    expect((await repo.listXpEvents()).length).toBe(0);
  });
});

describe("自己ベスト", () => {
  it("推定1RMを更新するとボーナス、初回や更新なしでは出ない", async () => {
    const first = await repo.saveWorkout({ id: "a1", exerciseId: "bench_press", date: today, sets: [{ weightKg: 60, reps: 5 }] });
    expect(first.prXp).toBe(0);
    const same = await repo.saveWorkout({ id: "a2", exerciseId: "bench_press", date: today, sets: [{ weightKg: 60, reps: 5 }] });
    expect(same.prXp).toBe(0);
    const pr = await repo.saveWorkout({ id: "a3", exerciseId: "bench_press", date: today, sets: [{ weightKg: 62.5, reps: 5 }] });
    expect(pr.prXp).toBe(25);
    expect(pr.prLabel).toMatch("推定1RM");
    expect(pr.comboToday).toBe(3);
  });

  it("ランは最長距離の更新", async () => {
    await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1000, date: today });
    const pr = await repo.saveRun({ id: "r2", distanceKm: 5, durationS: 1700, date: today });
    expect(pr.prXp).toBe(25);
  });
});
