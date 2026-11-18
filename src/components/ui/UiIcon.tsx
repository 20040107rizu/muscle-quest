import type { CSSProperties } from "react";
import { assetUrl } from "../assets";

/** 画像生成AIが描いた小物アイコン（public/ui/ic_*） */
export type UiIconName =
  | "streak" | "xp" | "workout" | "run" | "pace" | "distance"
  | "crown" | "sword" | "chest" | "scroll" | "fist" | "flame"
  | "cheer" | "settings" | "sound" | "lock" | "privacy" | "heart";

export function UiIcon({ name, className = "", style, alt = "" }: { name: UiIconName; className?: string; style?: CSSProperties; alt?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={assetUrl(`ui/ic_${name}.webp`)} alt={alt} draggable={false} className={`inline-block h-[1.25em] w-auto object-contain align-[-0.25em] ${className}`} style={style} />
  );
}
