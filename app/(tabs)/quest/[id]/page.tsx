"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Card, Loading } from "@/components/ui/primitives";
import { findItem } from "@/domain/items";
import { clearId, currentFloor, findDungeon, findTitle, floorProgress, isUnlocked, type Reward } from "@/domain/quests";
import { getRepo, useMyData } from "@/data/hooks";

type Phase = "idle" | "fighting" | "won" | "lost";

export default function DungeonPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMyData();
  const d = findDungeon(id);
  const [phase, setPhase] = useState<Phase>("idle");
  const [hp, setHp] = useState<number | null>(null);
  const [reward, setReward] = useState<Reward | null>(null);
  const [msg, setMsg] = useState("");

  if (!me) return <Loading />;
  if (!d) return <p className="pt-10 text-center text-sm text-sub">ダンジョンが見つかりません</p>;
  if (!isUnlocked(d, me.cleared)) return <p className="pt-10 text-center text-sm text-sub">まだ解放されていません</p>;

  const fi = currentFloor(d, me.cleared);
  const floor = fi != null ? d.floors[fi] : null;
  const prog = floor ? floorProgress(floor, me.questStats) : null;
  const shownHp = hp ?? (prog ? 1 - prog.ratio : 0);

  async function challenge() {
    if (fi == null || !prog || phase === "fighting") return;
    setPhase("fighting");
    setMsg("");
    // 攻撃演出: 達成度の分だけボスのHPが削れる
    setHp(1);
    await wait(250);
    setHp(prog.ready ? 0 : 1 - prog.ratio);
    await wait(900);
    if (!prog.ready) {
      setPhase("lost");
      setMsg("まだ力が足りない…条件を満たしてから再挑戦しよう");
      return;
    }
    const r = await getRepo().challengeFloor(d!.id, fi);
    if (!r.ok) {
      setPhase("lost");
      setMsg(r.errors.join(" "));
      return;
    }
    setPhase("won");
    setReward(r.reward);
  }

  function next() {
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
          <div className={`my-3 select-none text-[88px] leading-none ${phase === "fighting" ? "mq-shake" : ""} ${phase === "won" ? "mq-defeat" : ""}`} aria-hidden>
            {floor.emoji}
          </div>
          <p className="text-lg font-black">{floor.boss}</p>
          <div className="mx-auto mt-2 max-w-[16rem]">
            <div className="flex justify-between text-[10px] text-sub">
              <span>HP</span>
              <span className="font-num">{Math.round(shownHp * 100)}%</span>
            </div>
            <div className="mt-0.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-bad transition-[width] duration-700 ease-out" style={{ width: `${shownHp * 100}%` }} />
            </div>
          </div>

          {phase === "won" ? (
            <div className="mq-pop mt-4">
              <p className="font-num text-3xl font-bold tracking-widest text-accent-2">CLEAR!</p>
              {!reward && (
                <button onClick={next} className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-bold text-white">
                  次の階へ
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={challenge}
              disabled={phase === "fighting"}
              className={`mt-4 w-full rounded-2xl py-4 text-base font-black ${prog.ready ? "bg-accent-2 text-bg shadow-[0_8px_24px_-8px_rgba(255,181,71,0.8)]" : "bg-panel-2 text-ink"} disabled:opacity-60`}
            >
              {phase === "fighting" ? "戦闘中…" : prog.ready ? "⚔️ ボスに挑む" : "挑戦してみる"}
            </button>
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
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (r.current / r.target) * 100)}%`, background: r.done ? "#3ddc97" : d.color }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-panel-2 px-3 py-2 text-[11px] text-sub">💡 {floor.hint}</p>
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
            const cur = i === fi;
            return (
              <div key={f.name} className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-0 ${cur ? "bg-white/5" : ""}`}>
                <span className={`grid size-9 place-items-center rounded-full text-lg ${done ? "" : cur ? "" : "opacity-30 grayscale"}`} style={{ background: `${d.color}22` }} aria-hidden>
                  {done ? "✓" : f.emoji}
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
          称号【{findTitle(d.reward.titleId)?.name}】・{findItem(d.reward.itemId)?.name}
        </p>
      </Card>

      {reward && <RewardModal reward={reward} onClose={() => { setReward(null); next(); }} />}
    </div>
  );
}

function RewardModal({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const title = findTitle(reward.titleId);
  const item = findItem(reward.itemId);
  const [equipped, setEquipped] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-6 backdrop-blur-sm" role="dialog" aria-modal>
      <div className="mq-pop w-full max-w-sm rounded-3xl border border-accent-2/40 bg-panel p-6 text-center">
        <p className="text-xs font-bold tracking-[0.3em] text-accent-2">DUNGEON CLEAR</p>
        <p className="mt-3 text-5xl" aria-hidden>
          🏆
        </p>
        {title && (
          <div className="mt-4 rounded-xl bg-panel-2 p-3">
            <p className="text-[10px] text-sub">称号を獲得</p>
            <p className="text-lg font-black text-accent-2">【{title.name}】</p>
          </div>
        )}
        {item && (
          <div className="mt-2 rounded-xl bg-panel-2 p-3">
            <p className="text-[10px] text-sub">アイテムを獲得</p>
            <p className="flex items-center justify-center gap-2 font-bold">
              <span className="inline-block size-3 rounded-full" style={{ background: item.color }} />
              {item.name}
            </p>
            <p className="text-[10px] text-sub">{item.description}</p>
          </div>
        )}
        <div className="mt-5 grid gap-2">
          <button
            disabled={equipped}
            onClick={async () => {
              if (item) await getRepo().equipItem(item.slot, item.id);
              if (title) await getRepo().setTitle(title.id);
              setEquipped(true);
            }}
            className="w-full rounded-xl bg-accent-2 py-3 text-sm font-bold text-bg disabled:opacity-60"
          >
            {equipped ? "装備しました" : "称号とアイテムを装備する"}
          </button>
          <button onClick={onClose} className="w-full rounded-xl bg-panel-2 py-3 text-sm">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
