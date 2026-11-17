"use client";

import { heroStage, heroType, type CharacterState } from "@/domain/character";
import { findItem, GEAR_SLOTS, type Gear } from "@/domain/items";
import { heroImage, itemIconUrl } from "./heroImages";

/**
 * 主人公の表示（イラスト版）。
 * - レベル → 進化段階、いちばん鍛えている部位 → 体型タイプ で画像を選ぶ
 * - 鍛えた日はパンプ（わずかに大きく・オーラ）、4日以上休むとしぼむ（小さく・くすむ）
 * - 装備はアイコンで横に並べ、オーラ系の装備は背後の光の色に反映
 */
export function HeroFigure({
  c,
  gear,
  className = "",
  glow = false,
  showGear = true,
  gearSize = 26,
}: {
  c: Pick<CharacterState, "level" | "stats" | "pump" | "daysSinceActive">;
  gear?: Gear;
  className?: string;
  glow?: boolean;
  showGear?: boolean;
  gearSize?: number;
}) {
  const stage = heroStage(c.level);
  const img = heroImage(heroType(c.stats), stage);
  const aura = findItem(gear?.aura);
  const auraColor = aura?.color ?? "#ff6b2c";
  const showAura = glow || !!aura;
  const shrunk = c.pump < 1;
  const equipped = GEAR_SLOTS.map((s) => gear?.[s]).filter((id): id is string => !!id && !!findItem(id));

  return (
    <div className={`relative ${className}`}>
      {showAura && (
        <div
          className="mq-aura pointer-events-none absolute inset-x-[8%] inset-y-[4%] rounded-[50%]"
          style={{ background: `radial-gradient(ellipse at 50% 45%, ${auraColor}${aura ? "70" : "50"}, transparent 68%)` }}
          aria-hidden
        />
      )}
      <div className="pointer-events-none absolute bottom-[1%] left-1/2 h-[3%] w-[55%] -translate-x-1/2 rounded-[50%] bg-black/45 blur-[2px]" aria-hidden />
      <div className="mq-breathe-img relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url}
          alt="あなたのキャラクター"
          draggable={false}
          className="h-full w-full select-none object-contain object-bottom transition-[filter,transform] duration-700"
          style={{
            transform: `scale(${c.pump})`,
            transformOrigin: "50% 100%",
            filter: shrunk ? "saturate(0.75) brightness(0.9)" : undefined,
          }}
        />
      </div>
      {showGear && equipped.length > 0 && (
        <div className="absolute bottom-2 left-1 flex flex-col gap-1">
          {equipped.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={itemIconUrl(id)}
              alt={findItem(id)!.name}
              title={findItem(id)!.name}
              width={gearSize}
              height={gearSize}
              className="rounded-md shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              style={{ width: gearSize, height: gearSize }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
