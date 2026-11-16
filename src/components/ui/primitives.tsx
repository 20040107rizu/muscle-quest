"use client";

import Link from "next/link";
import { STAT_LABELS, type StatKey } from "@/domain/types";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-2xl border border-line bg-panel p-4 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, href, more = "すべて見る" }: { children: React.ReactNode; href?: string; more?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <h2 className="text-sm font-bold tracking-wide text-ink">{children}</h2>
      {href && (
        <Link href={href} className="text-xs text-sub hover:text-ink">
          {more} ›
        </Link>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between px-1 pb-3 pt-4">
      <div>
        <h1 className="text-xl font-black tracking-tight">{title}</h1>
        {sub && <p className="mt-0.5 text-xs text-sub">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function XpBar({ into, needed, className = "" }: { into: number; needed: number; className?: string }) {
  const pct = Math.min(100, (into / needed) * 100);
  return (
    <div className={className}>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-sub">
        <span className="font-num text-xs">
          {into} / {needed} XP
        </span>
        <span>次のレベルまで {needed - into}</span>
      </div>
    </div>
  );
}

export function LevelBadge({ level, size = "md" }: { level: number; size?: "sm" | "md" }) {
  return (
    <span className={`inline-flex items-baseline gap-0.5 rounded-md bg-accent/15 font-num font-bold text-accent ${size === "sm" ? "px-1.5 text-xs" : "px-2 py-0.5 text-sm"}`}>
      <span className="text-[0.7em]">Lv.</span>
      {level}
    </span>
  );
}

export const STAT_COLORS: Record<StatKey, string> = {
  chest: "#ff6b2c",
  back: "#ffb547",
  shoulders: "#f2d24b",
  arms: "#ff8fa3",
  legs: "#3ddc97",
  core: "#b79cff",
  cardio: "#4cc9f0",
};

export function StatChips({ byStat }: { byStat: Partial<Record<StatKey, number>> }) {
  const entries = (Object.entries(byStat) as [StatKey, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => (
        <span key={k} className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${STAT_COLORS[k]}22`, color: STAT_COLORS[k] }}>
          {STAT_LABELS[k]} +{v}
        </span>
      ))}
    </div>
  );
}

export function Initial({ name, color = "#ff6b2c", size = 36 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, #2a2f3a)`, fontSize: size * 0.42 }}
    >
      {name.slice(0, 1)}
    </span>
  );
}

export function Stepper({
  value,
  onChange,
  step,
  min = 0,
  max = 999,
  unit,
  label,
  decimals = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min?: number;
  max?: number;
  unit: string;
  label: string;
  decimals?: number;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v * 10 ** decimals) / 10 ** decimals));
  return (
    <div className="flex min-w-0 items-center rounded-xl bg-panel-2">
      <button type="button" aria-label={`${label}を減らす`} className="grid h-11 w-9 shrink-0 place-items-center text-lg text-sub active:text-ink" onClick={() => onChange(clamp(value - step))}>
        −
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-0.5">
        <span className="sr-only">{label}</span>
        <input
          inputMode="decimal"
          type="number"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          onBlur={() => onChange(clamp(value))}
          className="w-full min-w-0 bg-transparent text-center font-num text-xl font-semibold outline-none"
        />
        <span className="text-[10px] text-sub">{unit}</span>
      </label>
      <button type="button" aria-label={`${label}を増やす`} className="grid h-11 w-9 shrink-0 place-items-center text-lg text-sub active:text-ink" onClick={() => onChange(clamp(value + step))}>
        +
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl bg-panel p-1 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${value === o.value ? "bg-panel-2 text-ink shadow" : "text-sub"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Loading() {
  return <div className="grid min-h-[60vh] place-items-center text-sm text-sub">読み込み中…</div>;
}
