import { createHash } from "node:crypto";

/**
 * Supabase のデータベース関数（RPC）を呼ぶ。サーバーの中だけで使う（秘密の鍵を持つため）。
 * 必要な環境変数（Vercel の Settings → Environment Variables に登録）:
 *   SUPABASE_URL               例: https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  Supabase の秘密の鍵（「Secret key」sb_secret_… か、古い形式の service_role）。絶対にブラウザに出さない
 */
export function serverConfigured() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.SUPABASE_URL!.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    // 新しい形式の鍵（sb_secret_…）は apikey だけで送る。古い形式（eyJ… の service_role）は Authorization にも入れる
    headers: { apikey: key, ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}), "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`db ${fn} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

/** 端末の合言葉はそのまま保存せず、ハッシュにする */
export function hashToken(token: string) {
  return createHash("sha256").update(`mq:${token}`).digest("hex");
}
