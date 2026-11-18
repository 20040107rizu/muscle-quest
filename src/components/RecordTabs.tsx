"use client";

import { UiIcon } from "./ui/UiIcon";
import Link from "next/link";

export function RecordTabs({ active }: { active: "workout" | "run" }) {
  const item = (key: "workout" | "run", href: string, label: React.ReactNode) => (
    <Link
      href={href}
      className={`flex-1 rounded-lg py-2 text-center text-sm font-bold transition ${
        active === key ? (key === "run" ? "bg-cardio text-bg" : "bg-accent text-white") : "text-sub"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-1 rounded-xl bg-panel p-1">
      {item("workout", "/workout", <><UiIcon name="workout" className="mr-1" />筋トレ</>)}
      {item("run", "/run", <><UiIcon name="run" className="mr-1" />ランニング</>)}
    </div>
  );
}
