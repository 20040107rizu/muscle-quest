"use client";

import { useEffect, useState } from "react";
import { exerciseGuide, EXERCISE_VIDEO_IDS } from "@/domain/exerciseGuides";
import { assetUrl } from "./assets";

const KEY = "mq-guide-open";

/** data URI（プレビュー版で埋め込んだ動画）は、スマホでも再生できるよう Blob URL にする */
function usePlayableSrc(src: string) {
  const [url, setUrl] = useState(src.startsWith("data:") ? "" : src);
  useEffect(() => {
    if (!src.startsWith("data:")) return setUrl(src);
    let made = "";
    fetch(src)
      .then((r) => r.blob())
      .then((b) => {
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch(() => setUrl(src));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [src]);
  return url;
}

/**
 * 種目のやり方。筋肉模型のお手本動画（画像生成AIが作成）と、効く筋肉・コツ。
 * 開いた／閉じたはこの端末に覚えておく。
 */
export function ExerciseGuideCard({ exerciseId }: { exerciseId: string }) {
  const g = exerciseGuide(exerciseId);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "0") setOpen(false);
    } catch {
      // 保存できない環境では毎回開いた状態
    }
  }, []);
  const src = usePlayableSrc(assetUrl(`exercises/${exerciseId}.mp4`));
  if (!g) return null;

  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(KEY, open ? "0" : "1");
    } catch {
      // 無視
    }
  };

  return (
    <div className="skin-card p-3">
      <button onClick={toggle} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold">やり方と効く筋肉</span>
        <span className="text-xs text-sub">{open ? "閉じる ▲" : "見る ▼"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-3">
          {EXERCISE_VIDEO_IDS.has(exerciseId) && (
            <div className="mx-auto aspect-[9/10] w-full max-w-[300px] overflow-hidden rounded-xl bg-[#0f1218]">
              {src && <video key={src} src={src} autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover" aria-label="お手本の動き" />}
            </div>
          )}
          <div className="space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-16 shrink-0 text-[10px] text-sub">主に効く</span>
              {g.primary.map((m) => (
                <span key={m} className="rounded-full bg-[#e0352b] px-2.5 py-0.5 font-bold text-white">
                  {m}
                </span>
              ))}
            </div>
            {g.secondary.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-16 shrink-0 text-[10px] text-sub">補助で効く</span>
                {g.secondary.map((m) => (
                  <span key={m} className="rounded-full bg-[#f29a5c]/25 px-2.5 py-0.5 font-bold text-[#ffb886]">
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-xs font-bold">コツ</p>
            <ul className="space-y-1 text-xs leading-relaxed text-ink/90">
              {g.tips.map((t) => (
                <li key={t} className="flex gap-1.5">
                  <span className="text-accent-2">●</span>
                  {t}
                </li>
              ))}
            </ul>
            {g.caution && <p className="mt-2 rounded-lg bg-bad/10 px-2 py-1.5 text-[11px] text-bad">注意：{g.caution}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
