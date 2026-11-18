"use client";

import { SkinButton, SkinFace } from "@/components/ui/SkinButton";
import { useState } from "react";
import { RecordTabs } from "@/components/RecordTabs";
import { NumberInput } from "@/components/ui/NumberInput";
import { useFeedback } from "@/components/ui/Feedback";
import { Card, Loading, SectionTitle } from "@/components/ui/primitives";
import { addDays, formatDuration, formatPace, startOfMonth } from "@/domain/dates";
import { BEST_DISTANCES, bestTimeFor } from "@/domain/running";
import { computeRunXp, paceSecPerKm } from "@/domain/xp";
import { getRepo, useMyData } from "@/data/hooks";
import { newId } from "@/data/local/localRepository";

export default function RunPage() {
  const me = useMyData();
  const { showResult, confirm: ask } = useFeedback();
  const [km, setKm] = useState(3);
  const [h, setH] = useState(0);
  const [m, setM] = useState(18);
  const [s, setS] = useState(0);
  const [date, setDate] = useState<string | null>(null);
  const [draftId, setDraftId] = useState(() => newId());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!me) return <Loading />;
  const d = date ?? me.today;
  const durationS = h * 3600 + m * 60 + s;
  const pace = paceSecPerKm(km, durationS);
  const priorKm = me.runs.filter((r) => r.date === d).reduce((a, r) => a + r.distanceKm, 0);
  const preview = km > 0 && durationS > 0 ? computeRunXp(km, durationS, priorKm).total : 0;

  const totalKm = me.runs.reduce((a, r) => a + r.distanceKm, 0);
  const totalS = me.runs.reduce((a, r) => a + r.durationS, 0);
  const monthKm = me.runs.filter((r) => r.date >= startOfMonth(me.today)).reduce((a, r) => a + r.distanceKm, 0);

  async function save(confirm = false) {
    setSaving(true);
    const r = await getRepo().saveRun({ id: draftId, distanceKm: km, durationS, date: d }, { confirm });
    setSaving(false);
    if (r.errors.length) return setErrors(r.errors);
    if (!r.ok && r.warnings.length) {
      if (await ask(r.warnings.join("\n") + "\n\nこのまま記録しますか？", { ok: "記録する" })) return save(true);
      return;
    }
    setErrors([]);
    if (!r.duplicate) showResult(r, `${km}km のランを記録しました`);
    setDraftId(newId());
  }

  const num = (v: number, set: (n: number) => void, max: number, label: string) => (
    <label className="flex flex-1 flex-col items-center rounded-xl bg-panel-2 py-2">
      <NumberInput
        value={v}
        onChange={set}
        min={0}
        max={max}
        ariaLabel={label}
        className="w-full bg-transparent text-center font-num text-3xl font-semibold outline-none"
      />
      <span className="text-[10px] text-sub">{label}</span>
    </label>
  );

  return (
    <div className="space-y-4 pt-4">
      <RecordTabs active="run" />

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">ランを記録</p>
          <select value={d} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-panel-2 px-2 py-1 text-xs outline-none">
            {Array.from({ length: 8 }, (_, i) => addDays(me.today, -i)).map((x, i) => (
              <option key={x} value={x}>
                {i === 0 ? "今日" : i === 1 ? "昨日" : x.slice(5).replace("-", "/")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-sub">距離</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setKm((k) => Math.max(0, Math.round((k - 0.1) * 10) / 10))} className="grid size-12 place-items-center rounded-xl bg-panel-2 text-xl text-sub">
              −
            </button>
            <label className="flex flex-1 items-baseline justify-center gap-1">
              <NumberInput
                value={km}
                onChange={setKm}
                min={0}
                max={100}
                decimals={2}
                ariaLabel="距離"
                className="w-28 bg-transparent text-center font-num text-5xl font-bold text-cardio outline-none"
              />
              <span className="text-sm text-sub">km</span>
            </label>
            <button onClick={() => setKm((k) => Math.round((k + 0.1) * 10) / 10)} className="grid size-12 place-items-center rounded-xl bg-panel-2 text-xl text-sub">
              +
            </button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {[1, 3, 5, 10, 21.1].map((v) => (
              <button key={v} onClick={() => setKm(v)} className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${km === v ? "bg-cardio text-bg" : "bg-panel-2 text-sub"}`}>
                {v}km
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs text-sub">時間</p>
          <div className="flex items-center gap-1.5">
            {num(h, setH, 23, "時間")}
            <span className="font-num text-2xl text-sub">:</span>
            {num(m, setM, 59, "分")}
            <span className="font-num text-2xl text-sub">:</span>
            {num(s, setS, 59, "秒")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-bg py-2">
            <p className="text-[10px] text-sub">平均ペース</p>
            <p className="font-num text-2xl font-bold">
              {formatPace(pace)}
              <span className="text-xs text-sub">/km</span>
            </p>
          </div>
          <div className="rounded-xl bg-bg py-2">
            <p className="text-[10px] text-sub">獲得予定</p>
            <p className="font-num text-2xl font-bold text-accent">+{preview}XP</p>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs text-bad">
            {errors.map((e) => (
              <p key={e}>・{e}</p>
            ))}
          </div>
        )}

        <SkinButton variant="run" onClick={() => save()} disabled={saving} className="h-16 w-full text-base">
          {saving ? "保存中…" : "ランを記録する"}
        </SkinButton>
      </Card>

      <section>
        <SectionTitle>ランニング記録</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          {[
            { l: "今月", v: monthKm.toFixed(1), u: "km" },
            { l: "累計距離", v: totalKm.toFixed(1), u: "km" },
            { l: "累計時間", v: formatDuration(totalS), u: "" },
          ].map((x) => (
            <div key={x.l} className="skin-card px-2 py-1.5">
              <p className="text-[10px] text-sub">{x.l}</p>
              <p className="font-num text-xl font-bold">
                {x.v}
                <span className="ml-0.5 text-[10px] text-sub">{x.u}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>ベストタイム（ペース換算）</SectionTitle>
        <Card className="grid grid-cols-4 gap-2 !p-3 text-center">
          {BEST_DISTANCES.map((dk) => {
            const t = bestTimeFor(me.runs, dk);
            return (
              <div key={dk}>
                <p className="text-[10px] text-sub">{dk}km</p>
                <p className="font-num text-base font-bold">{t ? formatDuration(t) : "--"}</p>
              </div>
            );
          })}
        </Card>
      </section>

      {me.runs.length > 0 && (
        <section>
          <SectionTitle>最近のラン</SectionTitle>
          <Card className="!p-0">
            {me.runs.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <span className="w-12 text-xs text-sub">{r.date.slice(5).replace("-", "/")}</span>
                <span className="flex-1 font-num">
                  <b className="text-lg text-cardio">{r.distanceKm}</b>km ・ {formatDuration(r.durationS)} ・ {formatPace(r.durationS / r.distanceKm)}
                </span>
                <button onClick={async () => (await ask("この記録を削除しますか？\n獲得した経験値も取り消されます", { ok: "削除する", danger: true })) && getRepo().deleteActivity("run", r.id)} className="text-xs text-sub">
                  削除
                </button>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
