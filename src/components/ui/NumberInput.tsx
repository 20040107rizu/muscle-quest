"use client";

import { useRef, useState } from "react";

/** 全角数字・全角ピリオドを半角に */
function toHalfWidth(s: string) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[．。]/g, ".");
}

/**
 * 数字の入力欄。
 * - 入力中は文字列のまま持つので、消してから打ち直しても頭に 0 が付かない
 * - 先頭の余分な 0 は自動で取り除く（"0100" → "100"、"0.5" はそのまま）
 * - タップすると全選択され、そのまま打てば置き換わる
 * - 確定（フォーカスが外れた時）に min〜max に収める。空なら直前の値に戻す
 */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  decimals = 0,
  className = "",
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  decimals?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  // フォーカス直後のタップ（mouseup / touchend）で全選択が解除されないようにする
  const justFocused = useRef(false);
  const round = (v: number) => Math.round(v * 10 ** decimals) / 10 ** decimals;
  const clamp = (v: number) => Math.max(min, Math.min(max, round(v)));

  function sanitize(raw: string) {
    let s = toHalfWidth(raw).replace(decimals > 0 ? /[^0-9.]/g : /[^0-9]/g, "");
    if (decimals > 0) {
      const i = s.indexOf(".");
      if (i !== -1) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, decimals);
      if (s.startsWith(".")) s = "0" + s;
    }
    // 先頭の 0 を取る（"0" 単体と "0." は残す）
    s = s.replace(/^0+(?=\d)/, "");
    return s;
  }

  return (
    <input
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      aria-label={ariaLabel}
      value={draft ?? (Number.isFinite(value) ? String(value) : "")}
      onFocus={(e) => {
        setDraft(Number.isFinite(value) ? String(value) : "");
        justFocused.current = true;
        const el = e.currentTarget;
        el.select();
        setTimeout(() => el.select(), 0);
      }}
      onMouseUp={(e) => {
        if (justFocused.current) e.preventDefault();
        justFocused.current = false;
      }}
      onTouchEnd={(e) => {
        if (justFocused.current) {
          e.preventDefault();
          e.currentTarget.select();
        }
        justFocused.current = false;
      }}
      onChange={(e) => {
        const s = sanitize(e.target.value);
        setDraft(s);
        if (s !== "" && s !== "." && Number.isFinite(Number(s))) onChange(Math.min(max, round(Number(s))));
      }}
      onBlur={() => {
        const s = draft ?? "";
        setDraft(null);
        onChange(s === "" || !Number.isFinite(Number(s)) ? clamp(value) : clamp(Number(s)));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      className={className}
    />
  );
}
