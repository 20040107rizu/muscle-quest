// プレビュー版: アプリを1つのHTMLにまとめる（claude.ai の Artifact などで公開する用）
// 使い方: npm run build:preview  →  preview/dist/index.html
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shim = (f) => path.join(root, "preview/shims", f);

const js = await build({
  entryPoints: [path.join(root, "preview/main.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  target: "es2020",
  jsx: "automatic",
  alias: {
    "next/link": shim("next-link.tsx"),
    "next/navigation": shim("next-navigation.ts"),
    "@": path.join(root, "src"),
  },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "error",
});

const cssIn = await readFile(path.join(root, "app/globals.css"), "utf8");
const css = await postcss([tailwind({ base: root })]).process(cssIn, { from: path.join(root, "app/globals.css") });

const code = js.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = `<title>MUSCLE QUEST</title>
<meta name="theme-color" content="#0b0d11">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap">
<style>:root{color-scheme:dark;background:#0b0d11}${css.css}</style>
<div id="root"></div>
<script>${code}</script>
`;
await mkdir(path.join(root, "preview/dist"), { recursive: true });
await writeFile(path.join(root, "preview/dist/index.html"), html);
console.log(`preview/dist/index.html (${(html.length / 1024).toFixed(0)} KB)`);
