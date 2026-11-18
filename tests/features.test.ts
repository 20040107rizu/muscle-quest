import { beforeEach, describe, expect, it } from "vitest";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { addDays, toDateKey } from "@/domain/dates";
import { rollChest } from "@/domain/chest";
import { battleScore, battleState } from "@/domain/battle";
import { weeklyBossFor, WEEKLY_BOSSES } from "@/domain/weekly";
import { findTitle } from "@/domain/quests";

const today = toDateKey(Date.now());
let repo: LocalRepository;
let n = 0;
beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`features-${n++}`));
  await repo.init();
});

describe("筋トレメニュー", () => {
  it("保存・削除でき、存在しない種目は除かれる", async () => {
    const m = await repo.saveMenu(" 胸の日 ", ["bench_press", "nope", "bench_press", "incline_db_press"]);
    expect(m.name).toBe("胸の日");
    expect(m.exerciseIds).toEqual(["bench_press", "incline_db_press"]);
    expect((await repo.listMenus()).length).toBe(1);
    await repo.deleteMenu(m.id);
    expect(await repo.listMenus()).toEqual([]);
    await expect(repo.saveMenu("空", ["nope"])).rejects.toThrow();
  });
});

describe("体重・写真", () => {
  it("今日の体重はプロフィールにも反映、写真は消せる", async () => {
    await repo.saveBodyLog(today, { weightKg: 70.24 });
    expect((await repo.getProfile())?.bodyweightKg).toBe(70.2);
    await repo.saveBodyLog(today, { photo: "data:image/jpeg;base64,xx" });
    expect((await repo.listBodyLogs())[0]).toMatchObject({ weightKg: 70.2, photo: "data:image/jpeg;base64,xx" });
    await repo.saveBodyLog(today, { photo: null });
    expect((await repo.listBodyLogs())[0].photo).toBeUndefined();
    await expect(repo.saveBodyLog(addDays(today, 1), { weightKg: 70 })).rejects.toThrow();
    await expect(repo.saveBodyLog(today, { weightKg: 10 })).rejects.toThrow();
  });
});

describe("毎日の宝箱", () => {
  it("運動するまで開かず、1日1回だけ。中身は引き直せない", async () => {
    expect((await repo.openDailyChest(today)).ok).toBe(false);
    await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1100, date: today });
    const first = await repo.openDailyChest(today);
    expect(first.ok).toBe(true);
    expect(first.xpGained).toBe(first.chest!.xp);
    const again = await repo.openDailyChest(today);
    expect(again.duplicate).toBe(true);
    expect(again.chest).toEqual(first.chest);
    expect((await repo.listXpEvents()).filter((e) => e.id === `bonus:chest:${today}`).length).toBe(1);
    expect((await repo.openDailyChest(addDays(today, -1))).ok).toBe(false);
  });

  it("中身の確率はおおよそ 大当たり5%・レア25%", () => {
    const tiers = { normal: 0, rare: 0, jackpot: 0 };
    for (let i = 0; i < 4000; i++) tiers[rollChest(`MQ-${i}`, "2026-01-01").tier]++;
    expect(tiers.jackpot / 4000).toBeGreaterThan(0.03);
    expect(tiers.jackpot / 4000).toBeLessThan(0.07);
    expect(tiers.rare / 4000).toBeGreaterThan(0.2);
    expect(tiers.rare / 4000).toBeLessThan(0.3);
  });
});

describe("週替わりボス", () => {
  it("毎週入れ替わり、限定称号がある", () => {
    const a = weeklyBossFor("2026-11-16").boss;
    const b = weeklyBossFor("2026-11-22").boss;
    const c = weeklyBossFor("2026-11-23").boss;
    expect(a.id).toBe(b.id);
    expect(c.id).not.toBe(a.id);
    for (const w of WEEKLY_BOSSES) expect(findTitle(w.titleId)).toBeTruthy();
  });

  it("自分が運動していない週は受け取れない。倒していれば称号が手に入る", async () => {
    expect((await repo.claimWeeklyBoss(today)).ok).toBe(false);
    await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1100, date: today });
    const r = await repo.claimWeeklyBoss(today);
    // 友達の経験値しだいで倒せているかが変わるので、受け取れた場合だけ称号を確認する
    if (r.ok) {
      await repo.setTitle(r.titleId!);
      expect((await repo.getProfile())?.titleId).toBe(r.titleId);
    } else {
      expect(r.error).toMatch("倒せていません");
    }
  });
});

describe("友達との対決", () => {
  it("友達にだけ申し込め、同じ相手とは同時に1つ", async () => {
    expect((await repo.startBattle("u_daichi")).ok).toBe(false);
    expect((await repo.startBattle("u_kenta")).ok).toBe(true);
    expect((await repo.startBattle("u_kenta")).ok).toBe(false);
    const [b] = await repo.listBattles();
    expect(b.end).toBe(addDays(today, 6));
  });

  it("期間中の経験値で勝敗が決まる", () => {
    const b = { id: "x", friendId: "f", start: "2026-01-01", end: "2026-01-07", createdAt: 0 };
    const acts = [
      { date: "2025-12-31", xp: 999 },
      { date: "2026-01-03", xp: 100 },
      { date: "2026-01-07", xp: 50 },
    ].map((a, i) => ({ ...a, id: String(i), userId: "me", type: "run" as const, createdAt: 0, byStat: {} }));
    expect(battleScore(acts, b)).toBe(150);
    expect(battleState(b, "2026-01-07", 150, 10)).toBe("active");
    expect(battleState(b, "2026-01-08", 150, 10)).toBe("won");
    expect(battleState(b, "2026-01-08", 5, 10)).toBe("lost");
  });
});
