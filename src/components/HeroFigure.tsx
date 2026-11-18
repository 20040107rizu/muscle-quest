"use client";

import { useId } from "react";
import { heroStage, heroType, type CharacterState } from "@/domain/character";
import { findItem, type Gear, type Item } from "@/domain/items";
import ANCHORS from "./heroAnchors.json";
import WEAR_ASPECT from "./wearAspect.json";
import { WEAR_FIT } from "./wearFit";
import { fxUrl, heroImage, heroMaskUrl, itemWearUrl } from "./heroImages";

/**
 * 主人公の表示（イラスト＋着せ替え）。
 * - レベル → 進化段階、いちばん鍛えている部位 → 体型タイプ で体の画像を選ぶ
 * - 装備は体の画像の上に重ねて描く。位置は画像ごとに測った値（heroAnchors.json）を使う
 *   - 背中（マント）・オーラ: 体の後ろ
 *   - ショーツ・腰ゴム・シューズ: その部分だけ色を塗り替える（元の陰影は残す）
 *   - 頭・首・腰・手首・手: 体の前に描く
 * - 鍛えた日はパンプ（少し大きく）、4日以上休むとしぼむ（小さく・くすむ）
 */

interface Wrist {
  x: number;
  y: number;
  w: number;
  fistX: number;
  fistY: number;
}
interface Anchor {
  w: number;
  h: number;
  cx: number;
  headTop: number;
  forehead: number;
  headW: number;
  neck: number;
  neckW: number;
  shoulder: number;
  shoulderW: number;
  waistTop: number;
  waistBottom: number;
  waistX0: number;
  waistX1: number;
  hem: number;
  feetTop: number;
  wristL: Wrist | null;
  wristR: Wrist | null;
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
  /** 互換用（装備は体に描くので使わない） */
  showGear?: boolean;
  gearSize?: number;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const img = heroImage(heroType(c.stats), heroStage(c.level));
  const a = ANCHOR_MAP[img.name];
  const it = (slot: keyof Gear) => findItem(gear?.[slot]);
  const aura = it("aura");
  const worn = (["cape", "hand", "waist", "neck", "wrist", "head"] as const).map((s) => it(s)).filter((x): x is Item => !!x && !!WEAR_FIT[x.id]);
  const wearBehind = worn.filter((x) => WEAR_FIT[x.id].behind);
  const wearFront = worn.filter((x) => !WEAR_FIT[x.id].behind);
  const shrunk = c.pump < 1;

  if (!a) {
    // 位置情報がない画像（追加直後など）は体だけ表示
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img.url} alt="あなたのキャラクター" className={`object-contain object-bottom ${className}`} />;
  }

  const W = a.w;
  const H = a.h;
  const X = (v: number) => v * W;
  const Y = (v: number) => v * H;
  const cx = X(a.cx);
  const showAura = glow || !!aura;
  const auraColor = aura?.color ?? "#ff6b2c";

  return (
    <div className={`relative ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax meet" className="h-full w-full overflow-visible" role="img" aria-label="あなたのキャラクター">
        <defs>
          <radialGradient id={`aura-${uid}`} cx="0.5" cy="0.45" r="0.5">
            <stop offset="0" stopColor={auraColor} stopOpacity={aura ? 0.55 : 0.4} />
            <stop offset="0.6" stopColor={auraColor} stopOpacity={aura ? 0.25 : 0.12} />
            <stop offset="1" stopColor={auraColor} stopOpacity="0" />
          </radialGradient>
          {/* 元画像の明暗だけを取り出す（塗り替え時にしわ・輪郭を残すため） */}
          <filter id={`shade-${uid}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncR type="linear" slope="5.6" intercept="0.12" />
              <feFuncG type="linear" slope="5.6" intercept="0.12" />
              <feFuncB type="linear" slope="5.6" intercept="0.12" />
            </feComponentTransfer>
          </filter>
          <filter id={`glow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {(["shorts", "band", "shoes"] as const).map((part) => (
            <mask key={part} id={`${part}-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <image href={heroMaskUrl(img.name, part)} x="0" y="0" width={W} height={H} />
            </mask>
          ))}
          <pattern id={`camo-${uid}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#4b5a2e" />
            <path d="M2 6 q8 -6 14 2 t10 8 q-6 8 -16 4 t-8 -14Z" fill="#2f3a1c" />
            <path d="M22 22 q8 -4 14 4 t-2 12 q-8 2 -12 -4 t0 -12Z" fill="#7a7046" />
            <path d="M26 2 q6 2 6 8 t-8 4 q-4 -4 2 -12Z" fill="#2f3a1c" />
          </pattern>
        </defs>

        {/* オーラ（いちばん後ろ） */}
        {/* 鍛えた日のパンプは柔らかい光、オーラ装備は専用の絵を体の後ろに */}
        {showAura && <ellipse className="mq-aura" cx={cx} cy={Y(0.48)} rx={W * 0.75} ry={H * 0.55} fill={`url(#aura-${uid})`} />}
        {aura && (
          <image
            className="mq-aura"
            href={fxUrl(aura.id)}
            x={cx - W * 0.68}
            y={-H * 0.05}
            width={W * 1.36}
            height={H * 1.07}
            preserveAspectRatio="none"
            opacity={0.95}
          />
        )}
        {/* 足元の影 */}
        <ellipse cx={cx} cy={H - Y(0.008)} rx={W * 0.38} ry={Y(0.012)} fill="#000" opacity={0.45} />

        <g className="mq-breathe-svg" style={{ transformOrigin: `${cx}px ${H}px` }}>
        <g
          style={{
            transform: `scale(${c.pump})`,
            transformOrigin: `${cx}px ${H}px`,
            filter: shrunk ? "saturate(0.75) brightness(0.9)" : undefined,
          }}
        >
          {/* 体の後ろ: マント・手に握る物（拳が持ち手に重なる） */}
          {wearBehind.map((item) => <Wear key={item.id} a={a} item={item} uid={uid} />)}

          <image href={img.url} x="0" y="0" width={W} height={H} />

          {it("shorts") && <Recolor uid={uid} part="shorts" img={img.url} W={W} H={H} fill={it("shorts")!.look === "camo" ? `url(#camo-${uid})` : it("shorts")!.color} />}
          {it("shorts")?.color2 && <Recolor uid={uid} part="band" img={img.url} W={W} H={H} fill={it("shorts")!.color2!} />}
          {it("shoes") && (
            <g filter={it("shoes")!.glow ? `url(#glow-${uid})` : undefined}>
              <Recolor uid={uid} part="shoes" img={img.url} W={W} H={H} fill={it("shoes")!.color} />
            </g>
          )}

          {wearBehind.filter((x) => WEAR_FIT[x.id].frontTop).map((item) => <Wear key={`${item.id}-front`} a={a} item={item} uid={uid} front />)}
          {wearFront.map((item) => <Wear key={item.id} a={a} item={item} uid={uid} />)}
        </g>
        </g>
      </svg>
    </div>
  );
}

// ---------- 生成した装備の絵を体に重ねる（位置・大きさは wearFit.ts） ----------

function Wear({ a, item, uid, front = false }: { a: Anchor; item: Item; uid: string; front?: boolean }) {
  const fit = WEAR_FIT[item.id];
  const aspect = (WEAR_ASPECT as Record<string, number>)[item.id] ?? 1;
  const W = a.w;
  const H = a.h;
  const waistW = (a.waistX1 - a.waistX0) * W;
  // 神話段階の光る輪郭などで測定値が膨らむことがあるので、腰ゴムの幅を基準に妥当な範囲へ収める
  const clamp = (v: number, lo: number, hi: number) => Math.min(waistW * hi, Math.max(waistW * lo, v));
  const headRef = clamp(a.headW * W, 0.68, 0.86);
  const neckRef = clamp(a.neckW * W, 0.4, 0.5);
  const wristRef = (w: Wrist) => clamp(w.w * W, 0.17, 0.3);
  const spots: { x: number; y: number; ref: number; flip: boolean }[] = [];
  switch (fit.base) {
    case "head":
      spots.push({ x: a.cx * W, y: a.forehead * H, ref: headRef, flip: false });
      break;
    case "crown":
      spots.push({ x: a.cx * W, y: a.forehead * H, ref: headRef, flip: false });
      break;
    case "neck":
      spots.push({ x: a.cx * W, y: a.shoulder * H, ref: neckRef, flip: false });
      break;
    case "shoulder":
      spots.push({ x: a.cx * W, y: a.shoulder * H - 0.02 * H, ref: waistW, flip: false });
      break;
    case "waist":
      spots.push({ x: ((a.waistX0 + a.waistX1) / 2) * W, y: ((a.waistTop + a.waistBottom) / 2) * H, ref: waistW, flip: false });
      break;
    case "wrist":
      if (a.wristR) spots.push({ x: a.wristR.x * W, y: a.wristR.y * H, ref: wristRef(a.wristR), flip: false });
      if (a.wristL && fit.pair) spots.push({ x: a.wristL.x * W, y: a.wristL.y * H, ref: wristRef(a.wristL), flip: true });
      break;
    case "fist":
      if (a.wristR) spots.push({ x: a.wristR.fistX * W, y: a.wristR.fistY * H, ref: wristRef(a.wristR), flip: false });
      break;
  }
  return (
    <g filter={item.glow ? `url(#glow-${uid})` : undefined}>
      {spots.map((sp, i) => {
        const w = sp.ref * fit.scale;
        const h = w * aspect;
        const y0 = sp.y + (fit.dy ?? 0) * sp.ref - fit.refY * h;
        const x0 = sp.x - fit.refX * w;
        const clipId = `wear-${uid}-${item.id}-${i}${front ? "f" : ""}`;
        // 前面に重ねる襟の部分だけ（マント）
        const clipY = front ? y0 : y0 + (fit.clipTop ?? 0) * h;
        const clipH = front ? (fit.frontTop ?? 0) * h : h;
        const useClip = front || fit.clipTop != null;
        const rot = (fit.rotate ?? 0) * (sp.flip ? -1 : 1);
        const tf = [`rotate(${rot} ${sp.x} ${sp.y})`, sp.flip ? `translate(${2 * sp.x} 0) scale(-1 1)` : ""].join(" ");
        return (
          <g key={i} transform={tf}>
            {useClip && (
              <clipPath id={clipId}>
                <rect x={x0 - 4} y={clipY} width={w + 8} height={clipH} />
              </clipPath>
            )}
            <image
              href={itemWearUrl(item.id)}
              x={x0}
              y={y0}
              width={w}
              height={h}
              preserveAspectRatio="none"
              clipPath={useClip ? `url(#${clipId})` : undefined}
            />
          </g>
        );
      })}
    </g>
  );
}





/** その部位を新しい色で塗り、元画像の陰影を掛け合わせる */
function Recolor({ uid, part, img, W, H, fill }: { uid: string; part: "shorts" | "band" | "shoes"; img: string; W: number; H: number; fill: string }) {
  return (
    <g mask={`url(#${part}-${uid})`} style={{ isolation: "isolate" }}>
      <rect x="0" y="0" width={W} height={H} fill={fill} />
      <image href={img} x="0" y="0" width={W} height={H} filter={`url(#shade-${uid})`} style={{ mixBlendMode: "multiply" }} />
    </g>
  );
}







