"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { assetUrl } from "../assets";

/** アイコンは画像生成AIが描いたもの（public/ui/tab_*。選択中は *_on） */
const TABS = [
  { href: "/", label: "ホーム", icon: "home", match: (p: string) => p === "/" || p.startsWith("/character") || p.startsWith("/me") || p.startsWith("/titles") },
  { href: "/quest", label: "クエスト", icon: "quest", match: (p: string) => p.startsWith("/quest") },
  { href: "/workout", label: "記録", icon: "record", match: (p: string) => p.startsWith("/workout") || p.startsWith("/run") },
  { href: "/friends", label: "友達", icon: "friends", match: (p: string) => p.startsWith("/friends") },
  { href: "/ranking", label: "ランキング", icon: "ranking", match: (p: string) => p.startsWith("/ranking") },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(path);
          const big = t.href === "/workout";
          const src = assetUrl(`ui/tab_${t.icon}${active ? "_on" : ""}.webp`);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${active ? "text-accent" : "text-sub"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className={`object-contain transition-transform ${big ? "-mt-6 size-14 drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" : "size-7"} ${active ? "scale-110 drop-shadow-[0_0_8px_rgba(255,107,44,0.6)]" : ""}`}
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
