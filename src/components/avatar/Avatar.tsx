"use client";

import { useId } from "react";
import type { MuscleGroup } from "@/domain/types";

/**
 * 筋肉量パラメータから描く、リアル寄りの男性シルエット。
 * 右半身を描いて左右反転で左半身を作る。各部位の発達度(0..1)で輪郭・陰影が変わる。
 */
export interface AvatarProps {
  dev: Record<MuscleGroup, number>;
  fat: number; // 0..1
  cardio: number; // 0..1
  pump?: number;
  className?: string;
  /** 部位をハイライト（育成画面用） */
  highlight?: MuscleGroup | "cardio" | null;
  glow?: boolean;
}

type P = [number, number];
const CX = 120;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const f = (n: number) => n.toFixed(1);

/** Catmull-Rom → ベジェ（開いた曲線） */
function spline(pts: P[], move = true): string {
  let d = move ? `M${f(pts[0][0])},${f(pts[0][1])}` : `L${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** 閉じた滑らかな曲線 */
function closed(pts: P[]): string {
  const n = pts.length;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + "Z";
}

interface Prof {
  t: number;
  out: number;
  inn: number;
}

/** A→B の軸に沿って幅プロファイルを持つ四肢の輪郭。out は外側(+x方向) */
function limb(A: P, B: P, prof: Prof[], capEnd: number, capStart: number) {
  const dx = B[0] - A[0];
  const dy = B[1] - A[1];
  const len = Math.hypot(dx, dy);
  const dir: P = [dx / len, dy / len];
  let n: P = [dir[1], -dir[0]];
  if (n[0] < 0) n = mul(n, -1);
  const at = (t: number): P => add(A, mul([dx, dy], t));
  const outer = prof.map((p) => add(at(p.t), mul(n, p.out)));
  const inner = [...prof].reverse().map((p) => add(at(p.t), mul(n, -p.inn)));
  const pts: P[] = [...outer, add(B, mul(dir, capEnd)), ...inner, add(A, mul(dir, -capStart))];
  return { d: closed(pts), at, n, dir };
}

function lerpColor(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

export function Avatar({ dev, fat, cardio, pump = 1, className, highlight = null, glow = false }: AvatarProps) {
  const uid = useId().replace(/:/g, "");
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  const pm = (v: number) => r3(clamp01(v * r3(pump)));
  fat = r3(fat);
  cardio = r3(cardio);
  const ch = pm(dev.chest);
  const bk = pm(dev.back);
  const sh = pm(dev.shoulders);
  const ar = pm(dev.arms);
  const lg = pm(dev.legs);
  const co = pm(dev.core);
  const fv = clamp01(fat) * 0.85; // 体脂肪感
  const muscle = Math.max(ch, bk, sh, ar, lg, co);
  // 筋肉のカット（定義）: 体脂肪が少なく、筋肉があるほど見える
  const cut = clamp01((1 - fv) * 1.35 - 0.15) * (0.25 + 0.75 * muscle);

  // 日焼け: ランニング(屋外)で少し濃く
  const tan = clamp01(cardio * 0.8);
  const skinHi = lerpColor("#f0c29c", "#d9a074", tan);
  const skinMid = lerpColor("#dca27a", "#c08556", tan);
  const skinLo = lerpColor("#a8694a", "#8a5234", tan);
  const shade = "#4a2414";

  // ---- 寸法（右半身, CX からの相対x） ----
  const S = 36 + 17 * sh + 5 * bk + 3 * ch;
  const nw = 9 + 3.5 * bk + 1.5 * sh;
  const L = 30 + 15 * bk + 3 * ch + 4 * fv;
  const W = 23 + 9 * fv - 2 * co + 1.5 * bk;
  const belly = 6 * fv;
  const H = 28 + 4 * fv + 4 * lg;
  const shoulderTop = 96 - 2 * sh;

  const torsoOutline: P[] = [
    [nw, 74 - 3 * bk],
    [nw + 3 + 3 * bk, 84 - 2 * bk],
    [S - 14, shoulderTop - 2],
    [S - 6, shoulderTop + 8],
    [S - 9, 128],
    [L, 148],
    [W + belly * 0.6 + 1, 176],
    [W + belly * 0.3, 196],
    [H, 224],
    [H - 4, 234],
    [12, 242],
  ];
  const torso = spline(torsoOutline) + ` L-3,244 L-3,${74 - 3 * bk} Z`;

  // 胸
  const pecY = 131 + 7 * ch;
  const pec = `M0.5,104 C${f(S * 0.42)},${f(98 - 2 * ch)} ${f(S - 12)},101 ${f(S - 9)},114 C${f(S - 11)},${f(124 + 4 * ch)} ${f(S * 0.62)},${f(pecY)} ${f(S * 0.36)},${f(pecY + 1)} C${f(S * 0.2)},${f(pecY + 1)} 5,${f(pecY - 1)} 0.5,${f(pecY - 4)} Z`;
  const pecLine = `M${f(S - 10)},${f(118 + 2 * ch)} C${f(S - 12)},${f(126 + 4 * ch)} ${f(S * 0.62)},${f(pecY)} ${f(S * 0.36)},${f(pecY + 1)} C${f(S * 0.2)},${f(pecY + 1)} 5,${f(pecY - 1)} 0.5,${f(pecY - 4)}`;

  // 腹筋
  const absW = 11 + 3 * co;
  const absRows: [number, number][] = [
    [pecY + 6, pecY + 22],
    [pecY + 24, pecY + 40],
    [pecY + 42, Math.min(pecY + 58, 196)],
  ];

  // 腕
  const ang = ((8 + 8 * ar + 6 * bk + 3 * fv + 2 * sh) * Math.PI) / 180;
  const J: P = [S - 13, 110];
  const dirU: P = [Math.sin(ang), Math.cos(ang)];
  const E = add(J, mul(dirU, 72));
  const ang2 = ang - (7 * Math.PI) / 180;
  const dirF: P = [Math.sin(ang2), Math.cos(ang2)];
  const Fw = add(E, mul(dirF, 62));
  const uw = 8.5 + 9.5 * ar + 2 * fv;
  const upper = limb(
    J,
    E,
    [
      { t: 0.02, out: uw + 1, inn: uw - 1 },
      { t: 0.38, out: uw * 1.08, inn: uw * 1.02 },
      { t: 0.68, out: uw * 0.92, inn: uw * 0.95 },
      { t: 0.95, out: 6.5 + 2 * ar, inn: 6 + 2 * ar },
    ],
    5,
    4,
  );
  const fw = 6.5 + 5.5 * ar;
  const fore = limb(
    E,
    Fw,
    [
      { t: 0.02, out: 6.5 + 2 * ar, inn: 6 + 2 * ar },
      { t: 0.25, out: fw * 1.05, inn: fw },
      { t: 0.62, out: fw * 0.75, inn: fw * 0.7 },
      { t: 0.98, out: 4.5 + ar, inn: 4 + ar },
    ],
    3,
    3,
  );
  const handC = add(Fw, mul(dirF, 9));
  const deltC: P = [S - 10, 114 + 2 * sh];
  const deltRx = 8 + 9 * sh + 1.5 * fv + 1.5 * ar;
  const deltRy = 13 + 8 * sh;
  const bicepC = add(add(J, mul(dirU, 32)), mul(upper.n, -uw * 0.25));

  // 脚
  const HJ: P = [H * 0.5, 228];
  const K: P = [H * 0.5 + 1, 334];
  const A: P = [H * 0.47 - 1, 416];
  const T = 14.5 + 10 * lg + 5 * fv;
  const thigh = limb(
    HJ,
    K,
    [
      { t: 0, out: T, inn: T * 0.85 },
      { t: 0.35, out: T * 1.05, inn: T * 0.9 },
      { t: 0.72, out: T * 0.8, inn: T * 0.86 },
      { t: 1, out: 9.5 + 1.5 * lg, inn: 9 + 1.5 * lg },
    ],
    2,
    6,
  );
  const C = 8.5 + 5.5 * lg + 1.5 * cardio;
  const calf = limb(
    K,
    A,
    [
      { t: 0.02, out: 9.5 + 1.5 * lg, inn: 9 + 1.5 * lg },
      { t: 0.3, out: C * 1.05, inn: C * 0.98 },
      { t: 0.7, out: C * 0.6, inn: C * 0.55 },
      { t: 1, out: 4.5, inn: 4.5 },
    ],
    2,
    2,
  );
  const thighOuterAt = (t: number) => thigh.at(t)[0] + T * 1.05;
  const shortsHem = 272;
  const shorts = `M-3,198 L${f(W + belly * 0.3 + 1.5)},198 C${f(H + 2)},210 ${f(thighOuterAt(0.35) + 3)},${f(240)} ${f(thighOuterAt(0.42) + 3)},${shortsHem} L${f(Math.max(3, HJ[0] - T * 0.6))},${shortsHem - 2} C${f(5)},${f(266)} 2,262 -3,262 Z`;

  const hlStyle = (g: string) =>
    highlight === g ? { filter: `drop-shadow(0 0 6px rgba(255,140,60,0.9))` } : undefined;

  const layerLegs = (
    <>
      {/* 脚 */}
      <g style={hlStyle("legs")}>
        <path d={thigh.d} fill={`url(#limb-${uid})`} />
        <path d={calf.d} fill={`url(#limb-${uid})`} />
        {/* 大腿四頭筋のカット */}
        <path
          d={spline([thigh.at(0.25), add(thigh.at(0.6), mul(thigh.n, T * 0.15)), add(thigh.at(0.92), mul(thigh.n, -2))])}
          stroke={shade}
          strokeWidth={1.2}
          fill="none"
          opacity={cut * lg * 0.55}
        />
        <path
          d={spline([add(thigh.at(0.62), mul(thigh.n, -T * 0.82)), add(thigh.at(0.82), mul(thigh.n, -T * 0.35)), add(thigh.at(0.97), mul(thigh.n, -3))])}
          stroke={shade}
          strokeWidth={1.4}
          fill="none"
          opacity={cut * lg * 0.6}
        />
        <path
          d={spline([add(calf.at(0.15), mul(calf.n, -C * 0.2)), add(calf.at(0.4), mul(calf.n, C * 0.1)), add(calf.at(0.6), mul(calf.n, C * 0.05))])}
          stroke={shade}
          strokeWidth={1.1}
          fill="none"
          opacity={cut * Math.max(lg, cardio) * 0.5}
        />
        <ellipse cx={K[0]} cy={K[1] + 2} rx={6} ry={4} fill={skinHi} opacity={0.25} />
        {/* シューズ */}
        <path
          d={`M${f(A[0] - 7)},${f(A[1] - 2)} C${f(A[0] - 9)},${f(A[1] + 8)} ${f(A[0] - 6)},${f(A[1] + 13)} ${f(A[0] + 2)},${f(A[1] + 13)} C${f(A[0] + 12)},${f(A[1] + 13)} ${f(A[0] + 14)},${f(A[1] + 9)} ${f(A[0] + 9)},${f(A[1] - 2)} Z`}
          fill="#1c1f26"
        />
        <path d={`M${f(A[0] - 7)},${f(A[1] + 9)} L${f(A[0] + 12)},${f(A[1] + 9)}`} stroke="#ff6b2c" strokeWidth={1.2} opacity={0.8} />
      </g>
    </>
  );
  const layerTorso = (
    <>
      {/* 胴体 */}
      <path d={torso} fill={`url(#torso-${uid})`} />

      {/* 胸 */}
      <g style={hlStyle("chest")}>
        <path d={pec} fill={`url(#pec-${uid})`} opacity={0.35 + 0.45 * ch} />
        <path d={pecLine} stroke={shade} strokeWidth={1.2 + 2.2 * ch} fill="none" strokeLinecap="round" opacity={(0.12 + 0.5 * ch) * (0.5 + 0.5 * (1 - fv))} />
        <circle cx={S * 0.5} cy={pecY - 6 - 2 * ch} r={1.6} fill="#8a4a35" opacity={0.6} />
      </g>

      {/* 前鋸筋・腹斜筋 */}
      <g opacity={cut * (0.3 + 0.7 * Math.max(bk, co)) * 0.55} stroke={shade} strokeWidth={1.1} fill="none" strokeLinecap="round">
        <path d={`M${f(L - 9)},${f(pecY + 2)} l5,-3`} />
        <path d={`M${f(L - 9)},${f(pecY + 9)} l5,-3`} />
        <path d={`M${f(L - 10)},${f(pecY + 16)} l5,-3`} />
        <path d={spline([[absW + 5, pecY + 26], [W + 2, 178], [W - 1, 194]])} />
      </g>

      {/* 腹筋 */}
      <g style={hlStyle("core")}>
        {absRows.map(([y0, y1], i) => (
          <ellipse key={i} cx={absW * 0.55} cy={(y0 + y1) / 2} rx={absW * 0.5} ry={(y1 - y0) * 0.42} fill={skinHi} opacity={cut * (0.1 + 0.35 * co)} />
        ))}
        <g stroke={shade} fill="none" strokeLinecap="round" opacity={cut * (0.12 + 0.6 * co)}>
          <path d={`M0,${f(pecY + 2)} L0,${f(205)}`} strokeWidth={1.6} />
          {absRows.slice(0, 2).map(([, y1], i) => (
            <path key={i} d={`M1.5,${f(y1 + 1.5)} Q${f(absW * 0.55)},${f(y1 - 0.5 + i)} ${f(absW + 0.5)},${f(y1 + 2.5)}`} strokeWidth={1.3} />
          ))}
          <path d={spline([[absW + 1.5, pecY + 7], [absW + 2.5, pecY + 30], [absW + 1, 196]])} strokeWidth={1.2} />
        </g>
        <path d={spline([[W - 4, 198], [W * 0.55, 220], [8, 238]])} stroke={shade} strokeWidth={1.3} fill="none" opacity={cut * co * 0.6} />
        <ellipse cx={0} cy={193} rx={1.4} ry={2} fill={shade} opacity={0.45} />
      </g>
    </>
  );
  const layerShorts = (
    <>
      {/* ショーツ */}
      <path d={shorts} fill={`url(#shorts-${uid})`} />
      <path d={`M-1,198 L${f(W + belly * 0.3 + 1.5)},198 L${f(W + belly * 0.3 + 2.5)},204 L-1,204 Z`} fill="#ff6b2c" opacity={0.85} />
    </>
  );
  const layerArms = (
    <>
      {/* 腕 */}
      <g style={hlStyle("arms")}>
        <path d={upper.d} fill={`url(#limb-${uid})`} />
        <path d={fore.d} fill={`url(#limb-${uid})`} />
        <ellipse
          cx={bicepC[0]}
          cy={bicepC[1]}
          rx={uw * 0.42}
          ry={17 + 4 * ar}
          transform={`rotate(${f((-ang * 180) / Math.PI)} ${f(bicepC[0])} ${f(bicepC[1])})`}
          fill="#fff"
          opacity={0.06 + 0.16 * ar}
        />
        <path
          d={spline([add(upper.at(0.3), mul(upper.n, uw * 0.35)), add(upper.at(0.6), mul(upper.n, uw * 0.3)), add(upper.at(0.85), mul(upper.n, uw * 0.05))])}
          stroke={shade}
          strokeWidth={1.1}
          fill="none"
          opacity={cut * ar * 0.55}
        />
        <path
          d={spline([add(fore.at(0.1), mul(fore.n, -fw * 0.2)), add(fore.at(0.4), mul(fore.n, fw * 0.1)), add(fore.at(0.7), mul(fore.n, fw * 0.1))])}
          stroke={shade}
          strokeWidth={1}
          fill="none"
          opacity={cut * ar * 0.45}
        />
        <ellipse cx={handC[0]} cy={handC[1]} rx={6.5} ry={10} transform={`rotate(${f((-ang2 * 180) / Math.PI)} ${f(handC[0])} ${f(handC[1])})`} fill={skinMid} />
      </g>

      {/* 三角筋 */}
      <g style={hlStyle("shoulders")}>
        <ellipse
          cx={deltC[0]}
          cy={deltC[1]}
          rx={deltRx}
          ry={deltRy}
          transform={`rotate(${f((-ang * 90) / Math.PI)} ${f(deltC[0])} ${f(deltC[1])})`}
          fill={`url(#delt-${uid})`}
        />
        <path
          d={spline([[S - 16 - 3 * sh, 104], [S - 15 - 2 * sh, 118 + 3 * sh], [S - 10, 130 + 5 * sh]])}
          stroke={shade}
          strokeWidth={1.2}
          fill="none"
          opacity={cut * sh * 0.6}
        />
      </g>

      {/* 僧帽筋 */}
      <path
        d={spline([[nw - 1, 78 - 3 * bk], [nw + 6 + 4 * bk, 86 - bk], [S - 16, shoulderTop + 1]])}
        stroke={shade}
        strokeWidth={1}
        fill="none"
        opacity={cut * bk * 0.45}
        style={hlStyle("back")}
      />
    </>
  );
  /** 右半身を描き、反転して左半身にする。重なり順を保つためレイヤー単位でミラーする */
  const mirror = (node: React.ReactNode) => (
    <>
      <g transform={`translate(${CX},0)`}>{node}</g>
      <g transform={`translate(${CX},0) scale(-1,1)`}>{node}</g>
    </>
  );

  return (
    <svg viewBox="-10 0 260 440" className={className} role="img" aria-label="あなたのキャラクター">
      <defs>
        <linearGradient id={`torso-${uid}`} gradientUnits="userSpaceOnUse" x1={-L - 14} x2={L + 14} y1="0" y2="0">
          <stop offset="0" stopColor={skinLo} />
          <stop offset="0.22" stopColor={skinMid} />
          <stop offset="0.5" stopColor={skinHi} />
          <stop offset="0.78" stopColor={skinMid} />
          <stop offset="1" stopColor={skinLo} />
        </linearGradient>
        <linearGradient id={`limb-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={skinLo} />
          <stop offset="0.38" stopColor={skinHi} />
          <stop offset="0.7" stopColor={skinMid} />
          <stop offset="1" stopColor={skinLo} />
        </linearGradient>
        <radialGradient id={`delt-${uid}`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor={skinHi} />
          <stop offset="0.7" stopColor={skinMid} />
          <stop offset="1" stopColor={lerpColor(skinMid, skinLo, 0.3 + 0.7 * sh)} />
        </radialGradient>
        <radialGradient id={`pec-${uid}`} cx="0.45" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor={shade} stopOpacity="0.35" />
        </radialGradient>
        <linearGradient id={`shorts-${uid}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#2a2f3a" />
          <stop offset="1" stopColor="#151820" />
        </linearGradient>
        <radialGradient id={`aura-${uid}`} cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#ff6b2c" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff6b2c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {glow && <ellipse cx={CX} cy={210} rx={130} ry={200} fill={`url(#aura-${uid})`} className="mq-aura" />}
      <ellipse cx={CX} cy={432} rx={58 + 12 * lg} ry={6} fill="#000" opacity={0.35} />

      <g className="mq-breathe">
        {/* 首 */}
        <path
          d={`M${CX - nw + 1},56 L${CX + nw - 1},56 L${CX + nw + 1},88 L${CX - nw - 1},88 Z`}
          fill={skinMid}
        />
        <path d={`M${CX - 4},66 L${CX - nw + 2},86 M${CX + 4},66 L${CX + nw - 2},86`} stroke={shade} strokeWidth={1} opacity={0.25 + 0.3 * bk} />

        {mirror(layerLegs)}
        {mirror(layerTorso)}
        {mirror(layerShorts)}
        {mirror(layerArms)}

        {/* 頭 */}
        <g>
          <ellipse cx={CX - 16.5} cy={50} rx={3} ry={5.5} fill={skinMid} />
          <ellipse cx={CX + 16.5} cy={50} rx={3} ry={5.5} fill={skinMid} />
          <path
            d={`M${CX - 16},40 C${CX - 17},58 ${CX - 11},71 ${CX},73 C${CX + 11},71 ${CX + 17},58 ${CX + 16},40 C${CX + 15},26 ${CX + 8},20 ${CX},20 C${CX - 8},20 ${CX - 15},26 ${CX - 16},40 Z`}
            fill={`url(#limb-${uid})`}
          />
          <path
            d={`M${CX - 17},42 C${CX - 19},24 ${CX - 6},16 ${CX + 2},17 C${CX + 14},17 ${CX + 20},27 ${CX + 17},42 C${CX + 16},34 ${CX + 12},29 ${CX + 3},29 C${CX - 3},31 ${CX - 12},31 ${CX - 17},42 Z`}
            fill="#1a1412"
          />
          <path d={`M${CX - 11},43 l7,-1 M${CX + 11},43 l-7,-1`} stroke="#1a1412" strokeWidth={1.8} strokeLinecap="round" />
          <ellipse cx={CX - 7} cy={48} rx={2} ry={1.3} fill="#1a1412" />
          <ellipse cx={CX + 7} cy={48} rx={2} ry={1.3} fill="#1a1412" />
          <path d={`M${CX},50 L${CX - 1.5},58 L${CX + 1},59`} stroke={shade} strokeWidth={1} fill="none" opacity={0.5} />
          <path d={`M${CX - 4.5},64 Q${CX},65.5 ${CX + 4.5},64`} stroke="#6b3424" strokeWidth={1.3} fill="none" strokeLinecap="round" />
          <path d={`M${CX - 13},60 C${CX - 9},70 ${CX + 9},70 ${CX + 13},60`} stroke={shade} strokeWidth={1} fill="none" opacity={0.18 + 0.2 * (1 - fv)} />
        </g>
      </g>

      <title>{`胸${Math.round(ch * 100)} 背${Math.round(bk * 100)} 肩${Math.round(sh * 100)} 腕${Math.round(ar * 100)} 脚${Math.round(lg * 100)} 体幹${Math.round(co * 100)}`}</title>
    </svg>
  );
}
