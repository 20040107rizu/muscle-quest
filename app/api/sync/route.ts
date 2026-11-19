import { NextResponse } from "next/server";
import { findItem } from "@/domain/items";
import { findTitle } from "@/domain/quests";
import { hashToken, rpc, serverConfigured } from "@/server/db";
import { recompute, type SyncCustomExercise, type SyncRun, type SyncWorkout } from "@/server/recompute";

export const dynamic = "force-dynamic";

const MAX_BODY = 2_000_000;
const MAX_RECORDS = 5000;

/** 名前の掃除（制御文字を消し、1〜20文字に） */
function cleanName(v: unknown) {
  const s = String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 20);
  return s || "名無しの挑戦者";
}

/**
 * 端末の記録を受け取り、サーバーで経験値を計算し直して保存する。
 * 初めての端末は自動で登録する（記録が1件以上あるときだけ呼ばれる）。
 */
export async function POST(req: Request) {
  if (!serverConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const text = await req.text();
  if (text.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: {
    token?: string;
    name?: string;
    titleId?: string | null;
    aura?: string | null;
    bodyweightKg?: number;
    customExercises?: SyncCustomExercise[];
    workouts?: SyncWorkout[];
    runs?: SyncRun[];
  };
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const token = String(body.token ?? "");
  if (!/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: "bad_token" }, { status: 400 });
  const workouts = Array.isArray(body.workouts) ? body.workouts : [];
  const runs = Array.isArray(body.runs) ? body.runs : [];
  if (workouts.length + runs.length > MAX_RECORDS) return NextResponse.json({ error: "too_many" }, { status: 413 });

  const tokenHash = hashToken(token);
  const name = cleanName(body.name);
  try {
    let received = await rpc<Record<string, number> | null>("mq_received", { p_token_hash: tokenHash });
    if (received === null) {
      await rpc<string>("mq_register", { p_token_hash: tokenHash, p_name: name });
      received = {};
    }
    const acts = recompute({
      workouts,
      runs,
      customExercises: Array.isArray(body.customExercises) ? body.customExercises : [],
      bodyweightKg: Number(body.bodyweightKg),
      received,
      now: Date.now(),
    });
    // 称号・オーラは存在するものだけ（見た目の情報）
    const titleId = body.titleId && findTitle(body.titleId) ? body.titleId : null;
    const aura = body.aura && findItem(body.aura) ? body.aura : null;
    const id = await rpc<string>("mq_sync", { p_token_hash: tokenHash, p_name: name, p_title: titleId, p_aura: aura, p_acts: acts });
    return NextResponse.json({ playerId: id, accepted: acts.length, rejected: workouts.length + runs.length - acts.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
