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
  it("遊んでいるプレイヤーにだけ申し込め、同じ相手とは同時に1つ", async () => {
    class WithPlayers extends LocalRepository {
      async listPlayers() {
        return [{ id: "p1", name: "テスト", activities: [{ id: "a", userId: "p1", type: "run" as const, date: today, createdAt: 0, xp: 10, byStat: {} }] }];
      }
    }
    repo = new WithPlayers(new MuscleQuestDB(`features-battle-${n++}`));
    await repo.init();
    expect((await repo.startBattle("nobody")).ok).toBe(false);
    expect((await repo.startBattle("p1")).ok).toBe(true);
    expect((await repo.startBattle("p1")).ok).toBe(false);
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

describe("称号150種", () => {
  it("一覧が読み込め、IDが重複せず、条件がすべて判定できる", async () => {
    const { TITLE_DEFS, titleProgress, buildTitleStats } = await import("@/domain/titles");
    expect(TITLE_DEFS.length).toBe(150);
    expect(new Set(TITLE_DEFS.map((d) => d.id)).size).toBe(150);
    const zero = buildTitleStats({
      activities: [], level: 1, stats: { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, cardio: 0 },
      activeDays: 0, longestStreak: 0, totalSets: 0, totalRunKm: 0, longestRunKm: 0, e1rm: {},
      clearedFloors: 0, clearedDungeons: 0, weeklyBosses: 0, friends: 0, cheers: 0,
    });
    for (const d of TITLE_DEFS) {
      const p = titleProgress(d, zero);
      expect(p.unit, d.condition).not.toBeUndefined();
      expect(p.done, d.id).toBe(false);
    }
  });

  it("初めての記録で「鍛錬の初陣」が手に入り、記録の結果で知らせる", async () => {
    const r = await repo.saveRun({ id: "r1", distanceKm: 3, durationS: 1100, date: today });
    expect(r.newTitles).toContain("T001");
    await repo.setTitle("T001");
    expect((await repo.getProfile())?.titleId).toBe("T001");
    await expect(repo.setTitle("T150")).rejects.toThrow();
  });

  it("朝・夜の運動、会心、自己ベスト更新を数える", async () => {
    const { buildTitleStats } = await import("@/domain/titles");
    const at = (h: number, d = 1) => new Date(2026, 0, d, h, 0).getTime();
    const mk = (id: string, createdAt: number, km: number, date = "2026-01-01") => ({ id, userId: "me", type: "run" as const, date, createdAt, xp: 10, byStat: {}, run: { distanceKm: km, durationS: km * 300 } });
    const s = buildTitleStats({
      activities: [mk("a", at(6), 3), mk("b", at(23), 5), mk("c", at(12, 3), 4, "2026-01-03")],
      level: 1, stats: { chest: 0, back: 0, shoulders: 0, arms: 0, legs: 0, core: 0, cardio: 0 },
      activeDays: 2, longestStreak: 1, totalSets: 0, totalRunKm: 12, longestRunKm: 5, e1rm: {},
      clearedFloors: 2, clearedDungeons: 0, weeklyBosses: 1, friends: 3, cheers: 4,
    });
    expect(s.earlyWorkouts).toBe(1);
    expect(s.nightWorkouts).toBe(1);
    expect(s.newRecords).toBe(1);
    expect(s.bestPaceS).toBe(300);
    expect(s.weekendDays).toBe(1); // 2026-01-03 は土曜
    expect(s.bosses).toBe(3);
  });
});

describe("種目のやり方ガイド", () => {
  it("用意した種目すべてに、効く筋肉とコツがある", async () => {
    const { PRESET_EXERCISES } = await import("@/domain/exercises");
    const { exerciseGuide } = await import("@/domain/exerciseGuides");
    const fs = await import("node:fs");
    for (const e of PRESET_EXERCISES) {
      const g = exerciseGuide(e.id);
      expect(g, e.id).toBeTruthy();
      expect(g!.primary.length).toBeGreaterThan(0);
      expect(g!.tips.length).toBeGreaterThanOrEqual(3);
    }
    const { EXERCISE_VIDEO_IDS } = await import("@/domain/exerciseGuides");
    for (const id of EXERCISE_VIDEO_IDS) {
      expect(fs.existsSync(`public/exercises/${id}.mp4`), id).toBe(true);
    }
  });
});
