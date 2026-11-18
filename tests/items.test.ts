import { beforeEach, describe, expect, it } from "vitest";
import { MuscleQuestDB } from "@/data/local/db";
import { LocalRepository } from "@/data/local/localRepository";
import { addDays, toDateKey } from "@/domain/dates";
import { ITEMS } from "@/domain/items";
import { DUNGEONS, itemUnlocked, longestStreak, ownedRewards } from "@/domain/quests";

const today = toDateKey(Date.now());
let repo: LocalRepository;
let n = 0;
beforeEach(async () => {
  repo = new LocalRepository(new MuscleQuestDB(`items-${n++}`));
  await repo.init();
});

describe("オーラ（装備は廃止）", () => {
  it("手に入るのはオーラだけ", () => {
    expect(ITEMS.length).toBe(4);
    expect(ITEMS.every((i) => i.id.startsWith("aura_"))).toBe(true);
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it("ダンジョンは装備を落とさない（称号は記録・撃破数から判定）", () => {
    for (const d of DUNGEONS) expect(d.reward).toEqual({});
  });
});

describe("入手条件", () => {
  it("レベル・連続日数・走行距離で手に入る", () => {
    expect(ownedRewards(new Set(), { level: 1, longestStreak: 0 }).items).toEqual([]);
    expect(ownedRewards(new Set(), { level: 26, longestStreak: 10, totalRunKm: 50 }).items).toEqual(["aura_wind", "aura_flame", "aura_purple"]);
    expect(itemUnlocked(ITEMS.find((i) => i.id === "aura_gold")!, { level: 38, longestStreak: 0 })).toBe(true);
  });

  it("最長連続日数", () => {
    expect(longestStreak(["2026-01-01", "2026-01-02", "2026-01-04", "2026-01-05", "2026-01-06"])).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("記録で新しいオーラを知らせ、持っていないオーラはまとえない", () => {
  it("累計50km走ると入手し、まとえる", async () => {
    let last;
    for (let i = 5; i >= 0; i--) {
      last = await repo.saveRun({ id: `r${i}`, distanceKm: 9, durationS: 9 * 330, date: addDays(today, -i) });
      expect(last.ok).toBe(true);
    }
    expect(last!.newItems).toContain("aura_wind");
    await repo.setAura("aura_wind");
    expect((await repo.getProfile())?.aura).toBe("aura_wind");
    await repo.setAura(null);
    expect((await repo.getProfile())?.aura).toBeUndefined();
  });

  it("未入手・存在しないオーラはまとえない", async () => {
    await expect(repo.setAura("aura_gold")).rejects.toThrow();
    await expect(repo.setAura("H01")).rejects.toThrow();
  });
});
