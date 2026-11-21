"""体型の絵（1枚に5段階が横に並んだもの）を切り分けて取り込む。

使い方: python3 -I scripts/assets/cut_body_sheets.py <PNGのフォルダ>...
  ファイル名は「01_chest.png」「08_chest_back.png」のように 番号_体型名
  左から 細マッチョ(段階2)〜神話(段階6) の5人を、透明部分の切れ目で切り分ける
出力:
  public/hero/{体型名}_{段階}.webp  （高さ520px）
  src/components/heroAnchors.json   （幅・高さ・体の中心）
  src/components/heroAvailable.json （絵がある体型と段階）
"""
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HERO = os.path.join(ROOT, "public", "hero")
ANCHORS = os.path.join(ROOT, "src", "components", "heroAnchors.json")
AVAIL = os.path.join(ROOT, "src", "components", "heroAvailable.json")
H = 520


def figures(alpha):
    """不透明な列のまとまり（小さすぎるゴミは除く）を左から返す"""
    cols = (alpha > 20).sum(0) > 3
    runs, s = [], None
    for x, v in enumerate(cols):
        if v and s is None:
            s = x
        if not v and s is not None:
            runs.append((s, x - 1))
            s = None
    if s is not None:
        runs.append((s, len(cols) - 1))
    runs = [r for r in runs if r[1] - r[0] > 40]
    # 近すぎるまとまり（体の外の光などで割れたもの）はつなぐ
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 25:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    return merged


anchors = json.load(open(ANCHORS)) if os.path.exists(ANCHORS) else {}
avail = json.load(open(AVAIL)) if os.path.exists(AVAIL) else {}
for d in sys.argv[1:]:
    for f in sorted(glob.glob(os.path.join(d, "*.png"))):
        m = re.match(r"\d+_([a-z_]+)\.png$", os.path.basename(f))
        if not m:
            print("skip", f)
            continue
        t = m.group(1)
        im = Image.open(f).convert("RGBA")
        a = np.array(im)
        a[..., 3] = np.where(a[..., 3] < 12, 0, a[..., 3])
        im = Image.fromarray(a)
        figs = figures(a[..., 3])
        # くっついて描かれた2人は、いちばん幅の広いまとまりを、真ん中付近で一番細いところで分ける
        dens = (a[..., 3] > 20).sum(0)
        while 0 < len(figs) < 5:
            i = max(range(len(figs)), key=lambda k: figs[k][1] - figs[k][0])
            x0, x1 = figs[i]
            lo, hi = x0 + (x1 - x0) // 4, x1 - (x1 - x0) // 4
            cut = lo + int(np.argmin(dens[lo:hi]))
            figs[i : i + 1] = [(x0, cut), (cut + 1, x1)]
        if len(figs) != 5:
            print("!! 5人に分けられない", f, len(figs), figs)
            continue
        for i, (x0, x1) in enumerate(figs):
            part = im.crop((x0, 0, x1 + 1, im.height))
            bbox = part.getchannel("A").getbbox()
            part = part.crop(bbox)
            w = round(part.width * H / part.height)
            part = part.resize((w, H), Image.LANCZOS)
            name = f"{t}_{i + 2}"
            part.save(os.path.join(HERO, f"{name}.webp"), "WEBP", quality=88, method=6)
            al = np.array(part)[..., 3].astype(float)
            cx = float((al.sum(0) * np.arange(w)).sum() / al.sum()) / w
            anchors[name] = {"w": w, "h": H, "cx": round(cx, 3)}
        avail[t] = [2, 3, 4, 5, 6]
        print("ok", t)
avail.setdefault("balance", [1, 2, 3, 4, 5, 6])
json.dump(dict(sorted(anchors.items())), open(ANCHORS, "w"), ensure_ascii=False, indent=1)
json.dump(dict(sorted(avail.items())), open(AVAIL, "w"), ensure_ascii=False, indent=1)
