"use client";

import Link from "next/link";
import { useState } from "react";
import { TitleBadge } from "@/components/TitleBadge";
import { Card, PageHeader, Segmented } from "@/components/ui/primitives";
import { RARITY_DEFAULT_FX, TITLE_GLOWS, TITLE_MOTIONS, TITLE_PARTICLES, TITLE_STYLES, type TitleFx, type TitleRarity } from "@/domain/titleFx";

const RARITIES: TitleRarity[] = ["N", "R", "SR", "SSR", "UR"];
const SAMPLE_NAMES = ["鋼の胸板", "暁を駆ける者", "不屈の魂", "重力を統べる者", "筋肉覇王", "千日の鍛錬者", "プロテインに愛された男", "天を穿つ筋神"];
const PALETTE = ["#ff6b2c", "#ffd166", "#3ddc97", "#4cc9f0", "#b79cff", "#ff5d8f", "#ffffff", "#ff3b1f", "#7fd8ff"];

function pick<T>(a: T[]) {
  return a[Math.floor(Math.random() * a.length)];
}

function randomFx(): { name: string; rarity: TitleRarity; fx: TitleFx } {
  return {
    name: pick(SAMPLE_NAMES),
    rarity: pick(RARITIES),
    fx: {
      style: pick(TITLE_STYLES).id,
      glow: pick(TITLE_GLOWS).id,
      particle: pick(TITLE_PARTICLES).id,
      motion: pick(TITLE_MOTIONS).id,
      color1: pick(PALETTE),
      color2: pick(PALETTE),
    },
  };
}

type Tab = "style" | "glow" | "particle" | "motion" | "random";

/** 称号エフェクト図鑑。すべての質感・光り方・舞うもの・動きを見比べられる */
export default function TitleFxPage() {
  const [tab, setTab] = useState<Tab>("style");
  const [rolls, setRolls] = useState(() => Array.from({ length: 10 }, randomFx));
  const base: TitleFx = { style: "gold", glow: "soft", particle: "none", motion: "none" };
  const list =
    tab === "style"
      ? TITLE_STYLES.map((o) => ({ o, fx: { ...base, style: o.id, glow: "none", color1: "#4cc9f0", color2: "#b79cff" } }))
      : tab === "glow"
        ? TITLE_GLOWS.map((o) => ({ o, fx: { ...base, glow: o.id, color1: "#ffb547", color2: "#ff5d8f" } }))
        : tab === "particle"
          ? TITLE_PARTICLES.map((o) => ({ o, fx: { ...base, particle: o.id, color1: "#ffd166" } }))
          : TITLE_MOTIONS.map((o) => ({ o, fx: { ...base, motion: o.id, glow: "soft", color1: "#ffd166" } }));

  return (
    <div className="space-y-4">
      <Link href="/me" className="block pt-4 text-sm text-sub">
        ‹ マイページ
      </Link>
      <PageHeader title="称号エフェクト図鑑" sub={`質感${TITLE_STYLES.length} × 光${TITLE_GLOWS.length} × 舞うもの${TITLE_PARTICLES.length} × 動き${TITLE_MOTIONS.length} を自由に組み合わせ`} />

      <Card className="space-y-5 !py-6 text-center">
        <p className="text-[10px] text-sub">レア度ごとの標準</p>
        {RARITIES.map((r) => (
          <div key={r} className="flex items-center justify-center gap-3">
            <span className="w-9 font-num text-xs text-sub">{r}</span>
            <TitleBadge name={SAMPLE_NAMES[RARITIES.indexOf(r)]} rarity={r} fx={RARITY_DEFAULT_FX[r]} />
          </div>
        ))}
      </Card>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "style", label: "質感" },
          { value: "glow", label: "光り方" },
          { value: "particle", label: "舞うもの" },
          { value: "motion", label: "動き" },
          { value: "random", label: "ランダム" },
        ]}
      />

      {tab === "random" ? (
        <div className="space-y-3">
          <button onClick={() => setRolls(Array.from({ length: 10 }, randomFx))} className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-white">
            組み合わせを引き直す
          </button>
          {rolls.map((r, i) => (
            <Card key={i} className="flex flex-col items-center gap-3 !py-6">
              <TitleBadge name={r.name} rarity={r.rarity} fx={r.fx} size="md" />
              <p className="font-num text-[10px] text-sub">
                {r.rarity} / {r.fx.style} / {r.fx.glow} / {r.fx.particle} / {r.fx.motion}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {list.map(({ o, fx }) => (
            <Card key={o.id} className="flex min-w-0 flex-col items-center gap-3 !px-2 !py-6">
              <TitleBadge name="不屈の魂" rarity={tab === "style" ? "N" : "SR"} fx={fx} plate={tab !== "style"} size="md" />
              <p className="text-center text-[11px] leading-tight">
                {o.label}
                <span className="block font-num text-[10px] text-sub">{o.id}</span>
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
