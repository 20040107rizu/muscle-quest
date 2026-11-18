"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";

/**
 * 画面全体に重ねる演出レイヤー（紙吹雪・火花・光の粒）と画面揺れ。
 * Canvas に描くので軽い。動きを減らす設定の端末では控えめにする。
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: "confetti" | "spark";
  rot: number;
  vr: number;
}

interface FxApi {
  /** (x, y) から火花を飛ばす（画面座標） */
  burst: (x: number, y: number, opts?: { count?: number; colors?: string[]; power?: number }) => void;
  /** 画面上から紙吹雪 */
  confetti: (amount?: number) => void;
  /** 画面を揺らす */
  shake: (strength?: number) => void;
}

const FxCtx = createContext<FxApi>({ burst: () => {}, confetti: () => {}, shake: () => {} });
export const useFx = () => useContext(FxCtx);

const CONFETTI_COLORS = ["#ff6b2c", "#ffb547", "#ffd166", "#3ddc97", "#4cc9f0", "#b79cff", "#ff5d6c", "#ffffff"];

function reducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function FxProvider({ children }: { children: React.ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<Particle[]>([]);
  const raf = useRef<number | null>(null);

  const loop = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const g = c.getContext("2d");
    if (!g) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== innerWidth * dpr) {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    parts.current = parts.current.filter((p) => p.life < p.max);
    for (const p of parts.current) {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.kind === "confetti") {
        p.vy = Math.min(p.vy + 0.12, 3.2);
        p.vx *= 0.99;
      } else {
        p.vy += 0.18;
        p.vx *= 0.96;
      }
      const a = 1 - p.life / p.max;
      g.globalAlpha = Math.max(0, a);
      g.fillStyle = p.color;
      if (p.kind === "confetti") {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      } else {
        g.beginPath();
        g.arc(p.x, p.y, p.size * a + 0.5, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
    raf.current = parts.current.length ? requestAnimationFrame(loop) : null;
  }, []);

  const kick = useCallback(() => {
    if (raf.current == null) raf.current = requestAnimationFrame(loop);
  }, [loop]);

  const burst = useCallback<FxApi["burst"]>(
    (x, y, opts = {}) => {
      const n = Math.round((opts.count ?? 24) * (reducedMotion() ? 0.3 : 1));
      const colors = opts.colors ?? ["#ffd166", "#ffb547", "#ff6b2c", "#ffffff"];
      const power = opts.power ?? 1;
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = (2 + Math.random() * 6) * power;
        parts.current.push({
          x,
          y,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 2,
          life: 0,
          max: 30 + Math.random() * 30,
          size: 2 + Math.random() * 3.5,
          color: colors[i % colors.length],
          kind: "spark",
          rot: 0,
          vr: 0,
        });
      }
      kick();
    },
    [kick],
  );

  const confetti = useCallback<FxApi["confetti"]>(
    (amount = 120) => {
      const n = Math.round(amount * (reducedMotion() ? 0.25 : 1));
      for (let i = 0; i < n; i++) {
        parts.current.push({
          x: Math.random() * innerWidth,
          y: -20 - Math.random() * innerHeight * 0.4,
          vx: (Math.random() - 0.5) * 3,
          vy: 1 + Math.random() * 3,
          life: 0,
          max: 160 + Math.random() * 80,
          size: 7 + Math.random() * 6,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          kind: "confetti",
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 0.3,
        });
      }
      kick();
    },
    [kick],
  );

  const shake = useCallback<FxApi["shake"]>((strength = 1) => {
    if (reducedMotion()) return;
    const el = document.querySelector("main");
    const s = 6 * strength;
    el?.animate(
      [
        { transform: "translate(0,0)" },
        { transform: `translate(${-s}px, ${s / 2}px)` },
        { transform: `translate(${s}px, ${-s / 2}px)` },
        { transform: `translate(${-s / 2}px, ${s / 3}px)` },
        { transform: `translate(${s / 3}px, 0)` },
        { transform: "translate(0,0)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  }, []);

  useEffect(
    () => () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return (
    <FxCtx.Provider value={{ burst, confetti, shake }}>
      {children}
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 z-[70] h-full w-full" aria-hidden />
    </FxCtx.Provider>
  );
}
