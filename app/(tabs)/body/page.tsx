"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useFeedback } from "@/components/ui/Feedback";
import { NumberInput } from "@/components/ui/NumberInput";
import { SkinButton } from "@/components/ui/SkinButton";
import { Card, Loading, PageHeader, SectionTitle } from "@/components/ui/primitives";
import { addDays } from "@/domain/dates";
import type { BodyLog } from "@/domain/types";
import { getRepo, useMyData } from "@/data/hooks";

/** 写真を縮小して data URL にする（端末の中だけに保存するので軽くしておく） */
async function shrinkPhoto(file: File, max = 720): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("写真を読み込めませんでした"));
      i.src = url;
    });
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
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

export default function BodyPage() {
  const me = useMyData();
  const { confirm: ask } = useFeedback();
  const [weight, setWeight] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pick, setPick] = useState<[string | null, string | null]>([null, null]);

  const photos = useMemo(() => (me?.bodyLogs ?? []).filter((l) => l.photo), [me]);
  if (!me) return <Loading />;
  const todayLog = me.bodyLogs.find((l) => l.date === me.today);
  const w = weight ?? todayLog?.weightKg ?? me.profile.bodyweightKg;
  const weights = me.bodyLogs.filter((l) => l.weightKg != null);
  const first = weights[0];
  const last = weights[weights.length - 1];
  const month = me.today.slice(0, 7);
  const hasMonthPhoto = photos.some((p) => p.date.startsWith(month));
  // 比べる2枚（選んでいなければ一番古い写真と一番新しい写真）
  const a = photos.find((p) => p.date === pick[0]) ?? photos[0];
  const b = photos.find((p) => p.date === pick[1]) ?? photos[photos.length - 1];

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

  return (
    <div className="space-y-4">
      <Link href="/me" className="block pt-4 text-xs text-sub">
        ‹ マイページ
      </Link>
      <PageHeader title="体の記録" sub="体重と、月1回の写真で変化を見よう" />

      <Card className="space-y-3">
        <p className="text-sm font-bold">今日の体重</p>
        <div className="flex items-center gap-2">
          <NumberInput value={w} onChange={setWeight} min={30} max={250} decimals={1} ariaLabel="体重" className="w-28 skin-input px-2 py-1.5 text-center font-num text-xl font-bold outline-none" />
          <span className="text-sm text-sub">kg</span>
          <SkinButton disabled={busy} onClick={() => run(() => getRepo().saveBodyLog(me.today, { weightKg: w }), "体重を記録しました")} className="ml-auto h-11 w-28 text-sm">
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
        <WeightChart logs={me.bodyLogs} today={me.today} />
      </Card>

      <section>
        <SectionTitle>体の写真</SectionTitle>
        <Card className="space-y-3">
          <p className={`text-xs ${hasMonthPhoto ? "text-sub" : "font-bold text-accent-2"}`}>{hasMonthPhoto ? "今月の写真は撮影済みです" : "今月の写真がまだです。同じ場所・同じポーズで撮ると変化がよく分かります"}</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await run(async () => getRepo().saveBodyLog(me.today, { photo: await shrinkPhoto(f) }), "写真を保存しました");
            }}
          />
          <SkinButton variant="gold" disabled={busy} onClick={() => fileRef.current?.click()} className="h-12 w-full text-sm">
            {todayLog?.photo ? "今日の写真を撮り直す" : "今日の写真を追加"}
          </SkinButton>
          <p className="text-[10px] text-sub">写真はこの端末の中だけに保存されます。友達やランキングには出ません。</p>

          {photos.length >= 2 && a && b && (
            <div>
              <p className="mb-1.5 text-xs font-bold">見比べる</p>
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
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {[...photos].reverse().map((p) => (
                <button
                  key={p.date}
                  onClick={async () => (await ask(`${p.date.replace(/-/g, "/")} の写真を削除しますか？`, { ok: "削除する", danger: true })) && run(() => getRepo().saveBodyLog(p.date, { photo: null }), "写真を削除しました")}
                  className="relative"
                  aria-label={`${p.date}の写真を削除`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.photo} alt="" className="aspect-[3/4] w-full rounded-md object-cover" />
                  <span className="absolute inset-x-0 bottom-0 rounded-b-md bg-black/60 py-0.5 text-center font-num text-[9px]">{md(p.date)}</span>
                </button>
              ))}
            </div>
          )}
          {photos.length > 0 && <p className="text-[10px] text-sub">写真をタップすると削除できます</p>}
        </Card>
      </section>

      {msg && !err && <p className="text-center text-xs text-good">{msg}</p>}
      {err && <p className="text-center text-xs text-bad">{err}</p>}
    </div>
  );
}
