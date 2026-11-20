"use client";

import { clearId, currentFloor, isDungeonCleared, isUnlocked, type Dungeon } from "@/domain/quests";
import type { FriendView } from "@/data/hooks";
import { Initial } from "./ui/primitives";

/**
 * 友達がこのダンジョンのどの階で止まっているか。
 * 最初のダンジョンは全員、ほかは1階でも倒した人（＝挑み始めた人）だけ。踏破した人は floor = null。
 */
export function friendPositions(d: Dungeon, friends: FriendView[], first: boolean) {
  return friends
    .map((f) => {
      const n = d.floors.filter((_, i) => f.cleared.has(clearId(d.id, i))).length;
      const done = isDungeonCleared(d, f.cleared);
      return { f, n, done, floor: done ? null : currentFloor(d, f.cleared) };
    })
    .filter((x) => x.done || (isUnlocked2(d, x.f) && (x.n > 0 || first)))
    .sort((a, b) => b.n - a.n);
}
function isUnlocked2(d: Dungeon, f: FriendView) {
  return isUnlocked(d, f.cleared);
}

/** 階の呼び名（「B2 湿った回廊」→「B2」）。まだ見ていないボスの名前がばれないよう、ボス名は使わない */
export function floorLabel(d: Dungeon, i: number) {
  const name = d.floors[i]?.name ?? "";
  return name.includes(" ") ? name.split(" ")[0] : name || `${i + 1}階`;
}

/** アイコン＋名前の小さな札 */
export function FriendChip({ f, label, strong = false }: { f: FriendView; label?: string; strong?: boolean }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-black/35 py-0.5 pl-0.5 pr-2 text-[10px]">
      <Initial name={f.user.name} size={20} src={f.user.avatar} color="#7c8597" />
      <span className="max-w-[5.5rem] truncate font-bold">{f.user.name}</span>
      {label && <span className={strong ? "font-bold text-accent-2" : "text-sub"}>{label}</span>}
    </span>
  );
}

/** ダンジョン一覧用：だれがどのボスで止まっているか */
export function FriendsInDungeon({ d, friends, first }: { d: Dungeon; friends: FriendView[]; first: boolean }) {
  const here = friendPositions(d, friends, first);
  if (!here.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {here.slice(0, 6).map(({ f, done, floor }) => (
        <FriendChip key={f.user.id} f={f} label={done ? "踏破" : floor != null ? `${floorLabel(d, floor)}で停止中` : undefined} strong={done} />
      ))}
      {here.length > 6 && <span className="self-center text-[10px] text-sub">ほか{here.length - 6}人</span>}
    </div>
  );
}
