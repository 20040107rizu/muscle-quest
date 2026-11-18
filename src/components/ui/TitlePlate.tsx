import { assetUrl } from "../assets";
import type { TitleRarity } from "@/domain/quests";

/** 元画像（604×104）での両端の飾りの幅 */
const CAP: Record<TitleRarity, number> = { N: 74, R: 86, SR: 87, SSR: 96, UR: 118 };
const TEXT: Record<TitleRarity, string> = {
  N: "text-[#e4e7ee]",
  R: "text-[#bfe6ff]",
  SR: "text-[#e6d2ff]",
  SSR: "text-[#ffe08a]",
  UR: "bg-gradient-to-r from-[#ffe9a8] via-[#ffffff] to-[#b9f1ff] bg-clip-text text-transparent",
};
const HEIGHT = { sm: 22, md: 30, lg: 44 } as const;
const FONT = { sm: "text-[10px]", md: "text-xs", lg: "text-base" } as const;

/** レア度マーク（public/ui/rar_*） */
export function RarityMark({ rarity, size = 20, className = "" }: { rarity: TitleRarity; size?: number; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={assetUrl(`ui/rar_${rarity}.webp`)} alt={rarity} draggable={false} className={`inline-block shrink-0 object-contain ${className}`} style={{ height: size, width: size * 0.87 }} />;
}

/**
 * 称号の表示。画像生成AIが描いたレア度別のプレート（public/ui/plate_*）に名前を載せる。
 * 両端の飾りはそのまま、真ん中だけ名前の長さに合わせて伸ばす。
 */
export function TitlePlate({ name, rarity, size = "md", className = "" }: { name: string; rarity: TitleRarity; size?: "sm" | "md" | "lg"; className?: string }) {
  const h = HEIGHT[size];
  const cap = (CAP[rarity] * h) / 104;
  return (
    <span
      className={`inline-flex max-w-full items-center justify-center ${className}`}
      style={{
        height: h,
        borderStyle: "solid",
        borderWidth: `0 ${cap}px`,
        borderImage: `url(${assetUrl(`ui/plate_${rarity}.webp`)}) 0 ${CAP[rarity]} fill / 0 ${cap}px stretch`,
      }}
      aria-label={`称号 ${name}`}
    >
      <span className={`truncate px-1 font-black tracking-wider [text-shadow:0_1px_2px_rgba(0,0,0,0.9)] ${FONT[size]} ${TEXT[rarity]} ${rarity === "UR" ? "[text-shadow:none] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : ""}`}>
        {name}
      </span>
    </span>
  );
}
