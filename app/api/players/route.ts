import { NextResponse } from "next/server";
import { hashToken, rpc, serverConfigured } from "@/server/db";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  titleId: string | null;
  aura: string | null;
  avatarAt: number | null;
  clears: string[] | null;
  menus: { name: string; exercises: { id: string; name: string }[] }[] | null;
  activities: { id: string; type: "workout" | "run"; date: string; createdAt: number; xp: number; byStat: Record<string, number>; detail: Record<string, unknown> }[];
}

interface Cheer {
  to: string;
  activityId: string;
  from: string;
  kind: string;
}
interface Inbox {
  playerId: string;
  cheers: { activityId: string; from: string; kind: string }[];
  battles: { challenger: string; opponent: string; start: string; end: string }[];
}

/**
 * 筋トレかランを1回以上記録したプレイヤー全員と、直近60日の記録・届いた応援。
 * ヘッダー x-mq-token があれば、その人あての受け取り（応援・対決）も返す。
 */
export async function GET(req: Request) {
  if (!serverConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const since = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
    const token = req.headers.get("x-mq-token") ?? "";
    const [rows, cheers, me] = await Promise.all([
      rpc<Row[]>("mq_players_since", { p_since: since }),
      rpc<Cheer[]>("mq_cheers_since", { p_since: since }),
      /^[a-f0-9]{64}$/.test(token) ? rpc<Inbox | null>("mq_inbox", { p_token_hash: hashToken(token), p_since: new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10) }) : Promise.resolve(null),
    ]);
    // 応援は「プレイヤーID:記録ID」ごとにまとめる（画面の記録IDと同じ形）
    const cheersByActivity: Record<string, { from: string; kind: string }[]> = {};
    for (const c of cheers) (cheersByActivity[`${c.to}:${c.activityId}`] ??= []).push({ from: c.from, kind: c.kind });
    const players = rows.map((p) => ({
      id: p.id,
      name: p.name,
      titleId: p.titleId ?? undefined,
      aura: p.aura ?? undefined,
      clears: Array.isArray(p.clears) ? p.clears : [],
      menus: Array.isArray(p.menus) ? p.menus : [],
      avatarUrl: p.avatarAt ? `/api/avatar/${p.id}?v=${p.avatarAt}` : undefined,
      activities: p.activities.map((a) => ({
        id: `${p.id}:${a.id}`,
        userId: p.id,
        type: a.type,
        date: a.date,
        createdAt: Number(a.createdAt),
        xp: a.xp,
        byStat: a.byStat,
        ...(a.type === "workout" ? { workout: a.detail } : { run: a.detail }),
      })),
    }));
    return NextResponse.json({ players, cheers: cheersByActivity, me }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
