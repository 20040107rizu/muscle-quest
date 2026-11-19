"use client";

import { useEffect, useState } from "react";
import { ONLINE } from "@/data/hooks";

const MINE = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";
const RELOADED = "mq-reloaded-for";

function reloadOnce(reason: string) {
  try {
    // 同じ理由で何度も読み込み直さない（読み込み直しても直らないときのループ防止）
    if (sessionStorage.getItem(RELOADED) === reason) return false;
    sessionStorage.setItem(RELOADED, reason);
  } catch {
    // 保存できなくても読み込み直す
  }
  location.reload();
  return true;
}

/**
 * 新しい版が公開されたら、古いまま開いている画面を新しくする。
 * - アプリに戻ってきたとき（裏から表に出たとき）に版を確かめ、古ければ自動で読み込み直す
 * - 使っている最中は、上に「新しい版があります」を出してタップで更新（入力中の内容が消えないように）
 * - 古い画面が、もう無い部品を読みに行って失敗したときも、自動で読み込み直す
 */
export function UpdateWatcher() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (!ONLINE || MINE === "dev") return;
    const check = async (auto: boolean) => {
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { version } = (await r.json()) as { version: string };
        if (version && version !== "dev" && version !== MINE) {
          if (!auto || !reloadOnce(`v:${version}`)) setStale(true);
        }
      } catch {
        // 通信できないときは何もしない
      }
    };
    const onVisible = () => document.visibilityState === "visible" && check(true);
    const onChunkError = (e: { message?: string; reason?: { name?: string; message?: string } }) => {
      const msg = `${e.message ?? ""} ${e.reason?.name ?? ""} ${e.reason?.message ?? ""}`;
      if (/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/.test(msg)) reloadOnce("chunk");
    };
    const onError = (e: ErrorEvent) => onChunkError(e);
    const onRejection = (e: PromiseRejectionEvent) => onChunkError({ reason: e.reason });
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const t = setInterval(() => check(false), 10 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      clearInterval(t);
    };
  }, []);

  if (!stale) return null;
  return (
    <button
      onClick={() => location.reload()}
      className="fixed inset-x-0 top-0 z-[80] bg-accent-2 px-4 py-2 text-center text-xs font-bold text-bg pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      新しい版があります。タップで更新
    </button>
  );
}
