import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 公開した版の印（Render が組み立て時に入れるコミットID）。画面とサーバーで比べて、古い画面を自動で更新する
  env: { NEXT_PUBLIC_APP_VERSION: process.env.RENDER_GIT_COMMIT ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "dev" },
};
export default nextConfig;
