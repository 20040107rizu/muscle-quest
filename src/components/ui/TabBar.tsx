"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "ホーム", icon: HomeIcon, match: (p: string) => p === "/" || p.startsWith("/character") },
  { href: "/workout", label: "記録", icon: PlusIcon, match: (p: string) => p.startsWith("/workout") || p.startsWith("/run") },
  { href: "/friends", label: "友達", icon: UsersIcon, match: (p: string) => p.startsWith("/friends") },
  { href: "/ranking", label: "ランキング", icon: TrophyIcon, match: (p: string) => p.startsWith("/ranking") },
  { href: "/me", label: "マイページ", icon: UserIcon, match: (p: string) => p.startsWith("/me") },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(path);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${active ? "text-accent" : "text-sub"}`}
              >
                {t.href === "/workout" ? (
                  <span className={`-mt-5 grid size-12 place-items-center rounded-full shadow-lg ${active ? "bg-accent text-white" : "bg-panel-2 text-ink"} ring-4 ring-bg`}>
                    <Icon />
                  </span>
                ) : (
                  <Icon />
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function I({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}
function HomeIcon() {
  return <I><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></I>;
}
function PlusIcon() {
  return <I><path d="M12 5v14M5 12h14" /></I>;
}
function UsersIcon() {
  return <I><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><circle cx="17.5" cy="9" r="2.5" /><path d="M17 14.6c2.4.2 4 1.8 4.5 4.4" /></I>;
}
function TrophyIcon() {
  return <I><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.5a3 3 0 0 0 3.5 4M16 6h3.5a3 3 0 0 1-3.5 4M12 13v4M8.5 20h7M10 17h4" /></I>;
}
function UserIcon() {
  return <I><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" /></I>;
}
