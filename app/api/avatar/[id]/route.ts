import { rpc, serverConfigured } from "@/server/db";

export const dynamic = "force-dynamic";

/** プレイヤーのプロフィール写真（JPEG）。URL に更新時刻が付くので長くキャッシュしてよい */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!serverConfigured() || !/^[0-9a-f-]{36}$/.test(id)) return new Response(null, { status: 404 });
  try {
    const data = await rpc<string | null>("mq_avatar", { p_player: id });
    if (!data || !data.startsWith("data:image/jpeg;base64,")) return new Response(null, { status: 404 });
    const bytes = Buffer.from(data.slice("data:image/jpeg;base64,".length), "base64");
    return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response(null, { status: 404 });
  }
}
