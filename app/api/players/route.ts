import { NextResponse } from "next/server";
import { rpc, serverConfigured } from "@/server/db";

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  name: string;
  titleId: string | null;
  aura: string | null;
  activities: { id: string; type: "workout" | "run"; date: string; createdAt: number; xp: number; byStat: Record<string, number>; detail: Record<string, unknown> }[];
}

/** 筋トレかランを1回以上記録したプレイヤー全員と、直近60日の記録 */
export async function GET() {
  if (!serverConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const since = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
    const rows = await rpc<Row[]>("mq_players_since", { p_since: since });
    const players = rows.map((p) => ({
      id: p.id,
      name: p.name,
      titleId: p.titleId ?? undefined,
      aura: p.aura ?? undefined,
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
    return NextResponse.json({ players }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=10" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
