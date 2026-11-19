"use client";

import Link from "next/link";
import { useMemo, useState, useRef } from "react";
import { ActivityCard } from "@/components/ActivityCard";
import { DayLog } from "@/components/DayLog";
import { makeAvatar } from "@/components/ui/avatarPhoto";
import { useFeedback } from "@/components/ui/Feedback";
import { NumberInput } from "@/components/ui/NumberInput";
import { isSoundOn, setSoundOn, sfx } from "@/components/fx/sound";
import { Card, Initial, LevelBadge, Loading, PageHeader, Segmented, SectionTitle } from "@/components/ui/primitives";
import { addDays, parseDateKey } from "@/domain/dates";
import { isAssist, PRESET_EXERCISES } from "@/domain/exercises";
import type { SetRecord } from "@/domain/types";
import { bestE1RM, volumeOf } from "@/domain/xp";
import { getRepo, useCheers, useMyData } from "@/data/hooks";

export default function MyPage() {
  const me = useMyData();
  const cheersFor = useCheers();
  const { confirm: ask } = useFeedback();
  const [tab, setTab] = useState<"history" | "bests">("history");
  /** 日ごとの記録で表示している日（カレンダーをタップしても変わる） */
  const [day, setDay] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bw, setBw] = useState(65);

  const xpByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of me?.xpEvents ?? []) m.set(e.date, (m.get(e.date) ?? 0) + e.total);
    return m;
  }, [me?.xpEvents]);

  // 自己ベスト。種目の種類ごとに「何で比べるか」を変える
  //  重さ: 推定MAX / アシスト: 最小アシスト / 自重: 1セットの最多回数（追加の重りがあれば併記） / 秒数: 最長キープ
  const bests = useMemo(() => {
    type Kind = "weight" | "assist" | "bodyweight" | "timed";
    const all = [...PRESET_EXERCISES, ...(me?.customExercises ?? [])];
    const kindOf = (id: string): Kind => {
      const ex = all.find((e) => e.id === id);
      return ex?.timed ? "timed" : ex?.assist ? "assist" : ex?.bodyweight ? "bodyweight" : "weight";
    };
    // 1回の記録の値（大きいほど良い。アシストは小さいほど良いので符号を逆に）
    const score = (k: Kind, sets: SetRecord[]) => {
      if (k === "timed" || k === "bodyweight") return Math.max(...sets.map((x) => x.reps));
      if (k === "assist") return -Math.min(...sets.map((x) => x.weightKg));
      return bestE1RM(sets);
    };
    const map = new Map<string, { name: string; kind: Kind; best: number; bestSet: SetRecord; maxW: number; count: number; last: string; lastScore: number; prevScore: number | null }>();
    for (const w of me?.workouts ?? []) {
      const kind = kindOf(w.exerciseId);
      const sc = score(kind, w.sets);
      // 自重種目の代表のセット：回数が一番多いセット（同じなら重りが重いほう）
      const top = [...w.sets].sort((x, y) => y.reps - x.reps || y.weightKg - x.weightKg)[0];
      const maxW = Math.max(...w.sets.map((x) => x.weightKg));
      const cur = map.get(w.exerciseId);
      if (!cur) map.set(w.exerciseId, { name: w.exerciseName, kind, best: sc, bestSet: top, maxW, count: 1, last: w.date, lastScore: sc, prevScore: null });
      else {
        if (sc > cur.best) {
          cur.best = sc;
          cur.bestSet = top;
        }
        cur.maxW = Math.max(cur.maxW, maxW);
        if (cur.count === 1) cur.prevScore = sc;
        cur.count++;
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [me?.workouts, me?.customExercises]);


  if (!me) return <Loading />;
  const c = me.character;
  const totalSets = me.workouts.reduce((a, w) => a + w.sets.length, 0);
  const totalVol = me.workouts.filter((w) => !isAssist(w.exerciseId)).reduce((a, w) => a + volumeOf(w.sets), 0);
  const totalKm = me.runs.reduce((a, r) => a + r.distanceKm, 0);

  // 直近5週のカレンダー（月曜始まり）
  const todayDow = (parseDateKey(me.today).getDay() + 6) % 7;
  const calStart = addDays(me.today, -(28 + todayDow));
  const cal = Array.from({ length: 35 }, (_, i) => addDays(calStart, i));

  return (
    <div className="space-y-5">
      <PageHeader title="マイページ" />

      <Card>
        <div className="flex items-center gap-3">
          <Initial name={me.profile.displayName} size={52} src={me.profile.avatar} />
          <div className="flex-1">
            <p className="text-lg font-black">{me.profile.displayName}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <LevelBadge level={c.level} size="sm" />
              <span className="text-xs text-sub">{c.tier.name}</span>
              <span className="text-xs text-sub">・ {me.profile.bodyweightKg}kg</span>
            </div>
          </div>
          <button
            onClick={() => {
              setName(me.profile.displayName);
              setBw(me.profile.bodyweightKg);
              setEditing((e) => !e);
            }}
            className="rounded-lg bg-panel-2 px-3 py-1.5 text-xs"
          >
            編集
          </button>
        </div>
        {editing && (
          <div className="mt-3 space-y-2 border-t border-line pt-3">
            <div className="flex items-center gap-3">
              <Initial name={me.profile.displayName} size={56} src={me.profile.avatar} />
              <div className="flex flex-1 flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-bold">
                  写真を選ぶ
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        await getRepo().setAvatar(await makeAvatar(f));
                      } catch (err) {
                        await ask((err as Error).message, { ok: "OK" });
                      }
                    }}
                  />
                </label>
                {me.profile.avatar && (
                  <button onClick={() => getRepo().setAvatar(null)} className="rounded-lg px-3 py-1.5 text-xs text-sub">
                    写真を外す
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-sub">プロフィール写真は友達の画面やランキングにも表示されます</p>
            <label className="block text-xs text-sub">
              表示名
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="mt-1 w-full skin-input px-2 py-1 text-sm text-ink outline-none" />
            </label>
            <label className="block text-xs text-sub">
              体重 (kg) — 自重種目の負荷計算に使用。友達には公開されません
              <NumberInput value={bw} onChange={setBw} min={30} max={250} decimals={1} ariaLabel="体重" className="mt-1 w-full skin-input px-2 py-1 font-num text-sm text-ink outline-none" />
            </label>
            <button
              onClick={async () => {
                await getRepo().updateProfile({ displayName: name, bodyweightKg: bw });
                setEditing(false);
              }}
              className="w-full rounded-lg bg-accent py-2 text-sm font-bold text-white"
            >
              保存
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "運動日数", v: c.activeDays, u: "日" },
          { l: "総セット", v: totalSets, u: "set" },
          { l: "総挙上量", v: totalVol >= 10000 ? (totalVol / 1000).toFixed(1) : totalVol, u: totalVol >= 10000 ? "t" : "kg" },
          { l: "総走行距離", v: totalKm.toFixed(1), u: "km" },
          { l: "連続日数", v: c.streak, u: "日" },
          { l: "総経験値", v: c.totalXp.toLocaleString(), u: "XP" },
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

      <section>
        <SectionTitle>アクティビティ</SectionTitle>
        <Card className="!p-3">
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] text-sub">
            {["月", "火", "水", "木", "金", "土", "日"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cal.map((d) => {
              const xp = xpByDate.get(d) ?? 0;
              const future = d > me.today;
              const o = xp === 0 ? 0 : Math.min(1, 0.25 + xp / 800);
              return (
                <button
                  key={d}
                  title={`${d}: ${xp}XP`}
                  disabled={future}
                  aria-label={`${d}のトレーニングを見る`}
                  onClick={() => {
                    // タップした日のトレーニング一覧へ
                    setDay(d);
                    setTab("history");
                    requestAnimationFrame(() => logRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  }}
                  className={`aspect-square rounded-md ${d === day && tab === "history" ? "ring-2 ring-accent-2" : d === me.today ? "ring-1 ring-ink/60" : ""} ${future ? "opacity-20" : "active:scale-95"}`}
                  style={{ background: xp ? `rgba(255,107,44,${o})` : "rgba(255,255,255,0.05)" }}
                />
              );
            })}
          </div>
        </Card>
      </section>

      <div ref={logRef} className="scroll-mt-4" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "history", label: "日ごとの記録" },
          { value: "bests", label: "自己ベスト" },
        ]}
      />

      {tab === "history" ? (
        <DayLog
          activities={me.activities}
          today={me.today}
          date={day ?? me.today}
          onDateChange={setDay}
          renderCard={(a) => (
            <ActivityCard
              a={a}
              name={me.profile.displayName}
              now={me.now}
              received={cheersFor(a.id)}
              avatar={me.profile.avatar}
              right={
                <button
                  aria-label="削除"
                  onClick={async () => (await ask("この記録を削除しますか？\n獲得した経験値も取り消されます", { ok: "削除する", danger: true })) && getRepo().deleteActivity(a.type, a.id)}
                  className="text-xs text-sub"
                >
                  ✕
                </button>
              }
            />
          )}
        />
      ) : (
        <Card className="!p-0">
          {bests.length === 0 && <p className="p-4 text-center text-sm text-sub">筋トレを記録すると自己ベストが表示されます</p>}
          {bests.map((b) => {
            const raw = b.prevScore != null ? b.lastScore - b.prevScore : null;
            const unit = b.kind === "timed" ? "秒" : b.kind === "bodyweight" ? "回" : "kg";
            // アシストは符号を逆にしてあるので「減った＝良い」がプラスになる
            const diff = raw;
            const main =
              b.kind === "timed" ? `${b.best}秒` : b.kind === "bodyweight" ? (b.bestSet.weightKg > 0 ? `+${b.bestSet.weightKg}kg×${b.best}回` : `${b.best}回`) : b.kind === "assist" ? `${-b.best}kg` : `${b.maxW}kg`;
            const sub = b.kind === "timed" ? "最長キープ" : b.kind === "bodyweight" ? "1セットの最多回数" : b.kind === "assist" ? "最小アシスト" : `推定MAX ${b.best.toFixed(1)}kg`;
            return (
              <div key={b.name} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-[10px] text-sub">
                    {b.count}回記録 ・ 最終 {b.last.slice(5).replace("-", "/")}
                    {diff != null && diff !== 0 && (
                      <span className={`ml-1 font-bold ${diff > 0 ? "text-good" : "text-bad"}`}>
                        {b.kind === "assist"
                          ? `前回比 アシスト${diff > 0 ? "−" : "+"}${Math.abs(diff)}kg`
                          : `前回比 ${diff > 0 ? "+" : ""}${b.kind === "weight" ? diff.toFixed(1) : diff}${unit}`}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-num text-lg font-bold">{main}</p>
                  <p className="text-[10px] text-sub">{sub}</p>
                </div>
              </div>
            );
          })}
        </Card>
      )}

      <Link href="/body" className="skin-card flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold">体の記録（体重・写真）</span>
        <span className="text-xs text-sub">見る ›</span>
      </Link>

      <Link href="/titles" className="skin-card flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold">称号図鑑</span>
        <span className="text-xs text-sub">見る ›</span>
      </Link>

      <SoundToggle />

      <button
        onClick={async () => {
          if (await ask("この端末のすべての記録を削除してリセットしますか？\n元に戻せません", { ok: "リセット", danger: true })) {
            await getRepo().resetAll();
            location.reload();
          }
        }}
        className="w-full py-3 text-xs text-sub"
      >
        データをリセット
      </button>
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(() => (typeof window === "undefined" ? true : isSoundOn()));
  return (
    <Card className="flex items-center justify-between !py-3">
      <div>
        <p className="text-sm font-bold">効果音・バイブ</p>
        <p className="text-[11px] text-sub">記録やボス戦の演出で鳴ります</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => {
          setSoundOn(!on);
          setOn(!on);
          if (!on) sfx.coin();
        }}
        className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-accent" : "bg-panel-2"}`}
      >
        <span className={`absolute top-0.5 size-6 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </Card>
  );
}
