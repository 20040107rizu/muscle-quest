/**
 * 称号の見た目（エフェクト）の種類。
 * 文字の質感（style）× 光り方（glow）× 舞うもの（particle）× 動き（motion）を自由に組み合わせる。
 * 実際の見た目は app/globals.css の .tfx-* と src/components/TitleBadge.tsx。
 */
export interface FxOption {
  id: string;
  label: string;
}

export const TITLE_STYLES: FxOption[] = [
  { id: "plain", label: "単色" },
  { id: "gradient", label: "2色グラデーション" },
  { id: "metal", label: "銀の金属" },
  { id: "chrome", label: "鏡面クローム" },
  { id: "bronze", label: "銅" },
  { id: "gold", label: "黄金" },
  { id: "platinum", label: "白金" },
  { id: "ruby", label: "紅玉（ルビー）" },
  { id: "sapphire", label: "蒼玉（サファイア）" },
  { id: "emerald", label: "翠玉（エメラルド）" },
  { id: "amethyst", label: "紫水晶" },
  { id: "obsidian", label: "黒曜石" },
  { id: "rainbow", label: "流れる虹" },
  { id: "flame", label: "揺らめく炎" },
  { id: "lava", label: "溶岩" },
  { id: "ice", label: "氷" },
  { id: "thunder", label: "雷光" },
  { id: "plasma", label: "プラズマ" },
  { id: "neon", label: "ネオン管" },
  { id: "hologram", label: "ホログラム" },
  { id: "galaxy", label: "銀河" },
  { id: "aurora", label: "オーロラ" },
  { id: "sunset", label: "夕焼け" },
  { id: "ocean", label: "深海" },
  { id: "sakura", label: "桜" },
  { id: "toxic", label: "毒" },
  { id: "blood", label: "血の深紅" },
  { id: "shadow", label: "闇" },
  { id: "holy", label: "聖光" },
  { id: "ghost", label: "霊体" },
  { id: "glitch", label: "グリッチ（電子ノイズ）" },
  { id: "inferno", label: "業火（黒と紅蓮）" },
];

export const TITLE_GLOWS: FxOption[] = [
  { id: "none", label: "光らない" },
  { id: "soft", label: "ふんわり" },
  { id: "strong", label: "強く光る" },
  { id: "pulse", label: "脈打つ" },
  { id: "flicker", label: "またたく" },
  { id: "breathe", label: "色が移ろう" },
  { id: "outline", label: "縁取り" },
  { id: "double", label: "二重の光" },
  { id: "bloom", label: "あふれる光" },
  { id: "halo", label: "後光" },
  { id: "rings", label: "広がる波紋" },
  { id: "beam", label: "光の柱" },
];

export const TITLE_PARTICLES: FxOption[] = [
  { id: "none", label: "なし" },
  { id: "sparkle", label: "きらめき" },
  { id: "ember", label: "火の粉" },
  { id: "snow", label: "雪の結晶" },
  { id: "spark", label: "稲妻の火花" },
  { id: "petal", label: "花びら" },
  { id: "smoke", label: "黒い煙" },
  { id: "star", label: "星" },
  { id: "bubble", label: "泡" },
  { id: "leaf", label: "木の葉" },
  { id: "feather", label: "羽根" },
  { id: "coin", label: "金貨" },
  { id: "rune", label: "古代のルーン文字" },
  { id: "ash", label: "灰" },
  { id: "orbit", label: "周回する光球" },
  { id: "heart", label: "ハート" },
  { id: "confetti", label: "紙吹雪" },
];

export const TITLE_MOTIONS: FxOption[] = [
  { id: "none", label: "動かない" },
  { id: "shine", label: "光が走る" },
  { id: "float", label: "ふわっと浮く" },
  { id: "shake", label: "震える" },
  { id: "wave", label: "文字が波打つ" },
  { id: "bounce", label: "文字が跳ねる" },
  { id: "type", label: "1文字ずつ現れる" },
  { id: "jitter", label: "ノイズで揺れる" },
  { id: "zoom", label: "鼓動する" },
  { id: "tilt", label: "ゆらゆら傾く" },
  { id: "hue", label: "色が回る" },
  { id: "drop", label: "文字が降ってくる" },
];

export type TitleRarity = "N" | "R" | "SR" | "SSR" | "UR";

export interface TitleFx {
  style: string;
  glow: string;
  particle: string;
  motion: string;
  color1?: string;
  color2?: string;
}

/** レア度ごとのおすすめ（文章AIの指示文と、未設定の称号のデフォルトに使う） */
export const RARITY_DEFAULT_FX: Record<TitleRarity, TitleFx> = {
  N: { style: "metal", glow: "none", particle: "none", motion: "none" },
  R: { style: "ice", glow: "soft", particle: "none", motion: "shine", color1: "#4cc9f0" },
  SR: { style: "platinum", glow: "strong", particle: "sparkle", motion: "shine", color1: "#b79cff", color2: "#7a5cff" },
  SSR: { style: "gold", glow: "pulse", particle: "star", motion: "float", color1: "#ffb547" },
  UR: { style: "rainbow", glow: "bloom", particle: "orbit", motion: "shine", color1: "#ffffff", color2: "#b79cff" },
};
