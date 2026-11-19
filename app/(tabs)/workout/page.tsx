"use client";

import { SkinButton, SkinFace } from "@/components/ui/SkinButton";
import { useMemo, useState } from "react";
import { summarizeSets } from "@/components/ActivityCard";
import { useFeedback } from "@/components/ui/Feedback";
import { RecordTabs } from "@/components/RecordTabs";
import { ExerciseGuideCard } from "@/components/ExerciseGuideCard";
import { Card, Loading, SectionTitle, Stepper } from "@/components/ui/primitives";
import { addDays } from "@/domain/dates";
import { EXERCISE_GROUP_ORDER, isAssist, PRESET_EXERCISES, primaryGroup } from "@/domain/exercises";
import type { Exercise, MuscleGroup, SetRecord, WorkoutEntry, WorkoutMenu } from "@/domain/types";
import { bestE1RM, computeWorkoutXp, volumeOf } from "@/domain/xp";
import { getRepo, useMyData } from "@/data/hooks";
import { newId } from "@/data/local/localRepository";

export default function WorkoutPage() {
  const me = useMyData();
  const [selected, setSelected] = useState<Exercise | null>(null);
  /** メニューを進めている途中なら、そのメニューと何種目目か */
  const [run, setRun] = useState<{ menu: WorkoutMenu; index: number } | null>(null);

  if (!me) return <Loading />;
  const all = [...PRESET_EXERCISES, ...me.customExercises];
  const find = (id: string) => all.find((e) => e.id === id);

  function startMenu(menu: WorkoutMenu, index = 0) {
    for (let i = index; i < menu.exerciseIds.length; i++) {
      const ex = find(menu.exerciseIds[i]);
      if (ex) {
        setRun({ menu, index: i });
        setSelected(ex);
        return;
      }
    }
    setRun(null);
    setSelected(null);
  }

  return (
    <div className="space-y-4 pt-4">
      <RecordTabs active="workout" />
      {selected ? (
        <SetEditor
          key={`${selected.id}:${run?.index ?? ""}`}
          exercise={selected}
          history={me.workouts.filter((w) => w.exerciseId === selected.id)}
          today={me.today}
          bodyweightKg={me.profile.bodyweightKg}
          todaySetsSameExercise={me.workouts.filter((w) => w.exerciseId === selected.id && w.date === me.today).reduce((a, w) => a + w.sets.length, 0)}
          menuStep={run ? { name: run.menu.name, index: run.index, total: run.menu.exerciseIds.length } : undefined}
          onNext={run ? () => startMenu(run.menu, run.index + 1) : undefined}
          onBack={() => {
            setRun(null);
            setSelected(null);
          }}
        />
      ) : (
        <ExercisePicker exercises={all} recent={me.workouts} menus={me.menus} todayIds={me.workouts.filter((w) => w.date === me.today).map((w) => w.exerciseId).reverse()} onPick={setSelected} onStartMenu={startMenu} />
      )}
      <TodayList entries={me.workouts.filter((w) => w.date === me.today)} />
    </div>
  );
}

function ExercisePicker({
  exercises,
  recent,
  menus,
  todayIds,
  onPick,
  onStartMenu,
}: {
  exercises: Exercise[];
  recent: WorkoutEntry[];
  menus: WorkoutMenu[];
  todayIds: string[];
  onPick: (e: Exercise) => void;
  onStartMenu: (m: WorkoutMenu) => void;
}) {
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [adding, setAdding] = useState(false);
  const [building, setBuilding] = useState(false);
  const { confirm: ask } = useFeedback();
  const nameOf = (id: string) => exercises.find((e) => e.id === id)?.name ?? "（削除された種目）";
  const [q, setQ] = useState("");

  const recentEx = useMemo(() => {
    const ids: string[] = [];
    for (const w of recent) if (!ids.includes(w.exerciseId)) ids.push(w.exerciseId);
    return ids.map((id) => exercises.find((e) => e.id === id)).filter((e): e is Exercise => !!e).slice(0, 4);
  }, [recent, exercises]);

  const list = exercises.filter((e) => (group === "all" || primaryGroup(e) === group) && (!q || e.name.includes(q)));

  return (
    <div className="space-y-4">
      <section>
        <SectionTitle>マイメニュー</SectionTitle>
        <div className="space-y-2">
          {menus.map((m) => (
            <div key={m.id} className="skin-card flex items-center gap-2 p-3">
              <button onClick={() => onStartMenu(m)} className="min-w-0 flex-1 text-left">
                <p className="text-sm font-black">{m.name}</p>
                <p className="truncate text-[11px] text-sub">{m.exerciseIds.map(nameOf).join(" → ")}</p>
              </button>
              <SkinButton onClick={() => onStartMenu(m)} className="h-10 w-20 shrink-0 text-xs">
                始める
              </SkinButton>
              <button
                aria-label="メニューを削除"
                onClick={async () => (await ask(`メニュー「${m.name}」を削除しますか？`, { ok: "削除する", danger: true })) && getRepo().deleteMenu(m.id)}
                className="shrink-0 px-1 text-sub"
              >
                ✕
              </button>
            </div>
          ))}
          {building ? (
            <MenuBuilder exercises={exercises} initial={todayIds} onDone={() => setBuilding(false)} />
          ) : (
            <button onClick={() => setBuilding(true)} className="w-full rounded-xl border border-dashed border-line py-3 text-sm text-sub">
              ＋ メニューを作る{todayIds.length > 0 ? "（今日やった種目から）" : ""}
            </button>
          )}
        </div>
      </section>

      {recentEx.length > 0 && (
        <section>
          <SectionTitle>最近の種目</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {recentEx.map((e) => (
              <button key={e.id} onClick={() => onPick(e)} className="skin-card px-2 py-2 text-left text-sm font-bold active:bg-panel-2">
                {e.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionTitle>種目を選ぶ</SectionTitle>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="種目を検索"
          className="mb-2 w-full skin-input px-2 py-1.5 text-sm outline-none"
        />
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[{ group: "all" as const, label: "すべて" }, ...EXERCISE_GROUP_ORDER].map((g) => (
            <button
              key={g.group}
              onClick={() => setGroup(g.group)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${group === g.group ? "bg-ink text-bg" : "bg-panel text-sub"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <Card className="!p-0">
          {list.map((e) => (
            <button key={e.id} onClick={() => onPick(e)} className="flex w-full items-center justify-between border-b border-line px-4 py-3 text-left last:border-0 active:bg-panel-2">
              <span className="text-sm font-medium">
                {e.name}
                {e.isCustom && <span className="ml-2 rounded bg-panel-2 px-1.5 py-0.5 text-[10px] text-sub">マイ種目</span>}
              </span>
              <span className="text-xs text-sub">{EXERCISE_GROUP_ORDER.find((g) => g.group === primaryGroup(e))?.label} ›</span>
            </button>
          ))}
          {list.length === 0 && <p className="p-4 text-center text-sm text-sub">該当する種目がありません</p>}
        </Card>
      </section>

      {adding ? (
        <AddExerciseForm onDone={() => setAdding(false)} />
      ) : (
        <button onClick={() => setAdding(true)} className="w-full rounded-xl border border-dashed border-line py-3 text-sm text-sub">
          ＋ 自分で種目を追加
        </button>
      )}
    </div>
  );
}

/** メニュー作り。タップした順に種目が並ぶ */
function MenuBuilder({ exercises, initial, onDone }: { exercises: Exercise[]; initial: string[]; onDone: () => void }) {
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>(() => [...new Set(initial)]);
  const [group, setGroup] = useState<MuscleGroup | "all">("all");
  const [err, setErr] = useState("");
  const toggle = (id: string) => setIds((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const list = exercises.filter((e) => group === "all" || primaryGroup(e) === group);
  return (
    <Card className="space-y-3">
      <p className="text-sm font-bold">メニューを作る</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 胸の日" maxLength={20} className="w-full skin-input px-2 py-1.5 text-sm outline-none" />
      <div>
        <p className="mb-1.5 text-xs text-sub">やる順番（タップで外す）</p>
        {ids.length ? (
          <div className="flex flex-wrap gap-1.5">
            {ids.map((id, i) => (
              <button key={id} onClick={() => toggle(id)} className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
                {i + 1}. {exercises.find((e) => e.id === id)?.name ?? id} ✕
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-sub">下の一覧から種目をタップして追加</p>
        )}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[{ group: "all" as const, label: "すべて" }, ...EXERCISE_GROUP_ORDER].map((g) => (
          <button key={g.group} onClick={() => setGroup(g.group)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${group === g.group ? "bg-ink text-bg" : "bg-panel-2 text-sub"}`}>
            {g.label}
          </button>
        ))}
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl bg-panel-2">
        {list.map((e) => (
          <button key={e.id} onClick={() => toggle(e.id)} className="flex w-full items-center justify-between border-b border-line px-3 py-2.5 text-left text-sm last:border-0">
            {e.name}
            <span className={`text-xs font-bold ${ids.includes(e.id) ? "text-accent" : "text-sub"}`}>{ids.includes(e.id) ? `${ids.indexOf(e.id) + 1}番目` : "＋"}</span>
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
      <div className="grid grid-cols-2 gap-2">
        <SkinButton variant="gray" onClick={onDone} className="h-11 w-full text-sm">
          やめる
        </SkinButton>
        <SkinButton
          onClick={async () => {
            try {
              await getRepo().saveMenu(name, ids);
              onDone();
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
          className="h-11 w-full text-sm"
        >
          保存する
        </SkinButton>
      </div>
    </Card>
  );
}

function AddExerciseForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<MuscleGroup>("chest");
  const [bw, setBw] = useState(false);
  const [err, setErr] = useState("");
  return (
    <Card className="space-y-3">
      <p className="text-sm font-bold">種目を追加</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: ケーブルクロスオーバー" maxLength={30} className="w-full skin-input px-2 py-1.5 text-sm outline-none" />
      <div>
        <p className="mb-1.5 text-xs text-sub">メインで鍛える部位（キャラのどこが育つか）</p>
        <div className="grid grid-cols-3 gap-1.5">
          {EXERCISE_GROUP_ORDER.map((g) => (
            <button key={g.group} onClick={() => setGroup(g.group)} className={`rounded-lg py-2 text-xs font-bold ${group === g.group ? "bg-accent text-white" : "bg-panel-2 text-sub"}`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={bw} onChange={(e) => setBw(e.target.checked)} className="accent-[#ff6b2c]" />
        自重種目（体重を負荷として計算）
      </label>
      {err && <p className="text-xs text-bad">{err}</p>}
      <div className="flex gap-2">
        <button onClick={onDone} className="flex-1 rounded-xl bg-panel-2 py-2.5 text-sm">
          キャンセル
        </button>
        <button
          onClick={async () => {
            try {
              await getRepo().addCustomExercise(name, group, bw);
              onDone();
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-bold text-white"
        >
          追加
        </button>
      </div>
    </Card>
  );
}

function SetEditor({
  exercise,
  history,
  today,
  bodyweightKg,
  todaySetsSameExercise,
  menuStep,
  onNext,
  onBack,
}: {
  exercise: Exercise;
  history: WorkoutEntry[];
  today: string;
  bodyweightKg: number;
  todaySetsSameExercise: number;
  /** メニューを進めている途中なら、その情報 */
  menuStep?: { name: string; index: number; total: number };
  /** メニューの次の種目へ（最後なら終わり） */
  onNext?: () => void;
  onBack: () => void;
}) {
  const { showResult, confirm: ask } = useFeedback();
  const prev = history[0]; // createdAt 降順
  const assist = !!exercise.assist;
  const best = history.length ? Math.max(...history.map((h) => bestE1RM(h.sets))) : 0;
  // アシスト式は補助が少ないほど強い → 最小アシストが自己ベスト
  const minAssist = history.length ? Math.min(...history.flatMap((h) => h.sets.map((s) => s.weightKg))) : null;
  const defaultSet: SetRecord =
    prev?.sets[prev.sets.length - 1] ?? { weightKg: exercise.bodyweight ? 0 : assist ? Math.round(bodyweightKg * 0.5 / 5) * 5 : 20, reps: 10 };
  // 前回の記録があれば、全セットの重さ・回数を最初から入れておく
  const [sets, setSets] = useState<SetRecord[]>(() => (prev ? prev.sets.map((s) => ({ ...s })) : [{ ...defaultSet }]));
  const [date, setDate] = useState(today);
  // 保存するまで同じIDを使う → 連打・再送信しても1回分しか記録されない
  const [draftId, setDraftId] = useState(() => newId());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const update = (i: number, patch: Partial<SetRecord>) => setSets((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const preview = computeWorkoutXp({ exercise, sets, priorSetsToday: date === today ? todaySetsSameExercise : 0, bodyweightKg }).total;
  const vol = volumeOf(sets);
  const prevVol = prev ? volumeOf(prev.sets) : 0;
  const e1 = bestE1RM(sets);
  const reps = sets.reduce((a, x) => a + x.reps, 0);
  const prevReps = prev ? prev.sets.reduce((a, x) => a + x.reps, 0) : 0;
  const curMinAssist = Math.min(...sets.map((x) => x.weightKg));

  async function save(confirm = false) {
    setSaving(true);
    const r = await getRepo().saveWorkout({ id: draftId, exerciseId: exercise.id, sets, date }, { confirm });
    setSaving(false);
    if (r.errors.length) return setErrors(r.errors);
    if (!r.ok && r.warnings.length) {
      if (await ask(r.warnings.join("\n") + "\n\nこのまま記録しますか？", { ok: "記録する" })) return save(true);
      return;
    }
    setErrors([]);
    if (!r.duplicate) showResult(r, `${exercise.name} を記録しました`);
    setDraftId(newId());
    if (onNext) onNext();
    else onBack();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-sub">
          {menuStep ? "‹ メニューをやめる" : "‹ 種目を変更"}
        </button>
        <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg bg-panel px-2 py-1 text-xs text-ink outline-none">
          {Array.from({ length: 8 }, (_, i) => addDays(today, -i)).map((d, i) => (
            <option key={d} value={d}>
              {i === 0 ? "今日" : i === 1 ? "昨日" : d.slice(5).replace("-", "/")}
            </option>
          ))}
        </select>
      </div>

      {menuStep && (
        <div className="skin-tag flex items-center justify-between px-2 py-1 text-xs">
          <span className="font-bold">
            {menuStep.name}　{menuStep.index + 1} / {menuStep.total}種目
          </span>
          {onNext && (
            <button onClick={onNext} className="text-sub">
              {menuStep.index + 1 < menuStep.total ? "この種目を飛ばす ›" : "メニューを終える"}
            </button>
          )}
        </div>
      )}

      <Card>
        <p className="text-lg font-black">{exercise.name}</p>
        {prev ? (
          <div className="mt-2 rounded-xl bg-panel-2 p-3 text-xs">
            <div className="flex justify-between text-sub">
              <span>前回 {prev.date.slice(5).replace("-", "/")}</span>
              <span>{assist ? `最小アシスト ${minAssist}kg` : `推定MAX ${best.toFixed(1)}kg`}</span>
            </div>
            <p className="mt-1 font-num text-sm">{summarizeSets(prev.sets, assist)}</p>
            <p className="mt-1.5 text-[11px] text-accent-2">前回の重さと回数を入れてあります。変えたいところだけ直してください</p>
          </div>
        ) : (
          <p className="mt-1 text-xs text-sub">初めての種目です。無理のない重量から始めましょう</p>
        )}
        {assist && (
          <p className="mt-2 text-[11px] leading-relaxed text-sub">
            アシスト（補助）重量を入力します。少ないほど負荷が高く、0kgで補助なしの懸垂と同じです。体重 {bodyweightKg}kg − アシストを負荷として計算します。
          </p>
        )}
      </Card>

      <ExerciseGuideCard exerciseId={exercise.id} />

      <div className="space-y-2">
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.25rem] gap-1.5 px-1 text-[10px] text-sub">
          <span>SET</span>
          <span className="text-center">{assist ? "アシスト" : exercise.bodyweight ? "追加重量" : "重量"}</span>
          <span className="text-center">回数</span>
          <span />
        </div>
        {sets.map((s, i) => (
          <div key={i} className="mq-rise grid grid-cols-[1.5rem_1fr_1fr_1.25rem] items-center gap-1.5">
            <span className="text-center font-num text-lg font-bold text-sub">{i + 1}</span>
            <Stepper label="重量" value={s.weightKg} step={exercise.step} max={exercise.maxWeightKg} unit="kg" onChange={(v) => update(i, { weightKg: v })} />
            <Stepper label="回数" value={s.reps} step={1} min={1} max={100} unit="回" decimals={0} onChange={(v) => update(i, { reps: v })} />
            <button aria-label="セットを削除" onClick={() => setSets((x) => x.filter((_, j) => j !== i))} disabled={sets.length === 1} className="text-sub disabled:opacity-20">
              ✕
            </button>
          </div>
        ))}
        <button onClick={() => setSets((x) => [...x, { ...x[x.length - 1] }])} disabled={sets.length >= 20} className="w-full rounded-xl border border-dashed border-line py-2.5 text-sm text-sub">
          ＋ セットを追加
        </button>
      </div>

      <Card className="grid grid-cols-3 gap-2 !p-3 text-center">
        {assist ? (
          <>
            <div>
              <p className="text-[10px] text-sub">総回数</p>
              <p className="font-num text-lg font-bold">{reps}回</p>
              {prev && (
                <p className={`text-[10px] font-bold ${reps >= prevReps ? "text-good" : "text-bad"}`}>
                  前回比 {reps >= prevReps ? "+" : ""}
                  {reps - prevReps}
                </p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-sub">最小アシスト</p>
              <p className="font-num text-lg font-bold">{curMinAssist}kg</p>
              {minAssist != null && curMinAssist < minAssist && <p className="text-[10px] font-bold text-accent-2">自己ベスト更新!</p>}
            </div>
          </>
        ) : (
          <>
        <div>
          <p className="text-[10px] text-sub">総挙上量</p>
          <p className="font-num text-lg font-bold">{vol.toLocaleString()}kg</p>
          {prev && (
            <p className={`text-[10px] font-bold ${vol >= prevVol ? "text-good" : "text-bad"}`}>
              前回比 {vol >= prevVol ? "+" : ""}
              {(vol - prevVol).toLocaleString()}
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] text-sub">推定1RM</p>
          <p className="font-num text-lg font-bold">{e1.toFixed(1)}kg</p>
          {best > 0 && e1 > best && <p className="text-[10px] font-bold text-accent-2">自己ベスト更新!</p>}
        </div>
          </>
        )}
        <div>
          <p className="text-[10px] text-sub">獲得予定</p>
          <p className="font-num text-lg font-bold text-accent">+{preview}XP</p>
        </div>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-xs text-bad">
          {errors.map((e) => (
            <p key={e}>・{e}</p>
          ))}
        </div>
      )}

      <SkinButton onClick={() => save()} disabled={saving} className="h-16 w-full text-base">
        {saving ? "保存中…" : menuStep && menuStep.index + 1 < menuStep.total ? `${sets.length}セットを記録して次へ` : `${sets.length}セットを記録する`}
      </SkinButton>
    </div>
  );
}

function TodayList({ entries }: { entries: WorkoutEntry[] }) {
  const { confirm: ask } = useFeedback();
  if (!entries.length) return null;
  return (
    <section>
      <SectionTitle>今日の筋トレ</SectionTitle>
      <Card className="!p-0">
        {entries.map((w) => (
          <div key={w.id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-0">
            <div>
              <p className="text-sm font-bold">{w.exerciseName}</p>
              <p className="font-num text-xs text-sub">{summarizeSets(w.sets, isAssist(w.exerciseId))}</p>
            </div>
            <button
              onClick={async () => (await ask("この記録を削除しますか？\n獲得した経験値も取り消されます", { ok: "削除する", danger: true })) && getRepo().deleteActivity("workout", w.id)}
              className="text-xs text-sub"
            >
              削除
            </button>
          </div>
        ))}
      </Card>
    </section>
  );
}
