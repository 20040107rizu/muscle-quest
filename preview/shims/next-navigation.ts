import { navigate, usePath } from "./router";

export function usePathname() {
  return usePath();
}

/** /friends/[id] と /quest/[id] に対応 */
export function useParams<T extends Record<string, string>>(): T {
  const path = usePath();
  const m = path.match(/^\/(?:friends|quest)\/([^/]+)$/);
  return (m ? { id: decodeURIComponent(m[1]) } : {}) as T;
}

export function useRouter() {
  return { push: navigate, replace: navigate, back: () => history.back() };
}
