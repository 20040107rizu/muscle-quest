import { useSyncExternalStore } from "react";

/**
 * プレビュー版（1ファイルのWebページ）用のハッシュルーター。
 * "/friends/u_kenta" <-> "#friends--u_kenta" のように相互変換する。
 */
export function toHash(path: string): string {
  const p = path.split("?")[0].replace(/\/+$/, "");
  return p === "" ? "#home" : "#" + p.slice(1).replace(/\//g, "--");
}

export function fromHash(hash: string): string {
  const h = hash.replace(/^#/, "");
  if (!h || h === "home") return "/";
  return "/" + h.replace(/--/g, "/");
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, () => fromHash(location.hash), () => "/");
}

export function navigate(path: string) {
  const h = toHash(path);
  if (location.hash !== h) location.hash = h;
  window.scrollTo(0, 0);
}
