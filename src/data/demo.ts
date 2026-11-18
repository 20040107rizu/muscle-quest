"use client";

import { useSyncExternalStore } from "react";
import { addDays } from "@/domain/dates";

/**
 * 見本モード。自分の記録には一切触らず、表示だけ「全部そろった人」にする。
 * つけている称号・オーラも見本モードの中だけで覚える（この端末のブラウザに保存）。
 */
const KEY = "mq-demo";
interface DemoState {
  on: boolean;
  titleId?: string;
  aura?: string;
}
const listeners = new Set<() => void>();
let cache: DemoState | null = null;

function read(): DemoState {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "null") ?? { on: false };
  } catch {
    cache = { on: false };
  }
  return cache!;
}
function write(s: DemoState) {
  cache = s;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // 保存できない環境でも、開いている間は切り替わる
  }
  listeners.forEach((f) => f());
}
const OFF: DemoState = { on: false };

export function useDemo(): DemoState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    read,
    () => OFF,
  );
}

export function isDemo() {
  return typeof window !== "undefined" && read().on;
}
export function setDemo(on: boolean) {
  write({ ...read(), on, titleId: on ? read().titleId ?? "T141" : read().titleId, aura: on ? read().aura ?? "aura_purple" : read().aura });
}
export function setDemoTitle(titleId: string | null) {
  write({ ...read(), titleId: titleId ?? undefined });
}
export function setDemoAura(aura: string | null) {
  write({ ...read(), aura: aura ?? undefined });
}

/** 見本の経験値（約Lv.62・全部位を均等に） */
export const DEMO_XP = 100000;

/** 見本の運動日（毎日・40日連続） */
export function demoDates(today: string): string[] {
  return Array.from({ length: 40 }, (_, i) => addDays(today, -i));
}
