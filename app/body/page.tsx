"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useFeedback } from "@/components/ui/Feedback";
import { NumberInput } from "@/components/ui/NumberInput";
import { SkinButton } from "@/components/ui/SkinButton";
import { Card, Loading, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { addDays, parseDateKey } from "@/domain/dates";
import type { BodyLog } from "@/domain/types";
import { getRepo, useBodyLogs, useMyData } from "@/data/hooks";

/** 写真を縮小して data URL にする（端末の中だけに保存するので軽くしておく） */
async function shrinkPhoto(file: File, max = 720, thumb = false): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("写真を読み込めませんでした"));
      i.src = url;
    });
    const c = document.createElement("canvas");
    if (thumb) {
      // カレンダー用：真ん中で縦長（3:4）に切り抜いた小さい写真
      const w = Math.min(img.width, (img.height * 3) / 4);
      const h = (w * 4) / 3;
      c.width = 180;
      c.height = 240;
      c.getContext("2d")!.drawImage(img, (img.width - w) / 2, (img.height - h) / 2, w, h, 0, 0, 180, 240);
      return c.toDataURL("image/jpeg", 0.72);
    }
    const s = Math.min(1, max / Math.max(img.width, img.height));
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const md = (d: string) => d.slice(5).replace("-", "/");

/** 体重の折れ線（直近90日） */
function WeightChart({ logs, today }: { logs: BodyLog[]; today: string }) {
  const from = addDays(today, -89);
  const pts = logs.filter((l) => l.weightKg != null && l.date >= from);
  if (pts.length < 2) return <p className="py-6 text-center text-xs text-sub">2日以上記録するとグラフが出ます</p>;
  const ws = pts.map((p) => p.weightKg!);
  const lo = Math.floor(Math.min(...ws) - 1);
  const hi = Math.ceil(Math.max(...ws) + 1);
  const W = 320;
  const H = 120;
  const t0 = new Date(pts[0].date).getTime();
  const t1 = Math.max(t0 + 86400000, new Date(pts[pts.length - 1].date).getTime());
  const xy = pts.map((p) => [((new Date(p.date).getTime() - t0) / (t1 - t0)) * (W - 16) + 8, H - 8 - ((p.weightKg! - lo) / (hi - lo)) * (H - 16)] as const);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label="体重の推移">
        {[lo, (lo + hi) / 2, hi].map((v) => {
          const y = H - 8 - ((v - lo) / (hi - lo)) * (H - 16);
          return <line key={v} x1="0" x2={W} y1={y} y2={y} stroke="currentColor" className="text-line" strokeDasharray="2 4" />;
        })}
        <polyline points={xy.map((p) => p.join(",")).join(" ")} fill="none" stroke="#ffb547" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {xy.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.5" fill="#ffb547" />
        ))}
      </svg>
      <div className="flex justify-between font-num text-[10px] text-sub">
        <span>{md(pts[0].date)}</span>
        <span>
          {lo}〜{hi}kg
        </span>
        <span>{md(pts[pts.length - 1].date)}</span>
      </div>
    </div>
  );
}

const WEEK = ["月", "火", "水", "木", "金", "土", "日"];

/** その月のカレンダーのマス（月曜はじまり。前後の空きは null） */
function monthCells(month: string): (string | null)[] {
  const first = parseDateKey(`${month}-01`);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function shiftMonth(month: string, n: number) {
  const d = parseDateKey(`${month}-01`);
  d.setMonth(d.getMonth() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 写真を撮った日が今日（または昨日）から何日続いているか */
function photoStreak(dates: Set<string>, today: string) {
  let d = dates.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (dates.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export default function BodyPage() {
  const me = useMyData();
  const logs = useBodyLogs();
  const { confirm: ask } = useFeedback();
  const [weight, setWeight] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [pick, setPick] = useState<[string | null, string | null]>([null, null]);

  const photos = useMemo(() => (logs ?? []).filter((l) => l.photo), [logs]);
  if (!me || !logs) return <Loading />;
  const today = me.today;
  const curMonth = month ?? today.slice(0, 7);
  const byDate = new Map(logs.map((l) => [l.date, l]));
  const photoDates = new Set(photos.map((p) => p.date));
  const streak = photoStreak(photoDates, today);
  const todayLog = byDate.get(today);
  const w = weight ?? todayLog?.weightKg ?? me.profile.bodyweightKg;
  const weights = logs.filter((l) => l.weightKg != null);
  const first = weights[0];
  const last = weights[weights.length - 1];
  const a = photos.find((p) => p.date === pick[0]) ?? photos[0];
  const b = photos.find((p) => p.date === pick[1]) ?? photos[photos.length - 1];
  const viewing = view ? byDate.get(view) : undefined;
  const viewIdx = viewing ? photos.findIndex((p) => p.date === viewing.date) : -1;

  async function run(fn: () => Promise<void>, done: string) {
    try {
      setBusy(true);
      setErr("");
      await fn();
      setMsg(done);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const pickPhoto = (date: string) => {
    setPickFor(date);
    fileRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Link href="/me" className="block pt-4 text-xs text-sub">
        ‹ マイページ
      </Link>
      <PageHeader title="体の記録" sub="毎日の写真と体重で、変化を残そう" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          const date = pickFor ?? today;
          if (f) await run(async () => getRepo().saveBodyLog(date, { photo: await shrinkPhoto(f), thumb: await shrinkPhoto(f, 0, true) }), `${md(date)}の写真を保存しました`);
        }}
      />

      {/* 毎日の写真（BeReal のメモリーズのように、カレンダーに並べる） */}
      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-sm font-bold">毎日の体の写真</h2>
          <p className="text-xs text-sub">
            {streak > 0 ? (
              <>
                <span className="font-num text-base font-bold text-accent-2">{streak}</span>日連続で撮影中
              </>
            ) : (
              "今日から毎日撮ってみよう"
            )}
          </p>
        </div>
        <SkinButton variant="gold" disabled={busy} onClick={() => pickPhoto(today)} className="h-12 w-full text-sm">
          {todayLog?.photo ? "今日の写真を撮り直す" : "今日の写真を撮る"}
        </SkinButton>

        <Card className="!p-3">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setMonth(shiftMonth(curMonth, -1))} className="rounded-lg bg-panel-2 px-3 py-1 text-sm text-sub" aria-label="前の月">
              ‹
            </button>
            <p className="font-bold">
              {Number(curMonth.slice(0, 4))}年{Number(curMonth.slice(5))}月
              <span className="ml-2 font-num text-xs text-sub">{photos.filter((p) => p.date.startsWith(curMonth)).length}枚</span>
            </p>
            <button
              onClick={() => setMonth(shiftMonth(curMonth, 1))}
              disabled={curMonth >= today.slice(0, 7)}
              className="rounded-lg bg-panel-2 px-3 py-1 text-sm text-sub disabled:opacity-30"
              aria-label="次の月"
            >
              ›
            </button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] text-sub">
            {WEEK.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthCells(curMonth).map((d, i) => {
              if (!d) return <span key={i} />;
              const l = byDate.get(d);
              const future = d > today;
              const day = Number(d.slice(8));
              if (l?.photo) {
                return (
                  <button key={d} onClick={() => setView(d)} className={`relative aspect-[3/4] overflow-hidden rounded-md ${d === today ? "ring-2 ring-accent-2" : ""}`} aria-label={`${md(d)}の写真を見る`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.thumb ?? l.photo} alt="" className="h-full w-full object-cover" />
                    <span className="absolute bottom-0.5 left-1 font-num text-sm font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.9)]">{day}</span>
                  </button>
                );
              }
              return (
                <button
                  key={d}
                  disabled={future}
                  onClick={() => pickPhoto(d)}
                  className={`relative grid aspect-[3/4] place-items-center rounded-md bg-white/5 ${d === today ? "ring-2 ring-accent-2" : ""} ${future ? "opacity-20" : ""}`}
                  aria-label={`${md(d)}の写真を追加`}
                >
                  {d === today && <span className="text-lg text-accent-2">＋</span>}
                  <span className="absolute bottom-0.5 left-1 font-num text-[11px] text-sub">{day}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-sub">写真をタップで大きく表示。空いている日をタップすると、その日の写真を追加できます。</p>
        </Card>
        <p className="px-1 text-[10px] text-sub">体の写真はこの端末の中だけに保存されます。友達やランキングには出ません。</p>
      </section>

      <Card className="space-y-3">
        <p className="text-sm font-bold">今日の体重</p>
        <div className="flex items-center gap-2">
          <NumberInput value={w} onChange={setWeight} min={30} max={250} decimals={1} ariaLabel="体重" className="w-28 skin-input px-2 py-1.5 text-center font-num text-xl font-bold outline-none" />
          <span className="text-sm text-sub">kg</span>
          <SkinButton disabled={busy} onClick={() => run(() => getRepo().saveBodyLog(today, { weightKg: w }), "体重を記録しました")} className="ml-auto h-11 w-28 text-sm">
            記録する
          </SkinButton>
        </div>
        {first && last && first.date !== last.date && (
          <p className="text-xs text-sub">
            {md(first.date)} から{" "}
            <span className={`font-num font-bold ${last.weightKg! <= first.weightKg! ? "text-good" : "text-accent-2"}`}>
              {last.weightKg! - first.weightKg! >= 0 ? "+" : ""}
              {(last.weightKg! - first.weightKg!).toFixed(1)}kg
            </span>
          </p>
        )}
        <WeightChart logs={logs} today={today} />
      </Card>

      {photos.length >= 2 && a && b && (
        <section>
          <SectionTitle>見比べる</SectionTitle>
          <Card className="!p-3">
            <div className="grid grid-cols-2 gap-2">
              {[a, b].map((p, i) => (
                <div key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt={`${p.date}の写真`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                  <select
                    value={p.date}
                    onChange={(e) => setPick((x) => (i === 0 ? [e.target.value, x[1]] : [x[0], e.target.value]))}
                    className="mt-1 w-full rounded-lg bg-panel-2 px-2 py-1 text-xs text-ink outline-none"
                  >
                    {photos.map((q) => (
                      <option key={q.date} value={q.date}>
                        {q.date.replace(/-/g, "/")}
                        {q.weightKg != null ? `（${q.weightKg}kg）` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {msg && !err && <p className="text-center text-xs text-good">{msg}</p>}
      {err && <p className="text-center text-xs text-bad">{err}</p>}

      {/* 大きく表示（前後の写真へ移動・削除） */}
      {viewing?.photo && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-black p-4 pt-[max(1rem,env(safe-area-inset-top))]" role="dialog" aria-modal>
          <div className="flex items-center justify-between">
            <p className="font-bold">
              {Number(viewing.date.slice(5, 7))}月{Number(viewing.date.slice(8))}日
              {viewing.weightKg != null && <span className="ml-2 font-num text-sm text-sub">{viewing.weightKg}kg</span>}
            </p>
            <button onClick={() => setView(null)} className="rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
              閉じる
            </button>
          </div>
          <div className="relative my-3 flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewing.photo} alt={`${viewing.date}の写真`} className="max-h-full max-w-full rounded-xl object-contain" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button disabled={viewIdx <= 0} onClick={() => setView(photos[viewIdx - 1].date)} className="rounded-xl bg-panel-2 py-3 text-sm disabled:opacity-30">
              ‹ 前の写真
            </button>
            <button
              onClick={async () => {
                if (await ask(`${viewing.date.replace(/-/g, "/")} の写真を削除しますか？`, { ok: "削除する", danger: true })) {
                  await run(() => getRepo().saveBodyLog(viewing.date, { photo: null }), "写真を削除しました");
                  setView(null);
                }
              }}
              className="rounded-xl bg-panel-2 py-3 text-sm text-bad"
            >
              削除
            </button>
            <button disabled={viewIdx >= photos.length - 1} onClick={() => setView(photos[viewIdx + 1].date)} className="rounded-xl bg-panel-2 py-3 text-sm disabled:opacity-30">
              次の写真 ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
