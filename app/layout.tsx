import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Barlow_Condensed } from "next/font/google";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "MUSCLE QUEST",
  description: "筋トレとランニングで、自分の分身を育てるフィットネス育成アプリ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-48.png", sizes: "48x48" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0d11",
};

// 数字用の細い英字フォントだけ、アプリと一緒に配る（外へ取りに行かない）
const barlow = Barlow_Condensed({ weight: ["500", "600", "700"], subsets: ["latin"], variable: "--font-barlow", display: "swap" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={barlow.variable}>
      <body className="min-h-dvh antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
