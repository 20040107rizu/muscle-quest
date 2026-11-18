import type { Title } from "@/domain/quests";
import { assetUrl } from "../assets";
import { TitlePlate } from "./TitlePlate";

/**
 * 称号の表示。画像生成AIが作った「プレート → エフェクト → 文字」の3枚を重ねる（各 1200×200 の比率）。
 * - xs: 小さい場所（友達の一覧など）。文字が潰れるので、レア度の帯に文字を載せる簡易表示
 * - 画像の無い称号（週替わりボスの限定称号）も簡易表示
 * - locked: 未入手。黒いシルエットだけ見せる
 */
const WIDTH = { sm: 200, md: 260, lg: 340, full: "100%" } as const;

export function TitleView({ title, size = "md", locked = false, className = "" }: { title: Title; size?: "xs" | "sm" | "md" | "lg" | "full"; locked?: boolean; className?: string }) {
  const d = title.def;
  if (size === "xs" || !d) {
    const plate = <TitlePlate name={locked ? "？".repeat([...title.name].length) : title.name} rarity={title.rarity} size={size === "lg" || size === "full" ? "lg" : size === "xs" ? "sm" : "md"} />;
    return <span className={`inline-flex max-w-full ${locked ? "opacity-60 brightness-0 contrast-50" : ""} ${className}`}>{plate}</span>;
  }
  const u = (p: string) => assetUrl(`titles/${p}.webp`);
  return (
    <span
      className={`relative inline-block max-w-full shrink-0 ${locked ? "opacity-50 brightness-0" : ""} ${className}`}
      style={{ width: WIDTH[size], aspectRatio: "6 / 1" }}
      role="img"
      aria-label={locked ? "未入手の称号" : `称号 ${title.name}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={u(`plates/${d.plate}`)} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      {!locked && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u(`effects/${d.effect}`)} alt="" draggable={false} className={`mq-title-fx mq-title-fx-${d.rarity} absolute inset-0 h-full w-full`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u(`wordmarks/${d.id}`)} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
        </>
      )}
    </span>
  );
}
