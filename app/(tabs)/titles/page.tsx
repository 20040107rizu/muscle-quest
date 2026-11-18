"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sfx } from "@/components/fx/sound";
import { Card, Loading, PageHeader } from "@/components/ui/primitives";
import { RarityMark } from "@/components/ui/TitlePlate";
import { TitleView } from "@/components/ui/TitleView";
import { SkinGauge } from "@/components/ui/SkinGauge";
import { findTitle, titleHowToGet, TITLES, type Title } from "@/domain/quests";
import { THEME_LABELS, TITLE_RARITY_ORDER, titleProgress, type TitleRarity, type TitleTheme } from "@/domain/titles";
import { useMyData, wearTitle } from "@/data/hooks";

type Filter = "all" | "owned" | "locked";

/** 進み具合の表示（例: 12 / 30日） */
function progressText(cur: number, target: number, unit: string, condition: string) {
  if (condition === "best_pace") {
    const f = (s: number) => `${Math.floor(s / 60)}分${String(Math.round(s % 60)).padStart(2, "0")}秒`;
    return cur ? `いまの最速 ${f(cur)}/km（目標 ${f(target)}/km）` : "まだ1km以上走っていません";
  }
  return `${cur.toLocaleString()} / ${target.toLocaleString()}${unit}`;
}

/**
 * 称号図鑑。持っている称号はタップで付け替えられる。
 * 持っていない称号は黒いシルエットだけ表示し、手に入れる条件と進み具合が見られる。
 */
export default function TitlesPage() {
  const me = useMyData();
  const [err, setErr] = useState("");
  const [rarity, setRarity] = useState<TitleRarity | "all">("all");
  const [theme, setTheme] = useState<TitleTheme | "weekly" | "all">("all");
  const [filter, setFilter] = useState<Filter>("all");
  const owned = useMemo(() => new Set(me?.owned.titles ?? []), [me]);
  if (!me) return <Loading />;
  const current = findTitle(me.profile.titleId);

  const themeOf = (t: Title) => t.def?.theme ?? "weekly";
  const list = TITLES.filter(
    (t) =>
      (rarity === "all" || t.rarity === rarity) &&
      (theme === "all" || themeOf(t) === theme) &&
      (filter === "all" || (filter === "owned" ? owned.has(t.id) : !owned.has(t.id))),
  );

  async function wear(id: string | null) {
    try {
      setErr("");
      await wearTitle(id);
      sfx.coin();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  const chip = (on: boolean) => `shrink-0 rounded-full px-3 py-1 text-xs font-bold ${on ? "bg-ink text-bg" : "bg-panel text-sub"}`;

  return (
    <div className="space-y-4">
      <Link href="/me" className="block pt-4 text-xs text-sub">
        ‹ マイページ
      </Link>
      <PageHeader title="称号図鑑" sub={`集めた称号 ${owned.size} / ${TITLES.length}`} />

      <Card className="text-center">
        <p className="text-[10px] text-sub">いまつけている称号</p>
        <div className="mt-2 flex min-h-14 items-center justify-center">{current ? <TitleView title={current} size="full" /> : <p className="text-sm text-sub">なし</p>}</div>
        {current?.def && <p className="mt-1 text-xs italic text-ink/80">「{current.def.flavor}」</p>}
        {current && (
          <button onClick={() => wear(null)} className="mt-2 text-[11px] text-sub underline">
            はずす
          </button>
        )}
      </Card>

      {/* レア度ごとの集め具合 */}
      <div className="grid grid-cols-5 gap-1.5">
        {TITLE_RARITY_ORDER.map((r) => {
          const all = TITLES.filter((t) => t.rarity === r);
          const got = all.filter((t) => owned.has(t.id)).length;
          return (
            <button key={r} onClick={() => setRarity(rarity === r ? "all" : r)} className={`skin-card flex flex-col items-center py-1.5 ${rarity === r ? "ring-2 ring-accent-2" : ""}`}>
              <RarityMark rarity={r} size={30} />
              <span className="mt-0.5 font-num text-[11px]">
                {got}/{all.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(["all", "owned", "locked"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={chip(filter === f)}>
            {{ all: "すべて", owned: "持っている", locked: "まだ" }[f]}
          </button>
        ))}
        <span className="mx-1 w-px shrink-0 bg-line" />
        {(["all", ...Object.keys(THEME_LABELS), "weekly"] as (TitleTheme | "weekly" | "all")[]).map((k) => (
          <button key={k} onClick={() => setTheme(k)} className={chip(theme === k)}>
            {k === "all" ? "全種類" : k === "weekly" ? "週替わりボス" : THEME_LABELS[k as TitleTheme]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {list.map((t) => {
          const has = owned.has(t.id);
          const on = me.profile.titleId === t.id;
          const prog = t.def ? titleProgress(t.def, me.titleStats) : null;
          return (
            <button
              key={t.id}
              disabled={!has}
              onClick={() => wear(on ? null : t.id)}
              className={`skin-card flex w-full flex-col items-center gap-1.5 p-3 text-center ${on ? "ring-2 ring-accent-2" : ""}`}
            >
              <TitleView title={t} size="full" locked={!has} />
              <div className="flex items-center gap-1.5">
                <RarityMark rarity={t.rarity} size={20} className={has ? "" : "opacity-40 grayscale"} />
                {t.def && <span className="text-[10px] text-sub">{THEME_LABELS[t.def.theme]}</span>}
                {!t.def && <span className="text-[10px] text-sub">週替わりボス</span>}
              </div>
              {has ? (
                <>
                  {t.def && <p className="text-[11px] italic text-ink/80">「{t.def.flavor}」</p>}
                  <p className="text-[10px] text-sub">{on ? "つけています（タップではずす）" : "タップでつける"}</p>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-ink/85">入手条件：{titleHowToGet(t.id)}</p>
                  {prog && (
                    <div className="w-full">
                      <SkinGauge kind="ms" value={t.def!.condition === "best_pace" ? 0 : prog.current / prog.target} h={10} />
                      <p className="mt-0.5 font-num text-[10px] text-sub">{progressText(prog.current, prog.target, prog.unit, t.def!.condition)}</p>
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
        {list.length === 0 && <p className="skin-card p-4 text-center text-xs text-sub">この条件の称号はありません</p>}
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
    </div>
  );
}
