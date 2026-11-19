import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 今公開されている版（画面側の版と比べて、古ければ読み込み直す） */
export function GET() {
  return NextResponse.json({ version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}
