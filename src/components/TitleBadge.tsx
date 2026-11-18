"use client";

import type { CSSProperties } from "react";
import { RARITY_DEFAULT_FX, type TitleFx, type TitleRarity } from "@/domain/titleFx";

/**
 * 称号の表示。レア度のプレート＋文字の質感・光り方・舞うもの・動きを組み合わせる。
 * 見た目は app/globals.css の .tfx-* に定義。
 */

/** 1文字ずつ動かす動き */
const PER_LETTER = new Set(["wave", "bounce", "type", "drop"]);

interface ParticleDef {
  chars?: string[];
  shape?: "dot" | "ring" | "blob" | "petal" | "rect" | "coin";
  anim: "rise" | "fall" | "twinkle" | "orbit" | "flutter";
  colors: string[];
  size: [number, number];
  count: number;
  dur: [number, number];
  blur?: number;
}

const PARTICLES: Record<string, ParticleDef> = {
  sparkle: { chars: ["✦", "✧", "·"], anim: "twinkle", colors: ["#ffffff", "#fff6c8", "var(--c1)"], size: [7, 13], count: 9, dur: [1.2, 2.4] },
  ember: { shape: "dot", anim: "rise", colors: ["#ffb547", "#ff6b2c", "#ff3b1f"], size: [2, 4], count: 12, dur: [1.4, 2.6] },
  snow: { chars: ["❄", "✻", "·"], anim: "fall", colors: ["#e8f7ff", "#bfe8ff"], size: [7, 12], count: 9, dur: [2.4, 4] },
  spark: { chars: ["ϟ", "⚡", "✶"], anim: "twinkle", colors: ["#fff36b", "#ffffff", "#7fd8ff"], size: [8, 13], count: 8, dur: [0.5, 1.1] },
  petal: { shape: "petal", anim: "flutter", colors: ["#ffb7d0", "#ffd3e2", "#ff8fb4"], size: [5, 8], count: 9, dur: [2.6, 4.2] },
  smoke: { shape: "blob", anim: "rise", colors: ["rgba(40,20,60,0.7)", "rgba(20,20,20,0.7)"], size: [10, 18], count: 7, dur: [2, 3.4], blur: 3 },
  star: { chars: ["★", "☆", "✦"], anim: "twinkle", colors: ["#ffd166", "#ffffff", "var(--c1)"], size: [7, 12], count: 9, dur: [1.4, 2.6] },
  bubble: { shape: "ring", anim: "rise", colors: ["rgba(191,232,255,0.9)", "rgba(127,216,255,0.8)"], size: [4, 9], count: 9, dur: [2, 3.4] },
  leaf: { shape: "petal", anim: "flutter", colors: ["#5fd068", "#9be15d", "#3ddc97"], size: [5, 8], count: 8, dur: [2.6, 4] },
  feather: { chars: ["❦", "⸙"], anim: "flutter", colors: ["#fff6e0", "#ffd166"], size: [9, 13], count: 6, dur: [3, 4.6] },
  coin: { shape: "coin", anim: "fall", colors: ["#ffd166", "#e9c25a"], size: [6, 9], count: 8, dur: [1.6, 2.6] },
  rune: { chars: ["ᚱ", "ᛟ", "ᚨ", "ᛉ", "ᛏ", "ᚦ"], anim: "rise", colors: ["var(--c1)", "#b79cff", "#7fd8ff"], size: [8, 12], count: 8, dur: [2.2, 3.6] },
  ash: { shape: "dot", anim: "fall", colors: ["#8b8f99", "#5b5f68", "#c9ccd3"], size: [2, 3], count: 14, dur: [2.4, 4] },
  orbit: { shape: "dot", anim: "orbit", colors: ["#ffffff", "var(--c1)", "var(--c2)"], size: [3, 5], count: 6, dur: [2.4, 3.6], blur: 0.5 },
  heart: { chars: ["♥", "❤"], anim: "rise", colors: ["#ff5d8f", "#ff8fb4", "#ffffff"], size: [7, 11], count: 8, dur: [1.8, 3] },
  confetti: { shape: "rect", anim: "fall", colors: ["#ff6b2c", "#ffd166", "#3ddc97", "#4cc9f0", "#b79cff", "#ff5d8f"], size: [4, 6], count: 14, dur: [1.6, 2.8] },
};

/** 決まった乱数（毎回同じ配置にする） */
function rnd(seed: number) {
  const x = Math.sin(seed * 999.13) * 43758.5453;
  return x - Math.floor(x);
}

function Particles({ id }: { id: string }) {
  const p = PARTICLES[id];
  if (!p) return null;
  return (
    <span className="tfx-p" aria-hidden>
      {Array.from({ length: p.count }, (_, i) => {
        const r = (k: number) => rnd(i * 7.31 + k + id.length * 3.17);
        const size = p.size[0] + (p.size[1] - p.size[0]) * r(1);
        const color = p.colors[i % p.colors.length];
        const dur = p.dur[0] + (p.dur[1] - p.dur[0]) * r(2);
        const style = {
          left: `${p.anim === "orbit" ? 50 : 4 + r(3) * 92}%`,
          top: `${p.anim === "orbit" ? 50 : p.anim === "fall" || p.anim === "flutter" ? -10 + r(4) * 20 : p.anim === "rise" ? 70 + r(4) * 30 : 10 + r(4) * 80}%`,
          animationDuration: `${dur}s`,
          animationDelay: `${-r(5) * dur}s`,
          fontSize: size,
          color,
          filter: p.blur ? `blur(${p.blur}px)` : undefined,
          "--dx": `${(r(6) - 0.5) * 30}px`,
          "--orbit": `${i * (360 / p.count)}deg`,
        } as CSSProperties;
        const shape = p.shape;
        return (
          <span key={i} className={`tfx-pt tfx-a-${p.anim}`} style={style}>
            {p.chars ? (
              p.chars[i % p.chars.length]
            ) : (
              <span
                className={`tfx-shape tfx-shape-${shape}`}
                style={{ width: shape === "rect" ? size * 0.6 : size, height: shape === "petal" ? size * 0.6 : shape === "rect" ? size * 1.2 : size, background: shape === "ring" ? "transparent" : color, borderColor: color }}
              />
            )}
          </span>
        );
      })}
    </span>
  );
}

export function TitleBadge({
  name,
  rarity = "N",
  fx,
  size = "md",
  plate = true,
  className = "",
}: {
  name: string;
  rarity?: TitleRarity;
  fx?: Partial<TitleFx>;
  size?: "sm" | "md" | "lg";
  /** レア度のプレート（背景の帯）を付ける */
  plate?: boolean;
  className?: string;
}) {
  const f = { ...RARITY_DEFAULT_FX[rarity], ...(fx ?? {}) };
  const perLetter = PER_LETTER.has(f.motion);
  const vars: CSSProperties & Record<string, string> = {};
  if (f.color1) vars["--c1"] = f.color1;
  if (f.color2) vars["--c2"] = f.color2;
  const chars = [...name];

  return (
    <span
      className={`tfx tfx-size-${size} ${plate ? `tfx-plate tfx-r-${rarity}` : ""} tfx-g-${f.glow} tfx-m-${f.motion} ${className}`}
      style={vars}
      aria-label={name}
    >
      {f.particle !== "none" && <Particles id={f.particle} />}
      <span className={`tfx-body tfx-gl-${f.glow}`} aria-hidden>
        {perLetter ? (
          chars.map((ch, i) => (
            <span key={i} className={`tfx-text tfx-s-${f.style} tfx-ch`} data-text={ch} style={{ animationDelay: `${i * 0.08}s`, ["--i" as string]: i, ["--n" as string]: chars.length }}>
              {ch === " " ? " " : ch}
            </span>
          ))
        ) : (
          <span className={`tfx-text tfx-s-${f.style}`} data-text={name}>
            {name}
          </span>
        )}
      </span>
      {f.motion === "shine" && <span className="tfx-shine" aria-hidden />}
    </span>
  );
}
