/** ローカル日付 YYYY-MM-DD */
export function toDateKey(d: Date | number): string {
  const x = typeof d === "number" ? new Date(d) : d;
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDateKey(a).getTime() - parseDateKey(b).getTime()) / 86400000);
}

/** 週の始まり（月曜） */
export function startOfWeek(key: string): string {
  const d = parseDateKey(key);
  const dow = (d.getDay() + 6) % 7;
  return addDays(key, -dow);
}

export function startOfMonth(key: string): string {
  return key.slice(0, 8) + "01";
}

export function formatDuration(totalS: number): string {
  const s = Math.round(totalS);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function formatPace(secPerKm: number): string {
  if (!isFinite(secPerKm) || secPerKm <= 0) return "--'--\"";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const min = Math.floor((now - ts) / 60000);
  if (min < 1) return "たった今";
  if (min < 60) return `${min}分前`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  return `${d}日前`;
}
