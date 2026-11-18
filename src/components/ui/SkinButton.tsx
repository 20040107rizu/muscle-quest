"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { assetUrl } from "../assets";

/**
 * 画像生成AIが描いたボタン（public/ui/btn_*）。両端の丸い部分はそのまま、真ん中だけ伸ばす。
 * 押している間は「押した状態」、押せないときは「押せない状態」の絵に切り替わる。
 */
export type SkinVariant = "primary" | "run" | "gold" | "gray" | "danger";

const HAS_PRESSED: Record<SkinVariant, boolean> = { primary: true, run: true, gold: true, gray: true, danger: false };
const HAS_DISABLED: Record<SkinVariant, boolean> = { primary: true, run: true, gold: true, gray: false, danger: false };
const TEXT: Record<SkinVariant, string> = {
  primary: "text-white",
  run: "text-[#062033]",
  gold: "text-[#3a2400]",
  gray: "text-white",
  danger: "text-white",
};

function Skin({ name, className = "" }: { name: string; className?: string }) {
  const u = (p: string) => assetUrl(`ui/${name}_${p}.webp`);
  return (
    <span className={`pointer-events-none absolute inset-0 flex ${className}`} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={u("l")} alt="" className="relative z-10 h-full w-auto shrink-0" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={u("m")} alt="" className="-mx-[2px] h-full min-w-0 flex-1 object-fill" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={u("r")} alt="" className="relative z-10 h-full w-auto shrink-0" draggable={false} />
    </span>
  );
}

export function SkinFace({ variant = "primary", disabled = false, children, className = "" }: { variant?: SkinVariant; disabled?: boolean; children: ReactNode; className?: string }) {
  const base = `btn_${variant}`;
  const showDisabled = disabled && HAS_DISABLED[variant];
  return (
    <span className={`group/skin relative isolate inline-flex select-none items-center justify-center px-6 font-black ${TEXT[variant]} ${className}`}>
      <Skin name={showDisabled ? `${base}_disabled` : base} className={HAS_PRESSED[variant] && !disabled ? "group-active/skin:opacity-0" : ""} />
      {HAS_PRESSED[variant] && !disabled && <Skin name={`${base}_pressed`} className="opacity-0 group-active/skin:opacity-100" />}
      <span className={`relative z-10 transition-transform group-active/skin:translate-y-px ${variant === "gold" || variant === "run" ? "" : "[text-shadow:0_1px_2px_rgba(0,0,0,0.65)]"} ${disabled && !HAS_DISABLED[variant] ? "opacity-50" : ""}`}>
        {children}
      </span>
    </span>
  );
}

/** 画像のボタン。className で高さ（例: h-14）と幅を指定する */
export function SkinButton({ variant = "primary", className = "", children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: SkinVariant }) {
  return (
    <button {...rest} disabled={disabled} className={`group/skin block ${disabled ? "cursor-not-allowed" : ""} ${className}`}>
      <SkinFace variant={variant} disabled={disabled} className="h-full w-full">
        {children}
      </SkinFace>
    </button>
  );
}
