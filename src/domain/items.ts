/**
 * 装備アイテム。絵は画像生成AIが主人公の体に直接描いたもの（public/gear/{id}/{体の画像名}.webp）。
 * 入手方法（source）はすべて「実際に鍛えた結果」で、ここから所持品が計算される。
 */
export const GEAR_SLOTS = ["head", "face", "neck", "shoulder", "cape", "chest", "wrist", "hand", "waist", "shorts", "shoes", "legs", "aura"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type Gear = Partial<Record<GearSlot, string>>;

export const SLOT_LABELS: Record<GearSlot, string> = {
  head: "頭",
  face: "顔",
  neck: "首",
  shoulder: "肩",
  cape: "背中",
  chest: "胸",
  wrist: "手首",
  hand: "手",
  waist: "腰",
  shorts: "ショーツ",
  shoes: "靴",
  legs: "脚",
  aura: "オーラ",
};

/** 体型によって形が変わらない部位（バランス型の絵を位置だけ合わせて使える） */
export const BODY_INDEPENDENT_SLOTS: GearSlot[] = ["head", "face", "neck"];

export type ItemSource =
  | { kind: "dungeon"; dungeonId: string }
  | { kind: "floor"; dungeonId: string; floor: number }
  | { kind: "level"; level: number }
  | { kind: "streak"; days: number }
  | { kind: "activeDays"; days: number }
  | { kind: "totalSets"; sets: number }
  | { kind: "totalRunKm"; km: number }
  | { kind: "allDungeons" };

export type Rarity = "N" | "R" | "SR" | "SSR";

export interface Item {
  id: string;
  name: string;
  slot: GearSlot;
  description: string;
  rarity: Rarity;
  source: ItemSource;
}

const f = (dungeonId: string, floor: number): ItemSource => ({ kind: "floor", dungeonId, floor });
const dg = (dungeonId: string): ItemSource => ({ kind: "dungeon", dungeonId });
const lv = (level: number): ItemSource => ({ kind: "level", level });
const sk = (days: number): ItemSource => ({ kind: "streak", days });
const ad = (days: number): ItemSource => ({ kind: "activeDays", days });
const ts = (sets: number): ItemSource => ({ kind: "totalSets", sets });
const km = (n: number): ItemSource => ({ kind: "totalRunKm", km: n });

type Row = [id: string, name: string, slot: GearSlot, rarity: Rarity, source: ItemSource, description: string];

const ROWS: Row[] = [
  // ---- 頭 ----
  ["H01", "冒険者のハチマキ", "head", "R", dg("cave"), "始まりの洞窟を踏破した証。赤い炎の模様"],
  ["H02", "オーガの赤ハチマキ", "head", "R", f("leg_castle", 0), "門番オーガが巻いていた。桜の模様"],
  ["H03", "稲妻のハチマキ", "head", "SR", f("wind_corridor", 1), "疾風の狼の毛で編まれている"],
  ["H04", "不屈の黒ハチマキ", "head", "SR", sk(14), "14日間、一日も休まなかった者に"],
  ["H05", "黄金の王冠", "head", "SSR", lv(50), "神話の肉体に至った者だけがかぶれる"],
  ["H06", "ランナーキャップ", "head", "N", km(10), "累計10km走った証"],
  ["H07", "ストリートキャップ", "head", "N", lv(6), "ジム帰りの定番スタイル"],
  ["H08", "月桂冠", "head", "SR", dg("chest_temple"), "胸板の神から授かった勝者の冠"],
  ["H09", "魔王の角", "head", "SR", f("final_castle", 2), "筋肉覇王の角を模した額当て"],
  ["H10", "侍のハチマキ", "head", "R", sk(21), "21日連続。武士の覚悟"],
  ["H11", "戦士の兜", "head", "R", f("final_castle", 0), "四天王の兜"],
  ["H12", "鷲の羽飾り", "head", "SR", f("back_mountain", 2), "鷲の王の羽"],
  // ---- 顔 ----
  ["F01", "黒いサングラス", "face", "N", lv(4), "強者の余裕"],
  ["F02", "金のサングラス", "face", "SR", lv(32), "まぶしいのは筋肉かサングラスか"],
  ["F03", "戦化粧", "face", "R", f("cave", 2), "洞窟オークを倒した戦士の化粧"],
  ["F04", "光るゴーグル", "face", "R", km(42), "フルマラソン分（42km）走った証"],
  // ---- 首 ----
  ["N01", "ゴブリンの牙", "neck", "N", f("cave", 1), "ゴブリンを倒して手に入れた牙"],
  ["N02", "魔女のペンダント", "neck", "R", f("tower", 1), "誘惑に打ち勝った者の証"],
  ["N03", "金のチェーン", "neck", "SR", lv(15), "重いほど強い"],
  ["N04", "ジムタオル", "neck", "N", ad(5), "5日運動した。汗は裏切らない"],
  ["N05", "骨のネックレス", "neck", "N", ts(50), "合計50セットの証"],
  ["N06", "門番の鍵", "neck", "R", lv(12), "城門を開く鍵"],
  ["N07", "赤いバンダナ", "neck", "N", lv(2), "最初の一歩"],
  ["N08", "風神のスカーフ", "neck", "SR", dg("wind_corridor"), "風の回廊を踏破した者になびく"],
  // ---- 肩 ----
  ["S01", "鋼の肩当て", "shoulder", "R", f("chest_temple", 0), "鉄の番兵の装甲"],
  ["S02", "青銅の肩当て", "shoulder", "R", lv(10), "レベル10の証"],
  ["S03", "トロールの毛皮", "shoulder", "R", f("back_mountain", 1), "山岳トロールの毛皮"],
  ["S04", "竜鱗の肩当て", "shoulder", "SR", dg("tower"), "不屈の竜の鱗"],
  ["S05", "将軍の大袖", "shoulder", "SR", lv(28), "将の風格"],
  ["S06", "黄金の肩鎧", "shoulder", "SSR", lv(40), "黄金の輝き"],
  // ---- 背中 ----
  ["K01", "騎士の赤マント", "cape", "SR", f("chest_temple", 2), "プレス騎士から託されたマント"],
  ["K02", "影のマント", "cape", "R", f("tower", 0), "怠惰の影を振り払った者がまとう"],
  ["K03", "金の羽マント", "cape", "SSR", dg("back_mountain"), "巨人の背骨山の頂で見つけた"],
  ["K04", "大地のマント", "cape", "SR", dg("leg_castle"), "大地の王のマント"],
  ["K05", "覇王のマント", "cape", "SSR", dg("final_castle"), "覇王の城を制した者だけがまとう"],
  ["K06", "勇者の白マント", "cape", "SR", sk(30), "30日連続。勇者の証"],
  // ---- 胸 ----
  ["T01", "ハンターの帯", "chest", "N", ts(20), "合計20セット"],
  ["T02", "ゴーレムハーネス", "chest", "R", f("chest_temple", 1), "鋼のゴーレムの心臓が光る"],
  ["T03", "神のたすき", "chest", "SR", f("chest_temple", 3), "胸板の神の衣"],
  ["T04", "風のウインドブレーカー", "chest", "R", f("wind_corridor", 0), "風の精の加護"],
  // ---- 手首 ----
  ["W01", "灼熱のリストバンド", "wrist", "N", lv(3), "最初のリストバンド"],
  ["W02", "黒のリストバンド", "wrist", "N", ad(10), "10日運動した"],
  ["W03", "鉄の籠手", "wrist", "R", lv(18), "鍛え上げた前腕に"],
  ["W04", "時の金腕輪", "wrist", "SR", f("tower", 2), "時の番人が刻を止めた腕輪"],
  ["W05", "リストラップ", "wrist", "N", ts(100), "合計100セット"],
  ["W06", "狼の毛皮バンド", "wrist", "R", km(21), "ハーフマラソン分（21km）走った"],
  ["W07", "機械の籠手", "wrist", "SR", f("final_castle", 1), "鋼鉄の巨神の腕"],
  ["W08", "ネオンリストバンド", "wrist", "N", sk(3), "3日連続"],
  // ---- 手 ----
  ["A01", "鋼のダンベル", "hand", "R", ts(300), "合計300セット"],
  ["A02", "トロールのケトルベル", "hand", "R", lv(14), "山のように重い"],
  ["A03", "ボクシンググローブ", "hand", "R", lv(20), "拳で語れ"],
  ["A04", "オープンフィンガーグローブ", "hand", "SR", lv(25), "格闘家の証"],
  ["A05", "木刀", "hand", "R", ad(30), "30日運動した武人に"],
  ["A06", "プロテインシェーカー", "hand", "N", ad(20), "20日運動した。飲むまでがトレーニング"],
  ["A07", "チョーク", "hand", "N", lv(8), "握力が増す（気がする）"],
  // ---- 腰 ----
  ["B01", "巨人のリフティングベルト", "waist", "SR", f("back_mountain", 3), "背骨の巨人の宝"],
  ["B02", "稲妻のリフティングベルト", "waist", "R", ts(500), "合計500セット"],
  ["B03", "チャンピオンベルト", "waist", "SSR", lv(45), "王者の証"],
  ["B04", "金の帯", "waist", "R", lv(22), "ゴリマッチョの証"],
  ["B05", "機械のベルト", "waist", "SR", ts(1000), "合計1000セット。もはや機械"],
  // ---- ショーツ ----
  ["P01", "スライムショーツ", "shorts", "N", f("cave", 0), "スライムの粘液で染めた（洗っても落ちない）"],
  ["P02", "大地の赤ショーツ", "shorts", "R", f("leg_castle", 2), "大地の王のショーツ"],
  ["P03", "迷彩ショーツ", "shorts", "R", f("leg_castle", 1), "重装兵の野戦用"],
  ["P04", "稲妻ブルーショーツ", "shorts", "R", f("wind_corridor", 2), "嵐の鳥の羽の色"],
  ["P05", "ネオンピンクショーツ", "shorts", "R", sk(7), "7日連続の情熱の色"],
  ["P06", "覇王の金ショーツ", "shorts", "SSR", { kind: "allDungeons" }, "全ダンジョンを制した者だけが履ける"],
  ["P07", "魔女の紫ショーツ", "shorts", "R", f("tower", 3), "不屈の竜の色"],
  ["P08", "勇者の白ショーツ", "shorts", "SR", lv(35), "レジェンドの証"],
  ["P09", "毛皮のショーツ", "shorts", "N", lv(5), "細マッチョの証"],
  ["P10", "袴ショーツ", "shorts", "R", ad(50), "50日運動した"],
  // ---- 靴 ----
  ["L01", "岩トカゲのブーツ", "shoes", "N", f("back_mountain", 0), "岩トカゲの皮。とにかく硬い"],
  ["L02", "疾風のシューズ", "shoes", "SR", f("wind_corridor", 3), "風神の靴"],
  ["L03", "炎のシューズ", "shoes", "R", km(100), "累計100km。走ると熱い"],
  ["L04", "黄金の靴", "shoes", "SSR", lv(42), "黄金の一歩"],
  ["L05", "コンバットブーツ", "shoes", "N", lv(7), "どこでも走れる"],
  ["L06", "白いシューズ", "shoes", "N", km(5), "累計5km走った"],
  ["L07", "金のサンダル", "shoes", "R", ad(100), "100日運動した神々の履物"],
  // ---- 脚 ----
  ["L08", "膝スリーブ", "legs", "N", ts(200), "合計200セット。膝を守れ"],
  ["L09", "金のすね当て", "legs", "SR", lv(30), "鍛え抜いた脚に"],
  // ---- オーラ（体の後ろに光る演出） ----
  ["aura_wind", "そよ風のオーラ", "aura", "R", km(50), "累計50km。風の加護"],
  ["aura_flame", "不屈の炎", "aura", "SR", sk(10), "10日連続で燃え上がる"],
  ["aura_purple", "竜気のオーラ", "aura", "SR", lv(26), "竜の気配をまとう"],
  ["aura_gold", "覇王のオーラ", "aura", "SSR", lv(38), "全身から立ちのぼる黄金の気"],
];

export const ITEMS: Item[] = ROWS.map(([id, name, slot, rarity, source, description]) => ({ id, name, slot, rarity, source, description }));

export const RARITY_COLORS: Record<Rarity, string> = {
  N: "#9aa3b2",
  R: "#4cc9f0",
  SR: "#b79cff",
  SSR: "#ffd166",
};

export function findItem(id: string | undefined): Item | undefined {
  return id ? ITEMS.find((i) => i.id === id) : undefined;
}

/** その部位の装備の重ね順（小さいほど奥）。絵には体に隠れる部分があらかじめ反映されている */
export const LAYER_ORDER: Record<GearSlot, number> = {
  aura: 0,
  cape: 1,
  shorts: 2,
  shoes: 3,
  legs: 4,
  chest: 5,
  waist: 6,
  shoulder: 7,
  wrist: 8,
  hand: 9,
  neck: 10,
  face: 11,
  head: 12,
};
