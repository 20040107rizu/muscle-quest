import { beforeEach, describe, expect, it } from "vitest";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { addDays, toDateKey } from "@/domain/dates";
import { GEAR_SLOTS, ITEMS } from "@/domain/items";
import { DUNGEONS, findDungeon, itemUnlocked, longestStreak, ownedRewards } from "@/domain/quests";

const today = toDateKey(Date.now());
let repo: LocalRepository;
let n = 0;
beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`items-${n++}`));
  await repo.init();
});

describe("アイテム定義", () => {
  it("30個以上あり、IDが重複せず、入手条件が実在する", () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const it of ITEMS) {
      expect(GEAR_SLOTS).toContain(it.slot);
      const s = it.source;
      if (s.kind === "dungeon") expect(findDungeon(s.dungeonId)).toBeTruthy();
      if (s.kind === "floor") expect(findDungeon(s.dungeonId)?.floors[s.floor]).toBeTruthy();
    }
  });

  it("全スロットに最低1つアイテムがある", () => {
    for (const slot of GEAR_SLOTS) expect(ITEMS.some((i) => i.slot === slot)).toBe(true);
  });
});

describe("入手条件", () => {
  it("レベル・連続日数・ボス撃破で手に入る", () => {
    const none = ownedRewards(new Set(), { level: 1, longestStreak: 0 }).items;
    expect(none).toEqual([]);
    const lv = ownedRewards(new Set(), { level: 15, longestStreak: 7 }).items;
    expect(lv).toEqual(expect.arrayContaining(["wrist_black", "shoes_fire", "necklace_gold", "shorts_pink"]));
    expect(lv).not.toContain("crown_gold");
    expect(ownedRewards(new Set(["cave:0"])).items).toContain("shorts_slime");
  });

  it("全ダンジョン踏破で全アイテム", () => {
    const all = new Set(DUNGEONS.flatMap((d) => d.floors.map((_, i) => `${d.id}:${i}`)));
    const owned = ownedRewards(all, { level: 60, longestStreak: 30 }).items;
    expect(owned.length).toBe(ITEMS.length);
    expect(itemUnlocked(ITEMS.find((i) => i.id === "aura_gold")!, all, { level: 1, longestStreak: 0 })).toBe(true);
  });

  it("最長連続日数", () => {
    expect(longestStreak(["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05", "2026-01-06"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("記録・撃破で新しいアイテムを知らせ、持っていない装備は着けられない", () => {
  it("ボス撃破でドロップ", async () => {
    await repo.saveWorkout({ id: "w", exerciseId: "squat", date: today, sets: Array.from({ length: 5 }, () => ({ weightKg: 60, reps: 10 })) });
    const r = await repo.challengeFloor("cave", 0);
    expect(r.newItems).toContain("shorts_slime");
    await repo.equipItem("shorts", "shorts_slime");
    expect((await repo.getProfile())?.gear?.shorts).toBe("shorts_slime");
  });

  it("連続日数の節目で入手", async () => {
    let last;
    for (let i = 6; i >= 0; i--) {
      last = await repo.saveRun({ id: `r${i}`, distanceKm: 1 + i * 0.1, durationS: 400 + i * 40, date: addDays(today, -i) });
    }
    expect(last!.newItems).toContain("shorts_pink");
  });

  it("未入手は装備不可", async () => {
    await expect(repo.equipItem("head", "crown_gold")).rejects.toThrow();
  });
});
