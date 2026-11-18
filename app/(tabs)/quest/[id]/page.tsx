"use client";

import { TitlePlate } from "@/components/ui/TitlePlate";
import { SkinGauge } from "@/components/ui/SkinGauge";
import { SkinButton, SkinFace } from "@/components/ui/SkinButton";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BossArt } from "@/components/BossArt";
import { useFx } from "@/components/fx/FxLayer";
import { sfx } from "@/components/fx/sound";
import { ItemGet } from "@/components/fx/ItemGet";
import { FxImg, FxRays } from "@/components/fx/FxImg";
import { Card, Loading } from "@/components/ui/primitives";
import { clearId, currentFloor, findDungeon, findTitle, floorProgress, isUnlocked, type Reward } from "@/domain/quests";
import { getRepo, useMyData, wearTitle } from "@/data/hooks";

type Phase = "idle" | "fighting" | "won" | "lost";

export default function DungeonPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMyData();
  const d = findDungeon(id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hp, setHp] = useState<number | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [msg, setMsg] = useState("");
  const [dmgs, setDmgs] = useState<{ id: number; value: number; crit: boolean; x: number }[]>([]);
  const [hitKey, setHitKey] = useState(0);
  const [sparks, setSparks] = useState<{ id: number; kind: string; size: number; x: number; y: number }[]>([]);
  const bossRef = useRef<HTMLDivElement>(null);
  const [battleFloor, setBattleFloor] = useState<number | null>(null);
  /** 撃破と同時に手に入ったオーラ（レベルアップなどで条件を満たしたもの） */
  const [drops, setDrops] = useState<string[]>([]);
  const [showDrops, setShowDrops] = useState(false);
  const { burst, confetti, shake } = useFx();

  if (!me) return <Loading />;
  if (!d) return <p className="pt-10 text-center text-sm text-sub">ダンジョンが見つかりません</p>;
  if (!isUnlocked(d, me.cleared)) return <p className="pt-10 text-center text-sm text-sub">まだ解放されていません</p>;

  // 戦闘中・撃破直後は戦っている階を表示し続ける（クリア保存で次の階に切り替わっても演出を見せる）
  const fi = battleFloor ?? currentFloor(d, me.cleared);
  const floor = fi != null ? d.floors[fi] : null;
  const prog = floor ? floorProgress(floor, me.questStats) : null;
  // 最後に戦ったときの残りHP。未挑戦なら満タン・数値は ???（戦ってみるまで分からない）
  const saved = fi != null ? me.lastHp.get(clearId(d.id, fi)) : undefined;
  const shownHp = hp ?? saved ?? 1;
  const hpKnown = hp != null || saved != null;

  /** ダメージ数字の表示上の最大HP（演出用。判定は割合で行う） */
  const BOSS_HP = 9999;

  function spawnDamage(value: number, crit: boolean) {
    const id = Math.random();
    const x = 50 + (Math.random() - 0.5) * 40;
    setDmgs((list) => [...list, { id, value, crit, x }]);
    setTimeout(() => setDmgs((list) => list.filter((dm) => dm.id !== id)), 950);
  }

  function spawnSpark(kind: string, size: number) {
    const id = Math.random();
    setSparks((list) => [...list, { id, kind, size, x: 50 + (Math.random() - 0.5) * 30, y: 45 + (Math.random() - 0.5) * 30 }]);
    setTimeout(() => setSparks((list) => list.filter((s) => s.id !== id)), 420);
  }

  function bossCenter() {
    const b = bossRef.current?.getBoundingClientRect();
    return b ? { x: b.left + b.width / 2, y: b.top + b.height / 2 } : { x: innerWidth / 2, y: innerHeight / 3 };
  }

  async function challenge() {
    if (fi == null || !prog || phase === "fighting") return;
    setPhase("fighting");
    setBattleFloor(fi);
    setMsg("");
    sfx.tap();
    // 判定と残りHPの保存はデータ層で行い、その結果に合わせて連続攻撃の演出をする
    const start = saved ?? 1;
    setHp(start);
    const r = await getRepo().challengeFloor(d!.id, fi);
    const end = r.remaining ?? start;
    const dmg = Math.max(0, start - end);
    await wait(250);

    if (dmg < 0.001 && !r.ok) {
      sfx.block();
      spawnDamage(0, false);
      setHitKey((k) => k + 1);
      await wait(700);
      setPhase("lost");
      setMsg("効いていない…前回の戦いから力が伸びていない。鍛えてから再挑戦しよう");
      return;
    }

    // ダメージを複数の攻撃に分ける。1発は会心（大ダメージ）
    const hits = r.ok ? 7 : Math.max(2, Math.min(8, Math.round(dmg * 14)));
    const critIdx = hits >= 3 ? Math.floor(Math.random() * hits) : -1;
    const weights = Array.from({ length: hits }, (_, i) => (i === critIdx ? 2.6 : 0.7 + Math.random() * 0.6));
    const sum = weights.reduce((a, b) => a + b, 0);
    let cur = start;
    for (let i = 0; i < hits; i++) {
      const crit = i === critIdx;
      const part = (dmg * weights[i]) / sum;
      cur = i === hits - 1 ? end : cur - part;
      setHp(Math.max(0, cur));
      setHitKey((k) => k + 1);
      spawnDamage(Math.max(1, Math.round(part * BOSS_HP)), crit);
      spawnSpark(crit ? "hit_crit" : i % 2 ? "slash" : "hit", crit ? 190 : 120);
      sfx.hit(crit ? 1.6 : 1, crit);
      const c = bossCenter();
      burst(c.x + (Math.random() - 0.5) * 60, c.y + (Math.random() - 0.5) * 60, {
        count: crit ? 40 : 16,
        power: crit ? 1.5 : 0.9,
        colors: crit ? ["#ffd166", "#ffffff", "#ff6b2c"] : ["#ff5d6c", "#ffb547", "#ffffff"],
      });
      shake(crit ? 1.6 : 0.6);
      await wait(crit ? 360 : 210);
    }
    await wait(350);

    if (!r.ok) {
      setPhase("lost");
      setMsg(`あと少し…！残りHP ${Math.round(end * 100)}%。鍛えてから再挑戦しよう`);
      return;
    }
    // 撃破
    const c = bossCenter();
    sfx.victory();
    for (let k = 0; k < 3; k++) {
      setTimeout(() => burst(c.x, c.y, { count: 60, power: 2, colors: [d!.color, "#ffd166", "#ffffff", "#ff6b2c"] }), k * 160);
    }
    shake(2.2);
    confetti(160);
    setPhase("won");
    setReward(r.reward);
    setDrops(r.newItems ?? []);
  }

  function next() {
    setBattleFloor(null);
    setPhase("idle");
    setHp(null);
    setMsg("");
  }

  return (
    <div className="space-y-4 pt-4">
      <Link href="/quest" className="text-sm text-sub">
        ‹ クエスト
      </Link>

      <div>
        <p className="text-xl font-black">{d.name}</p>
        <p className="text-xs text-sub">{d.theme}</p>
      </div>

      {floor && prog ? (
        <div
          className="relative overflow-hidden rounded-3xl border border-line p-5 text-center"
          style={{ background: `radial-gradient(ellipse at 50% 30%, ${d.color}33, #14171d 65%)` }}
        >
          <p className="text-xs font-bold text-sub">{floor.name}</p>
          <div ref={bossRef} className="relative my-2 flex justify-center">
            <div key={hitKey} className={`${hitKey > 0 && phase === "fighting" ? "mq-hit" : ""} ${phase === "won" ? "mq-defeat" : ""}`}>
              <BossArt dungeonId={d.id} floor={fi!} size={200} />
            </div>
            {dmgs.map((dm) => (
              <span
                key={dm.id}
                className={`mq-dmg pointer-events-none absolute top-1/3 font-num font-bold italic ${dm.crit ? "text-5xl text-accent-2" : dm.value === 0 ? "text-2xl text-sub" : "text-3xl text-white"}`}
                style={{ left: `${dm.x}%`, textShadow: "0 2px 0 #000, 0 0 12px rgba(0,0,0,0.8)" }}
              >
                {dm.value === 0 ? <FxImg name="logo_miss" alt="MISS" className="w-32" /> : dm.value.toLocaleString()}
                {dm.crit && <FxImg name="logo_critical" alt="CRITICAL!" className="mx-auto w-36" />}
              </span>
            ))}
            {sparks.map((sp) => (
              <FxImg
                key={sp.id}
                name={sp.kind}
                alt=""
                className="mq-spark pointer-events-none absolute"
                style={{ left: `${sp.x}%`, top: `${sp.y}%`, width: sp.size, height: sp.size }}
              />
            ))}
            {phase === "won" && (
              <>
                <FxImg name="explosion" alt="" className="mq-boom pointer-events-none absolute left-1/2 top-1/2 w-72" />
                <FxImg name="logo_clear" alt="CLEAR!!" className="mq-stamp pointer-events-none absolute left-1/2 top-1/3 w-64 drop-shadow-[0_0_20px_rgba(255,181,71,0.9)]" />
              </>
            )}
          </div>
          <p className="text-lg font-black">{floor.boss}</p>
          <div className="mx-auto mt-2 max-w-[16rem]">
            <div className="flex justify-between text-[10px] text-sub">
              <span>HP</span>
              <span className="font-num">{hpKnown ? `${Math.round(shownHp * 100)}%` : "???"}</span>
            </div>
            <SkinGauge kind="hp" value={shownHp} h={20} shimmer className="mt-0.5" fillClassName="!duration-200 ease-out" />
          </div>

          {phase === "won" ? (
            <div className="mq-pop mt-4">
              {!reward && (
                <SkinButton onClick={next} className="mt-3 h-12 w-full text-sm">
                  次の階へ
                </SkinButton>
              )}
            </div>
          ) : (
            <SkinButton variant="gold" onClick={challenge} disabled={phase === "fighting"} className={`mt-4 h-16 w-full text-lg ${phase === "idle" ? "mq-pulse-soft" : ""}`}>
              {phase === "fighting" ? "戦闘中…" : phase === "lost" || saved != null ? "⚔️ もう一度挑む" : "⚔️ ボスに挑む"}
            </SkinButton>
          )}
          {msg && <p className="mt-2 text-xs text-bad">{msg}</p>}
        </div>
      ) : (
        <Card className="text-center">
          <p className="text-4xl">🏆</p>
          <p className="mt-2 font-black">踏破済み</p>
          <p className="text-xs text-sub">このダンジョンはすべての階をクリアしました</p>
        </Card>
      )}

      {floor && prog && (
        <Card>
          <p className="mb-3 text-sm font-bold">撃破条件</p>
          <div className="space-y-3">
            {prog.reqs.map((r) => (
              <div key={r.label}>
                <div className="flex justify-between text-xs">
                  <span className={r.done ? "text-good" : ""}>
                    {r.done ? "✓ " : ""}
                    {r.label}
                  </span>
                  <span className="font-num">
                    {r.current.toLocaleString()} / {r.target.toLocaleString()}
                    {r.unit}
                  </span>
                </div>
                <SkinGauge kind="ms" value={r.current / r.target} h={12} className="mt-1" />
              </div>
            ))}
          </div>
          <p className="mt-3 skin-tag px-2 py-1 text-[11px] text-sub">💡 {floor.hint}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link href="/workout" className="rounded-xl bg-accent/15 py-2.5 text-center text-xs font-bold text-accent">
              筋トレで鍛える
            </Link>
            <Link href="/run" className="rounded-xl bg-cardio/15 py-2.5 text-center text-xs font-bold text-cardio">
              走って鍛える
            </Link>
          </div>
        </Card>
      )}

      <section>
        <p className="mb-2 px-1 text-sm font-bold">フロア</p>
        <Card className="!p-0">
          {[...d.floors].map((f, i) => ({ f, i })).reverse().map(({ f, i }) => {
            const done = me.cleared.has(clearId(d.id, i));
            const cur = i === fi && !done;
            return (
              <div key={f.name} className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${cur ? "bg-white/5" : ""}`}>
                <span className="relative grid size-11 shrink-0 place-items-center rounded-full" style={{ background: `${d.color}22` }}>
                  <BossArt dungeonId={d.id} floor={i} size={40} dim={!done && !cur} className={done ? "opacity-60" : ""} />
                  {done && <span className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full bg-good text-[9px] font-bold text-bg">✓</span>}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${done || cur ? "" : "text-sub"}`}>{f.name}</p>
                  <p className="text-[11px] text-sub">{done || cur ? f.boss : "???"}</p>
                </div>
                {done && <span className="text-[10px] font-bold text-good">撃破</span>}
                {cur && <span className="text-[10px] font-bold text-accent-2">挑戦中</span>}
              </div>
            );
          })}
        </Card>
      </section>

      <Card className="text-xs">
        <p className="mb-1 font-bold">踏破報酬</p>
        <p className="text-sub">
          称号【{findTitle(d.reward.titleId)?.name}】
        </p>
      </Card>

      {reward && (
        <RewardModal
          reward={reward}
          onClose={() => {
            setReward(null);
            // 撃破と同時に手に入ったオーラがあれば続けて見せる
            if (drops.length) setShowDrops(true);
            else next();
          }}
        />
      )}
      {!reward && phase === "won" && drops.length > 0 && !showDrops && <DropTimer onDone={() => setShowDrops(true)} />}
      {showDrops && drops.length > 0 && (
        <ItemGet
          ids={drops}
          heading="新しいオーラを手に入れた！"
          onClose={() => {
            setShowDrops(false);
            setDrops([]);
            next();
          }}
        />
      )}
    </div>
  );
}

/** 撃破演出を見せてから、オーラ入手の画面を出す */
function DropTimer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);
  return null;
}


function RewardModal({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const title = findTitle(reward.titleId);
  const [equipped, setEquipped] = useState(false);
  const [visible, setVisible] = useState(false);
  const [opened, setOpened] = useState(false);
  const chestRef = useRef<HTMLButtonElement>(null);
  const { burst, confetti, shake } = useFx();

  // 撃破演出を見せてから宝箱を出す
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1300);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;

  function openChest() {
    if (opened) return;
    setOpened(true);
    sfx.chest();
    const b = chestRef.current?.getBoundingClientRect();
    if (b) burst(b.left + b.width / 2, b.top + b.height / 3, { count: 70, power: 1.8, colors: ["#fff6c8", "#ffd166", "#ffb547", "#ffffff"] });
    confetti(180);
    shake(1.4);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/85 p-6" role="dialog" aria-modal>
      {opened && <FxRays />}
      <div className="relative w-full max-w-sm text-center">
        <FxImg name="logo_dungeonclear" alt="DUNGEON CLEAR!!" className="mq-stamp-center mx-auto w-56 drop-shadow-[0_0_20px_rgba(255,181,71,0.8)]" />
        <button ref={chestRef} onClick={openChest} className={`mx-auto mt-3 block ${opened ? "" : "mq-chest-shake"}`} aria-label="宝箱を開ける">
          <FxImg name={opened ? "chest_open" : "chest_closed"} alt="" className={`h-40 w-48 object-contain ${opened ? "mq-pop drop-shadow-[0_0_30px_rgba(255,209,102,0.9)]" : ""}`} />
        </button>
        {!opened ? (
          <p className="mq-pulse-soft mt-1 text-sm font-bold text-ink">タップして宝箱を開けろ！</p>
        ) : (
          <>
            {title && (
              <div className="mq-pop mt-2 rounded-2xl border border-accent-2/50 bg-panel/90 p-3">
                <p className="text-[10px] text-sub">称号を獲得</p>
                <TitlePlate name={title.name} rarity={title.rarity} size="lg" />
              </div>
            )}
            <div className="mt-4 grid gap-2">
              <SkinButton
                variant="gold"
                disabled={equipped}
                onClick={async () => {
                  if (title) await wearTitle(title.id);
                  setEquipped(true);
                  sfx.coin();
                }}
                className="h-14 w-full text-base"
              >
                {equipped ? "称号をつけた！" : "今すぐ称号をつける"}
              </SkinButton>
              <SkinButton variant="gray" onClick={onClose} className="h-12 w-full text-sm">
                閉じる
              </SkinButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
