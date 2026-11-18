"""装備を描き足したシート（例: H01_A1.png）から、元の体シート（A1.png）との差分で装備だけを切り出す。

使い方:
  python3 -I scripts/assets/import_gear.py <体シートA1〜A8のフォルダ> <装備シートのフォルダ> [<装備シートのフォルダ> ...]

出力:
  public/gear/{装備ID}/{体の画像名}.webp   主人公の画像（public/hero/{体の画像名}.webp）と同じ縮尺の装備レイヤー
  public/items/{装備ID}.webp                装備アイコン（段階3のレイヤーから自動作成）
  src/components/gearLayers.json           各レイヤーの位置 [x, y, 幅, 高さ]（主人公の画像のピクセル単位）

体に隠れる部分（マントの後ろ側など）は元から描かれていないので、レイヤーは全部体の前に重ねればよい。
"""
import ast
import glob
import json
import os
import re
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUB = os.path.join(ROOT, "public")
BOX_CACHE = os.path.join(os.path.dirname(__file__), "hero_boxes.json")
LAYERS_JSON = os.path.join(ROOT, "src", "components", "gearLayers.json")

# import_all.py の切り出し関数を使い回す（同じ手順で体の切り出し位置を再現するため）
_src = open(os.path.join(os.path.dirname(__file__), "import_all.py")).read()
_mod = ast.parse(_src)
_ns = {"np": np, "Image": Image, "ImageFilter": ImageFilter, "os": os}
exec("from collections import deque", _ns)
exec(compile(ast.Module([n for n in _mod.body if isinstance(n, ast.FunctionDef) or (isinstance(n, ast.Assign) and any(getattr(t, "id", "") == "BODY" for t in n.targets))], []), "import_all", "exec"), _ns)
BODY = _ns["BODY"]

args = sys.argv[1:]
ONLY = None
if "--only" in args:
    i = args.index("--only")
    ONLY = set(args[i + 1].split(","))
    args = args[:i] + args[i + 2:]
sheets_dir = args[0]
gear_dirs = args[1:]
# 描き足しがごく淡い装備（チョークの粉など）は判定をゆるくする: (強い差分のしきい値, 最小の塊の大きさ)
FAINT = {"A07": (16, 15)}


def hero_boxes(sheet):
    """体シートの各人物について、主人公画像の切り出し位置（シート座標）と縮尺"""
    cache = json.load(open(BOX_CACHE)) if os.path.exists(BOX_CACHE) else {}
    if sheet in cache:
        return cache[sheet]
    htype, stages = BODY[sheet]
    a = np.array(Image.open(os.path.join(sheets_dir, f"{sheet}.png")).convert("RGBA"))
    if (a[..., 3] < 10).mean() < 0.05:
        a = _ns["remove_checkerboard"](a)
    a = _ns["clean_alpha"](a)
    out = []
    for (x0, x1), st in zip(_ns["split_columns"](a, len(stages)), stages):
        if st is None:
            continue
        part = a[:, x0:x1].copy()
        m = part[..., 3] > 30
        _, comps = _ns["components"](m)
        big = max(comps, key=len)
        keep = np.zeros_like(m)
        for pts in comps:
            if len(pts) >= len(big) * 0.01:
                ys, xs = zip(*pts)
                keep[list(ys), list(xs)] = True
        ys, xs = np.nonzero(keep)
        bx0, by0 = max(0, xs.min() - 2) + x0, max(0, ys.min() - 2)
        bx1, by1 = xs.max() + 1 + 2 + x0, ys.max() + 1 + 2
        name = f"{htype}_{st}"
        hw, hh = Image.open(os.path.join(PUB, "hero", f"{name}.webp")).size
        out.append({"name": name, "col": [int(x0), int(x1)], "box": [int(bx0), int(by0), int(bx1), int(by1)], "scale": hh / (by1 - by0), "heroW": hw, "heroH": hh})
    cache[sheet] = out
    json.dump(cache, open(BOX_CACHE, "w"), indent=1)
    return out


def components(mask):
    return _ns["components"](mask)[1]


layers = json.load(open(LAYERS_JSON)) if os.path.exists(LAYERS_JSON) else {}
files = sorted(f for d in gear_dirs for f in glob.glob(os.path.join(d, "**", "*.png"), recursive=True))
for f in files:
    m = re.match(r"([A-Z]\d\d)_(A\d)\.png$", os.path.basename(f))
    if not m:
        continue
    item, sheet = m.group(1), m.group(2)
    if ONLY and item not in ONLY:
        continue
    thr, min_area = FAINT.get(item, (40, 60))
    def flat(im):
        """透過部分を黒として合成した RGB（透明な画素の中身の色に左右されないように）"""
        a = np.array(im.convert("RGBA")).astype(np.int16)
        return (a[..., :3] * a[..., 3:4] // 255).astype(np.int16), a[..., 3]

    ref, _ = flat(Image.open(os.path.join(sheets_dir, f"{sheet}.png")))
    img = Image.open(f)
    if img.size != (ref.shape[1], ref.shape[0]):
        print("SKIP size differs", os.path.basename(f), img.size)
        continue
    eq, eq_alpha = flat(img)
    d = np.abs(eq - ref).max(axis=2)
    strong = d > thr
    # 小さなノイズを除いた「確かに描き足された」部分
    if item in FAINT:
        # 粉のような細かい点は、つなげてから塊として扱う
        strong = np.array(Image.fromarray((strong * 255).astype("uint8")).filter(ImageFilter.MaxFilter(5))) > 0
    else:
        strong = np.array(Image.fromarray((strong * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    keep = np.zeros_like(strong)
    for pts in components(strong):
        if len(pts) >= min_area:
            ys, xs = zip(*pts)
            keep[list(ys), list(xs)] = True
    near = np.array(Image.fromarray((keep * 255).astype("uint8")).filter(ImageFilter.MaxFilter(7))) > 0
    lo = min(12, thr * 0.5)
    alpha = np.clip((d.astype(float) - lo) / (thr - lo), 0, 1) * near
    alpha = alpha * (eq_alpha / 255.0)
    color = np.array(img.convert("RGB"))
    rgba = np.dstack([color, (alpha * 255).astype(np.uint8)])

    boxes = hero_boxes(sheet)
    centers = [((b["col"][0] + b["col"][1]) / 2) for b in boxes]
    owner = np.full(d.shape, -1, int)
    for pts in components(alpha > 0.05):
        ys, xs = zip(*pts)
        k = int(np.argmin([abs(np.mean(xs) - c) for c in centers]))
        owner[list(ys), list(xs)] = k
    os.makedirs(os.path.join(PUB, "gear", item), exist_ok=True)
    for k, b in enumerate(boxes):
        mk = owner == k
        if not mk.any():
            continue
        ys, xs = np.nonzero(mk)
        lx0, ly0, lx1, ly1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        part = rgba[ly0:ly1, lx0:lx1].copy()
        part[..., 3] = np.where(mk[ly0:ly1, lx0:lx1], part[..., 3], 0)
        s = b["scale"]
        w, h = max(1, round((lx1 - lx0) * s)), max(1, round((ly1 - ly0) * s))
        Image.fromarray(part).resize((w, h), Image.LANCZOS).save(os.path.join(PUB, "gear", item, f"{b['name']}.webp"), "WEBP", quality=62, alpha_quality=55, method=6)
        layers.setdefault(item, {})[b["name"]] = [round((lx0 - b["box"][0]) * s, 1), round((ly0 - b["box"][1]) * s, 1), w, h]
        # アイコン: 段階3（なければ最初の人）のレイヤーを正方形に
        if b["name"] in ("balance_3",) or not os.path.exists(os.path.join(PUB, "items", f"{item}.webp")):
            im = Image.fromarray(part)
            side = int(max(im.size) / 0.86)
            canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            canvas.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
            canvas.resize((160, 160), Image.LANCZOS).save(os.path.join(PUB, "items", f"{item}.webp"), "WEBP", quality=90)
    print(item, sheet, "ok")

json.dump(layers, open(LAYERS_JSON, "w"), indent=0)
print("layers:", len(layers))
