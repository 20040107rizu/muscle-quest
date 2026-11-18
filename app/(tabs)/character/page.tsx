"use client";

import { UiIcon } from "@/components/ui/UiIcon";
import Link from "next/link";
import { useState } from "react";
import { HeroFigure } from "@/components/HeroFigure";
import { EquipmentPanel } from "@/components/EquipmentPanel";
import { StatBars } from "@/components/StatBars";
import { Card, LevelBadge, Loading, SectionTitle, XpBar } from "@/components/ui/primitives";
import { heroImage } from "@/components/heroImages";
import { HERO_TYPE_LABELS, heroStage, heroType, TIERS } from "@/domain/character";
import { PRESET_EXERCISES } from "@/domain/exercises";
import { STAT_LABELS, type MuscleGroup, type StatKey } from "@/domain/types";
import { useMyData } from "@/data/hooks";

export default function CharacterPage() {
  const me = useMyData();
  const [sel, setSel] = useState<StatKey | null>("chest");
  if (!me) return <Loading />;
  const c = me.character;

  const recommend =
    sel === "cardio"
      ? ["ランニング"]
      : sel
        ? PRESET_EXERCISES.filter((e) => (e.distribution[sel as MuscleGroup] ?? 0) >= 0.5).map((e) => e.name)
        : [];

  let condition = { label: "通常", text: "記録するとパンプアップします", color: "text-ink" };
  if (c.daysSinceActive === 0) condition = { label: "パンプアップ中", text: "今日の運動で筋肉が張っています", color: "text-accent" };
  else if (c.daysSinceActive != null && c.daysSinceActive > 3)
    condition = { label: "しぼみ気味", text: `${c.daysSinceActive}日運動していません。見た目が少ししぼんでいます（経験値は減りません）`, color: "text-bad" };

  const nextTier = TIERS.find((t) => t.minLevel > c.level);

  return (
    <div className="space-y-4 pt-4">
      <Link href="/" className="text-sm text-sub">
        ‹ ホーム
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(ellipse_at_50%_25%,#2a2f3a_0%,#14171d_60%)]">
        <div className="absolute left-4 top-4 z-10">
          <LevelBadge level={c.level} />
          <p className="mt-1 text-xl font-black">{c.tier.name}</p>
          <p className={`mt-1 text-xs font-bold ${condition.color}`}>● {condition.label}</p>
          <p className="mt-1 text-[11px] text-sub">
            体型: {HERO_TYPE_LABELS[heroType(c.stats)]}
            {heroImage(heroType(c.stats), heroStage(c.level)).fallback && <span className="block text-[10px]">（画像準備中・バランス型で表示）</span>}
          </p>
        </div>
        <HeroFigure c={c} gear={me.profile.gear} glow={c.daysSinceActive === 0} gearSize={30} className="mx-auto h-[400px] w-full pt-4" />
        <div className="px-4 pb-4">
          <p className="mb-2 text-center text-[11px] text-sub">{condition.text}</p>
          <XpBar into={c.levelInto} needed={c.levelNeeded} />
        </div>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">部位ステータス</p>
          <p className="text-[10px] text-sub">タップで部位を表示</p>
        </div>
        <StatBars c={c} onSelect={setSel} selected={sel} />
        {sel && (
          <div className="mt-3 rounded-xl bg-panel-2 p-3 text-xs">
            <p className="font-bold">{STAT_LABELS[sel]}を育てる種目</p>
            <p className="mt-1 text-sub">{recommend.join(" ・ ")}</p>
            {sel === "cardio" && <p className="mt-1 text-sub">走るほど体脂肪が落ち、腹筋や脚のカットが浮き出ます</p>}
          </div>
        )}
      </Card>

      <section>
        <SectionTitle href="/quest" more="クエストへ">称号・装備</SectionTitle>
        <EquipmentPanel gear={me.profile.gear ?? {}} titleId={me.profile.titleId} ownedItems={me.owned.items} ownedTitles={me.owned.titles} />
      </section>

      <section>
        <SectionTitle>進化ロード</SectionTitle>
        <Card className="!p-0">
          {TIERS.map((t) => {
            const reached = c.level >= t.minLevel;
            const current = c.tier.name === t.name;
            return (
              <div key={t.name} className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${current ? "bg-accent/10" : ""}`}>
                <span className={`grid size-8 place-items-center rounded-full text-xs font-bold ${reached ? "bg-accent text-white" : "bg-panel-2 text-sub"}`}>
                  {reached ? "✓" : <UiIcon name="lock" alt="未到達" />}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${reached ? "" : "text-sub"}`}>{t.name}</p>
                  <p className="text-[11px] text-sub">{t.title}</p>
                </div>
                <span className="font-num text-xs text-sub">Lv.{t.minLevel}〜</span>
              </div>
            );
          })}
        </Card>
        {nextTier && <p className="mt-2 px-1 text-[11px] text-sub">次の進化「{nextTier.name}」まで あと {nextTier.minLevel - c.level} レベル</p>}
      </section>

      <Card className="text-xs leading-relaxed text-sub">
        <p className="mb-1 font-bold text-ink">育成のしくみ</p>
        <p>・筋トレは「重量×回数」から経験値を計算し、種目ごとに鍛えた部位へ振り分けます。</p>
        <p>・同じ種目を1日に何十セットも行うと経験値が逓減します。いろいろな部位をバランスよく。</p>
        <p>・レベルで体の段階（ビギナー〜神話の6段階）が、いちばん鍛えている部位で体型（胸型・ランナー型など8タイプ）が決まります。</p>
        <p>・ランニングは心肺と脚に入ります。走り込むとランナー型の引き締まった体になります。</p>
        <p>・4日以上休むと見た目が少ししぼみますが、経験値やレベルは減りません。</p>
      </Card>
    </div>
  );
}
