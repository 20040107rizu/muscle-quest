/**
 * 記録のご褒美（ランダム性と達成感の演出用）。
 * - 会心: 記録ごとに一定確率で経験値 +50%
 * - 自己ベスト: 推定1RM（筋トレ）や最長距離（ラン）の更新で固定ボーナス
 * ボーナスは経験値台帳に "bonus" として別記録し、レベルには入るがランキングには入れない。
 */
export const CRIT_RATE = 0.15;
export const CRIT_MULT = 0.5;
export const PR_BONUS = 25;

function hash01(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/**
 * 会心判定。記録IDから決まるので、同じ記録を再送信しても結果は変わらない。
 * （オンライン化後はサーバー側の秘密値を混ぜて、IDの作り方で狙えないようにする）
 */
export function isCritical(recordId: string, salt = "mq"): boolean {
  return hash01(`${salt}:${recordId}`) < CRIT_RATE;
}

export function critBonus(gained: number): number {
  return Math.round(gained * CRIT_MULT);
}
