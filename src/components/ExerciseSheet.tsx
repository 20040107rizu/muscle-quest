"use client";

import { findExercise, primaryGroup, EXERCISE_GROUP_ORDER } from "@/domain/exercises";
import { exerciseGuide } from "@/domain/exerciseGuides";
import { STAT_LABELS, type StatKey } from "@/domain/types";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ExerciseGuideCard } from "./ExerciseGuideCard";
import { SkinButton } from "./ui/SkinButton";

/** 種目の詳細（お手本動画・効く筋肉・コツ・鍛えられる部位）。タイムラインなどで種目名をタップすると開く */
export function ExerciseSheet({ exerciseId, name, onClose }: { exerciseId: string; name: string; onClose: () => void }) {
  const router = useRouter();
  const ex = findExercise(exerciseId);
  const g = exerciseGuide(exerciseId);
  const group = ex ? EXERCISE_GROUP_ORDER.find((x) => x.group === primaryGroup(ex))?.label : undefined;
  // 記録カードの中（動きのある枠）に置くと位置がずれるので、画面のいちばん外側に出す
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose} role="dialog" aria-modal>
      <div className="mq-rise max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <p className="text-lg font-black">{name}</p>
            {group && <p className="text-xs text-sub">{group}の種目</p>}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg bg-panel-2 px-3 py-1.5 text-sm">
            閉じる
          </button>
        </div>
        {g ? (
          <ExerciseGuideCard exerciseId={exerciseId} alwaysOpen />
        ) : (
          <p className="skin-card p-4 text-center text-sm text-sub">自分で追加した種目なので、お手本はありません</p>
        )}
        {ex && (
          <div className="skin-card mt-3 p-3">
            <p className="mb-1.5 text-xs font-bold">育つ部位（経験値の配分）</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ex.distribution)
                .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                .map(([k, v]) => (
                  <span key={k} className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs">
                    {STAT_LABELS[k as StatKey]} {Math.round((v ?? 0) * 100)}%
                  </span>
                ))}
            </div>
          </div>
        )}
        {ex && (
          <SkinButton
            onClick={() => {
              onClose();
              router.push(`/workout?ex=${encodeURIComponent(exerciseId)}`);
            }}
            className="mt-4 h-12 w-full text-sm"
          >
            この種目を記録する
          </SkinButton>
        )}
      </div>
    </div>,
    document.body,
  );
}
