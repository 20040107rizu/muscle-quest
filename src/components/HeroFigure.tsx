"use client";

import { heroStage, heroType, type CharacterState } from "@/domain/character";
import { BODY_INDEPENDENT_SLOTS, findItem, LAYER_ORDER, type Gear, type Item } from "@/domain/items";
import ANCHORS from "./heroAnchors.json";
import { fxUrl, gearLayer, hasGearArt, heroImage } from "./heroImages";

/**
 * 主人公の表示（イラスト＋装備）。
 * - レベル → 進化段階、いちばん鍛えている部位 → 体型タイプ で体の画像を選ぶ
 * - 装備は、画像生成AIがその体に直接描いた絵（差分で切り出したレイヤー）をそのまま重ねる。
 *   体に隠れる部分はあらかじめ描かれていないので、全部体の前に重ねればよい
 * - 体型によって形が変わる装備の絵がまだその体型にない場合は、バランス型の体で表示する
 *   （頭・顔・首の装備はバランス型の絵を頭や首の位置に合わせて使う）
 * - 鍛えた日はパンプ（少し大きく）、4日以上休むとしぼむ（小さく・くすむ）
 */
interface Anchor {
  w: number;
  h: number;
  cx: number;
  forehead: number;
  shoulder: number;
}
const ANCHOR_MAP = ANCHORS as unknown as Record<string, Anchor>;

export function HeroFigure({
  c,
  gear,
  className = "",
  glow = false,
}: {
  c: Pick<CharacterState, "level" | "stats" | "pump" | "daysSinceActive">;
  gear?: Gear;
  className?: string;
  glow?: boolean;
  /** 互換用（使わない） */
  showGear?: boolean;
  gearSize?: number;
}) {
  const stage = heroStage(c.level);
  let img = heroImage(heroType(c.stats), stage);
  const items = Object.values(gear ?? {})
    .map((id) => findItem(id))
    .filter((x): x is Item => !!x && hasGearArt(x.id) && x.slot !== "aura")
    .sort((p, q) => LAYER_ORDER[p.slot] - LAYER_ORDER[q.slot]);
  // 体型で形が変わる装備の絵がこの体型にまだ無ければ、バランス型の体で表示
  const missing = items.some((x) => !BODY_INDEPENDENT_SLOTS.includes(x.slot) && !gearLayer(x.id, img.name));
  if (missing) img = heroImage("balance", stage);
  const a = ANCHOR_MAP[img.name];
  const aura = findItem(gear?.aura);
  const shrunk = c.pump < 1;

  // 縦横はアンカー情報（体の画像のピクセルサイズ）から。無い場合は一般的な比率
  const W = a?.w ?? 180;
  const H = a?.h ?? 520;
  const cx = (a?.cx ?? 0.5) * W;
  const showAura = glow || !!aura;
  const auraColor = aura ? { aura_wind: "#4cc9f0", aura_flame: "#ff6b2c", aura_purple: "#b79cff", aura_gold: "#ffd166" }[aura.id] ?? "#ff6b2c" : "#ff6b2c";

  const layers = items
    .map((it) => {
      const own = gearLayer(it.id, img.name);
      if (own) return { id: it.id, url: own.url, x: own.rect[0], y: own.rect[1], w: own.rect[2], h: own.rect[3] };
      // 頭・顔・首: バランス型の同じ段階の絵を、頭（首）の位置に合わせて移す
      const baseName = `balance_${stage}`;
      const base = gearLayer(it.id, baseName);
      const ba = ANCHOR_MAP[baseName];
      if (!base || !ba || !a) return null;
      const key = it.slot === "neck" ? "shoulder" : "forehead";
      const dx = a.cx * a.w - ba.cx * ba.w;
      const dy = a[key] * a.h - ba[key] * ba.h;
      return { id: it.id, url: base.url, x: base.rect[0] + dx, y: base.rect[1] + dy, w: base.rect[2], h: base.rect[3] };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="h-full w-full overflow-visible" role="img" aria-label="あなたのキャラクター">
        <defs>
          <radialGradient id={`aura-${img.name}-${auraColor}`} cx="0.5" cy="0.45" r="0.5">
            <stop offset="0" stopColor={auraColor} stopOpacity={aura ? 0.5 : 0.4} />
            <stop offset="0.6" stopColor={auraColor} stopOpacity={aura ? 0.22 : 0.12} />
            <stop offset="1" stopColor={auraColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        {showAura && <ellipse className="mq-aura" cx={cx} cy={H * 0.48} rx={W * 0.75} ry={H * 0.55} fill={`url(#aura-${img.name}-${auraColor})`} />}
        {aura && <image className="mq-aura" href={fxUrl(aura.id)} x={cx - W * 0.68} y={-H * 0.05} width={W * 1.36} height={H * 1.07} preserveAspectRatio="none" opacity={0.95} />}
        <ellipse cx={cx} cy={H - H * 0.008} rx={W * 0.38} ry={H * 0.012} fill="#000" opacity={0.45} />

        <g className="mq-breathe-svg" style={{ transformOrigin: `${cx}px ${H}px` }}>
          <g style={{ transform: `scale(${c.pump})`, transformOrigin: `${cx}px ${H}px`, filter: shrunk ? "saturate(0.75) brightness(0.9)" : undefined }}>
            <image href={img.url} x="0" y="0" width={W} height={H} />
            {layers.map((l) => (
              <image key={l.id} href={l.url} x={l.x} y={l.y} width={l.w} height={l.h} preserveAspectRatio="none" />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
