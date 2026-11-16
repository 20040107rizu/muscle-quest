import { beforeEach, describe, expect, it } from "vitest";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { toDateKey } from "@/domain/dates";

let repo: LocalRepository;
const today = toDateKey(Date.now());
let n = 0;

beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`test-${n++}`));
  await repo.init();
});

describe("LocalRepository", () => {
  it("筋トレを保存すると経験値が入り、同じIDの再送信は二重計上されない", async () => {
    const input = { id: "w1", exerciseId: "bench_press", date: today, sets: [{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 8 }] };
    const r1 = await repo.saveWorkout(input);
    expect(r1.ok).toBe(true);
    expect(r1.xpGained).toBeGreaterThan(0);
    const r2 = await repo.saveWorkout(input);
    expect(r2.duplicate).toBe(true);
    expect((await repo.listXpEvents()).length).toBe(1);
  });

  it("警告があると確認するまで保存されない", async () => {
    await repo.saveWorkout({ id: "a", exerciseId: "bench_press", date: today, sets: [{ weightKg: 50, reps: 10 }] });
    const r = await repo.saveWorkout({ id: "b", exerciseId: "bench_press", date: today, sets: [{ weightKg: 100, reps: 5 }] });
    expect(r.ok).toBe(false);
    expect(r.warnings.length).toBe(1);
    const r2 = await repo.saveWorkout({ id: "b", exerciseId: "bench_press", date: today, sets: [{ weightKg: 100, reps: 5 }] }, { confirm: true });
    expect(r2.ok).toBe(true);
  });

  it("レベルアップする", async () => {
    let last;
    for (let i = 0; i < 5; i++) {
      last = await repo.saveRun({ id: `r${i}`, distanceKm: 3 + i * 0.5, durationS: (3 + i * 0.5) * 330, date: today });
    }
    expect(last!.levelAfter).toBeGreaterThan(1);
  });

  it("ミッションは達成後に1日1回だけ受け取れる", async () => {
    expect((await repo.claimMission(today, "log_workout")).ok).toBe(false);
    await repo.saveWorkout({ id: "w", exerciseId: "squat", date: today, sets: [{ weightKg: 60, reps: 10 }] });
    const a = await repo.claimMission(today, "log_workout");
    expect(a.ok && a.xpGained).toBe(30);
    expect((await repo.claimMission(today, "log_workout")).duplicate).toBe(true);
  });

  it("削除すると経験値も取り消される", async () => {
    await repo.saveWorkout({ id: "w", exerciseId: "squat", date: today, sets: [{ weightKg: 60, reps: 10 }] });
    await repo.deleteActivity("workout", "w");
    expect((await repo.listXpEvents()).length).toBe(0);
  });

  it("友達コードで追加できる", async () => {
    expect((await repo.addFriendByCode("mq-2004")).ok).toBe(true);
    expect((await repo.addFriendByCode("MQ-2004")).error).toBe("既に友達です");
    expect((await repo.addFriendByCode("MQ-9999")).ok).toBe(false);
  });
});
