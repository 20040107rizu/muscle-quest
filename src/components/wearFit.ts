/**
 * 生成した装備の絵（public/items/{id}_wear.webp）を体のどこに・どの大きさで重ねるか。
 *
 * - base:  体のどの位置に合わせるか（heroAnchors.json の値）
 * - scale: 絵の幅 = 基準の長さ（頭の幅・首の幅・腰ゴムの幅・手首の幅）× scale
 * - refX/refY: 絵の中のどの点（幅・高さに対する割合）を、その位置に合わせるか
 * - clipTop: 絵の上からこの割合を隠す（輪っかの奥側＝頭・首・腰・手首の後ろに回る部分）
 * - behind: 体の後ろに描く（マント、手に握る物 → 拳が持ち手に重なって「握って」見える）
 * - rotate: 回転（度）
 * - dy: 位置を下にずらす量（基準の長さに対する割合）
 */
export type WearBase = "head" | "crown" | "neck" | "shoulder" | "waist" | "wrist" | "fist";

export interface WearFit {
  base: WearBase;
  scale: number;
  refX: number;
  refY: number;
  clipTop?: number;
  behind?: boolean;
  rotate?: number;
  dy?: number;
  /** 左右両方に着ける（左は反転） */
  pair?: boolean;
  /** behind のとき、絵の上からこの割合までを体の前にも描く（マントの襟と留め具） */
  frontTop?: number;
}

const headband: WearFit = { base: "head", scale: 1.32, refX: 0.38, refY: 0.56, clipTop: 0.46, dy: -0.02 };
const necklace: WearFit = { base: "neck", scale: 1.75, refX: 0.5, refY: 0.3, clipTop: 0.24 };
const cuff: WearFit = { base: "wrist", scale: 1.45, refX: 0.5, refY: 0.68, clipTop: 0.36, pair: true };

export const WEAR_FIT: Record<string, WearFit> = {
  headband_white: headband,
  headband_red: headband,
  headband_blue: { ...headband, refX: 0.36 },
  headband_black: headband,
  crown_gold: { base: "crown", scale: 1.0, refX: 0.5, refY: 0.92, dy: 0.12 },
  necklace_fang: { ...necklace, refY: 0.27, clipTop: 0.2 },
  necklace_silver: necklace,
  necklace_gold: necklace,
  // マントは体の後ろ。襟は首の後ろから肩の上にのぞく
  cape_red: { base: "shoulder", scale: 3.0, refX: 0.5, refY: 0.06, behind: true },
  cape_black: { base: "shoulder", scale: 3.0, refX: 0.5, refY: 0.06, behind: true },
  cape_gold: { base: "shoulder", scale: 3.0, refX: 0.5, refY: 0.05, behind: true },
  wrist_red: cuff,
  wrist_black: cuff,
  wrist_gold: { base: "wrist", scale: 1.55, refX: 0.5, refY: 0.5, clipTop: 0.26, pair: true },
  wrist_iron: { base: "wrist", scale: 2.1, refX: 0.5, refY: 0.55, rotate: -18, dy: -0.9, pair: true },
  belt_leather: { base: "waist", scale: 1.12, refX: 0.5, refY: 0.6, clipTop: 0.3 },
  belt_champion: { base: "waist", scale: 1.18, refX: 0.5, refY: 0.56, clipTop: 0.22 },
  hand_dumbbell: { base: "fist", scale: 5.4, refX: 0.53, refY: 0.48, behind: true, rotate: 28 },
  hand_kettlebell: { base: "fist", scale: 3.1, refX: 0.5, refY: 0.07, behind: true },
};
