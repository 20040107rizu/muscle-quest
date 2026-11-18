"use client";

import Link from "next/link";
import { useState } from "react";
import { sfx } from "@/components/fx/sound";
import { Card, Loading, PageHeader } from "@/components/ui/primitives";
import { RarityMark, TitlePlate } from "@/components/ui/TitlePlate";
import { findTitle, titleHowToGet, TITLES } from "@/domain/quests";
import { useMyData, wearTitle } from "@/data/hooks";

/**
 * 称号図鑑。持っている称号はタップで付け替えられる。
 * 持っていない称号は名前を隠したシルエットで表示し、手に入れる条件だけ見られる。
 */
export default function TitlesPage() {
  const me = useMyData();
  const [err, setErr] = useState("");
  if (!me) return <Loading />;
  const owned = new Set(me.owned.titles);
  const current = findTitle(me.profile.titleId);

  async function wear(id: string | null) {
    try {
      setErr("");
      await wearTitle(id);
      sfx.coin();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <Link href="/me" className="block pt-4 text-xs text-sub">
        ‹ マイページ
      </Link>
      <PageHeader title="称号図鑑" sub={`集めた称号 ${owned.size} / ${TITLES.length}`} />

      <Card className="text-center">
        <p className="text-[10px] text-sub">いまつけている称号</p>
        <div className="mt-2 flex min-h-11 items-center justify-center">
          {current ? <TitlePlate name={current.name} rarity={current.rarity} size="lg" /> : <p className="text-sm text-sub">なし</p>}
        </div>
        {current && (
          <button onClick={() => wear(null)} className="mt-2 text-[11px] text-sub underline">
            はずす
          </button>
        )}
      </Card>

      <div className="space-y-2">
        {TITLES.map((t) => {
          const has = owned.has(t.id);
          const on = me.profile.titleId === t.id;
          return (
            <button
              key={t.id}
              disabled={!has}
              onClick={() => wear(on ? null : t.id)}
              className={`skin-card flex w-full items-center gap-3 p-3 text-left ${on ? "ring-2 ring-accent-2" : ""}`}
            >
              <RarityMark rarity={t.rarity} size={34} className={has ? "" : "opacity-40 grayscale"} />
              <div className="min-w-0 flex-1">
                {has ? (
                  <TitlePlate name={t.name} rarity={t.rarity} />
                ) : (
                  // 持っていない称号はシルエットだけ
                  <span className="inline-block opacity-60 brightness-0 contrast-50">
                    <TitlePlate name={"？".repeat([...t.name].length)} rarity={t.rarity} />
                  </span>
                )}
                <p className={`mt-1 text-[11px] ${has ? "text-sub" : "text-ink/80"}`}>
                  {has ? (on ? "つけています（タップではずす）" : "タップでつける") : `入手条件：${titleHowToGet(t.id)}`}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {err && <p className="text-xs text-bad">{err}</p>}
    </div>
  );
}
