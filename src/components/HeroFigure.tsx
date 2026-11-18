"use client";

import { useId } from "react";
import { heroStage, heroType, type CharacterState } from "@/domain/character";
import { findItem, type Gear, type Item } from "@/domain/items";
import ANCHORS from "./heroAnchors.json";
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
          {it("cape") && <WearCape a={a} item={it("cape")!} uid={uid} />}

          <image href={img.url} x="0" y="0" width={W} height={H} />

          {it("shorts") && <Recolor uid={uid} part="shorts" img={img.url} W={W} H={H} fill={it("shorts")!.look === "camo" ? `url(#camo-${uid})` : it("shorts")!.color} />}
          {it("shorts")?.color2 && <Recolor uid={uid} part="band" img={img.url} W={W} H={H} fill={it("shorts")!.color2!} />}
          {it("shoes") && (
            <g filter={it("shoes")!.glow ? `url(#glow-${uid})` : undefined}>
              <Recolor uid={uid} part="shoes" img={img.url} W={W} H={H} fill={it("shoes")!.color} />
            </g>
          )}

          {it("waist") && <Belt a={a} item={it("waist")!} uid={uid} />}
          {it("neck") && <WearNecklace a={a} item={it("neck")!} uid={uid} />}
          {it("head") && (it("head")!.look === "crown" ? <WearCrown a={a} item={it("head")!} uid={uid} /> : <Head a={a} item={it("head")!} uid={uid} />)}
          {it("wrist") && [a.wristL, a.wristR].map((w, i) => w && <Wristband key={i} a={a} w={w} item={it("wrist")!} uid={uid} />)}
          {it("hand") && a.wristR && <WearHand a={a} w={a.wristR} item={it("hand")!} />}
        </g>
        </g>
      </svg>
    </div>
  );
}

// ---------- 生成した装備の絵を体に重ねる ----------

function WearCape({ a, item, uid }: { a: Anchor; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  // 幅は腰ゴムの幅を基準にする（神話段階の光る輪郭に影響されない）
  const w = (a.waistX1 - a.waistX0) * W * 2.6;
  const top = a.shoulder * H - 0.035 * H;
  const bottom = Math.min(H * 0.9, a.hem * H + 0.24 * H);
  return (
    <image
      href={itemWearUrl(item.id)}
      x={a.cx * W - w / 2}
      y={top}
      width={w}
      height={bottom - top}
      preserveAspectRatio="none"
      filter={item.glow ? `url(#glow-${uid})` : undefined}
    />
  );
}

function WearCrown({ a, item, uid }: { a: Anchor; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  const w = Math.min(a.headW * W * 1.05, (a.waistX1 - a.waistX0) * W * 0.6);
  const h = w * 0.85;
  const bottom = a.headTop * H + 0.04 * H;
  return <image href={itemWearUrl(item.id)} x={a.cx * W - w / 2} y={bottom - h} width={w} height={h} preserveAspectRatio="xMidYMax meet" filter={item.glow ? `url(#glow-${uid})` : undefined} />;
}

/** ネックレスの絵は輪っか全体なので、首の後ろに回る上側を隠してU字に見せる */
function WearNecklace({ a, item, uid }: { a: Anchor; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  const w = (a.waistX1 - a.waistX0) * W * 0.78;
  const h = w * 1.05;
  const hide = 0.3;
  const top = a.shoulder * H - h * hide + 0.005 * H;
  const x = a.cx * W - w / 2;
  return (
    <g>
      <clipPath id={`neck-${uid}`}>
        <rect x={x - 2} y={top + h * hide} width={w + 4} height={h} />
      </clipPath>
      <image href={itemWearUrl(item.id)} x={x} y={top} width={w} height={h} preserveAspectRatio="xMidYMin meet" clipPath={`url(#neck-${uid})`} />
    </g>
  );
}

function WearHand({ a, w, item }: { a: Anchor; w: Wrist; item: Item }) {
  const W = a.w;
  const H = a.h;
  const fx = w.fistX * W;
  const fy = w.fistY * H;
  if (item.look === "kettlebell") {
    const s = 0.2 * W;
    return <image href={itemWearUrl(item.id)} x={fx - s / 2} y={fy - 0.012 * H} width={s} height={s} preserveAspectRatio="xMidYMin meet" />;
  }
  const s = 0.3 * W;
  return <image href={itemWearUrl(item.id)} x={fx - s / 2} y={fy - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
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



function Head({ a, item, uid }: { a: Anchor; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  const cx = a.cx * W;
  const hw = (a.headW * W) / 2;
  if (item.look === "crown") {
    const base = a.headTop * H + 0.03 * H;
    const cw = hw * 0.95;
    const ch = 0.058 * H;
    return (
      <g filter={`url(#glow-${uid})`}>
        <path
          d={`M${cx - cw},${base} L${cx - cw},${base - ch * 0.55} L${cx - cw * 0.55},${base - ch * 0.25} L${cx - cw * 0.3},${base - ch} L${cx},${base - ch * 0.35} L${cx + cw * 0.3},${base - ch} L${cx + cw * 0.55},${base - ch * 0.25} L${cx + cw},${base - ch * 0.55} L${cx + cw},${base} Z`}
          fill={item.color}
          stroke="#7a4f12"
          strokeWidth="1.2"
        />
        <circle cx={cx} cy={base - ch * 0.2} r={0.008 * H} fill={item.color2} />
        <circle cx={cx - cw * 0.3} cy={base - ch} r={0.005 * H} fill="#fff" />
        <circle cx={cx + cw * 0.3} cy={base - ch} r={0.005 * H} fill="#fff" />
      </g>
    );
  }
  // ハチマキ
  const y = a.forehead * H;
  const bh = 0.024 * H;
  const x0 = cx - hw * 1.02;
  const x1 = cx + hw * 1.02;
  return (
    <g>
      <path d={`M${x1 - 2},${y + bh * 0.3} l${0.07 * W},${0.022 * H} l-${0.02 * W},${0.012 * H} Z M${x1 - 2},${y + bh * 0.6} l${0.05 * W},${0.04 * H} l-${0.022 * W},${0.004 * H} Z`} fill={item.color} stroke="#000" strokeOpacity="0.4" strokeWidth="1" />
      <path d={`M${x0},${y + 2} Q${cx},${y - bh * 0.35} ${x1},${y + 2} L${x1},${y + bh} Q${cx},${y + bh * 0.65} ${x0},${y + bh} Z`} fill={item.color} stroke="#000" strokeOpacity="0.45" strokeWidth="1" />
      <path d={`M${x0},${y + bh * 0.55} Q${cx},${y + bh * 0.15} ${x1},${y + bh * 0.55}`} fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.5" />
      {item.color2 && <circle cx={cx} cy={y + bh * 0.42} r={bh * 0.32} fill={item.color2} />}
    </g>
  );
}


function Belt({ a, item, uid }: { a: Anchor; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  const x0 = a.waistX0 * W - 0.012 * W;
  const x1 = a.waistX1 * W + 0.012 * W;
  const t = a.waistTop * H;
  const b = a.waistBottom * H;
  const pad = (b - t) * 0.35;
  const cx = (x0 + x1) / 2;
  const by = t - pad;
  const bh = b - t + pad * 2;
  return (
    <g filter={item.glow ? `url(#glow-${uid})` : undefined}>
      <rect x={x0} y={by} width={x1 - x0} height={bh} rx="2" fill={item.color} stroke="#000" strokeOpacity="0.5" strokeWidth="1" />
      <path d={`M${x0 + 2},${by + 2} H${x1 - 2} M${x0 + 2},${by + bh - 2} H${x1 - 2}`} stroke={item.color2} strokeOpacity="0.6" strokeWidth="0.8" strokeDasharray="2 2" />
      {item.look === "champion" ? (
        <g>
          <ellipse cx={cx} cy={by + bh / 2} rx={(x1 - x0) * 0.24} ry={bh * 1.25} fill={item.color2} stroke="#7a4f12" strokeWidth="1.5" />
          <ellipse cx={cx} cy={by + bh / 2} rx={(x1 - x0) * 0.17} ry={bh * 0.85} fill="none" stroke="#7a4f12" strokeWidth="1" />
          <circle cx={cx} cy={by + bh / 2} r={bh * 0.4} fill="#ff5d6c" />
          {[-1, 1].map((s) => (
            <ellipse key={s} cx={cx + s * (x1 - x0) * 0.33} cy={by + bh / 2} rx={(x1 - x0) * 0.07} ry={bh * 0.7} fill={item.color2} stroke="#7a4f12" strokeWidth="1" />
          ))}
        </g>
      ) : (
        <rect x={cx - bh * 0.7} y={by - bh * 0.1} width={bh * 1.4} height={bh * 1.2} rx="2" fill="none" stroke={item.color2} strokeWidth={bh * 0.22} />
      )}
    </g>
  );
}

function Wristband({ a, w, item, uid }: { a: Anchor; w: Wrist; item: Item; uid: string }) {
  const W = a.w;
  const H = a.h;
  const bw = Math.max(w.w * W * 1.25, 0.06 * W);
  const bh = 0.028 * H;
  const x = w.x * W - bw / 2;
  const y = w.y * H - bh / 2;
  return (
    <g filter={item.glow ? `url(#glow-${uid})` : undefined}>
      <rect x={x} y={y} width={bw} height={bh} rx={bh * 0.3} fill={item.color} stroke="#000" strokeOpacity="0.5" strokeWidth="1" />
      <rect x={x + 1} y={y + bh * 0.15} width={bw - 2} height={bh * 0.2} rx="1" fill="#fff" opacity="0.25" />
      {item.color2 && <rect x={x} y={y + bh * 0.55} width={bw} height={bh * 0.18} fill={item.color2} opacity="0.9" />}
    </g>
  );
}

