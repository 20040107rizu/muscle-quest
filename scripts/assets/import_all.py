"""画像生成AIで作ったシート（A1〜E1）を切り出して public/ に配置する。

使い方: python3 -I scripts/assets/import_all.py <シート画像のフォルダ>
  A1〜A8: 主人公の体     → public/hero/{タイプ}_{段階}.webp
  C1〜C4: 装備アイコン   → public/items/{アイテムID}.webp
  D1〜D3: 演出           → public/fx/*.webp
  E1    : アプリアイコン → public/icons/*.png
その後 scripts/assets/hero_anchors.py で装備の位置を測り直すこと。
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

SRC = sys.argv[1]
ONLY = set(sys.argv[2:])  # シート名を指定するとそのシートだけ処理（例: A1 A2）


def wanted(name):
    return not ONLY or name in ONLY
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
PUB = os.path.join(ROOT, "public")
for d in ("hero", "items", "fx", "icons"):
    os.makedirs(os.path.join(PUB, d), exist_ok=True)


def load(name):
    return np.array(Image.open(os.path.join(SRC, f"{name}.png")).convert("RGBA"))


def components(mask, conn8=True):
    H, W = mask.shape
    lab = np.zeros((H, W), np.int32)
    out = []
    steps = [(1, 0), (-1, 0), (0, 1), (0, -1)] + ([(1, 1), (1, -1), (-1, 1), (-1, -1)] if conn8 else [])
    n = 0
    for sy, sx in zip(*np.nonzero(mask)):
        if lab[sy, sx]:
            continue
        n += 1
        q = deque([(sy, sx)])
        lab[sy, sx] = n
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy, dx in steps:
                ny, nx = y + dy, x + dx
                if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    q.append((ny, nx))
        out.append(pts)
    return lab, out


def remove_checkerboard(a):
    """透過のつもりで描き込まれた白灰のマス目を、画像の端からたどって透明にする"""
    rgb = a[..., :3].astype(int)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    bgish = (mx - mn < 20) & (rgb.mean(axis=2) > 175)
    H, W = bgish.shape
    bg = np.zeros((H, W), bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if bgish[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if bgish[y, x] and not bg[y, x]:
                bg[y, x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and bgish[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    # 光る輪郭（神話段階）の外側に残った、白っぽい淡い画素を背景側から少しずつ削る
    light = (mx - mn < 60) & (rgb.mean(axis=2) > 165)
    for _ in range(14):
        near = np.array(Image.fromarray((bg * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 0
        grow = near & light & ~bg
        if not grow.any():
            break
        bg |= grow
    # 腕と胴の間などに閉じ込められた大きなマス目も抜く
    _, comps = components(bgish & ~bg, conn8=False)
    for pts in comps:
        ys, xs = zip(*pts)
        # 大きいかたまりはどこでも、小さいかたまりは上半身（腕と胴のすき間）だけ抜く（靴底の白は残す）
        if len(pts) > 1500 or (len(pts) > 40 and np.mean(ys) < H * 0.6):
            bg[list(ys), list(xs)] = True
    # 輪郭の白いにじみを1px削る
    bg = np.array(Image.fromarray((bg * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 0
    out = a.copy()
    out[..., 3] = np.where(bg, 0, 255)
    return out


def clean_alpha(a, thr=40):
    """ほぼ透明な画素のゴミ色を消し、孤立した小さな点を除去"""
    out = a.copy()
    m = out[..., 3] > thr
    _, comps = components(m)
    if comps:
        big = max(len(c) for c in comps)
        for pts in comps:
            if len(pts) < max(30, big * 0.002):
                ys, xs = zip(*pts)
                out[list(ys), list(xs), 3] = 0
    out[out[..., 3] <= 8] = 0
    return out


def save_webp(arr, path, max_h=None, max_side=None, q=88):
    im = Image.fromarray(arr)
    if max_h and im.height > max_h:
        im = im.resize((round(im.width * max_h / im.height), max_h), Image.LANCZOS)
    if max_side and max(im.size) > max_side:
        s = max_side / max(im.size)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.save(path, "WEBP", quality=q, method=6)


def crop_alpha(a, pad=0):
    ys, xs = np.nonzero(a[..., 3] > 8)
    y0, y1, x0, x1 = max(0, ys.min() - pad), ys.max() + 1 + pad, max(0, xs.min() - pad), xs.max() + 1 + pad
    return a[y0:y1, x0:x1]


# ---------------- 体 ----------------
BODY = {
    "A1": ("balance", [1, 2, 3, 4, 5, 6]),
    "A2": ("chest", [None, 2, 3, 4, 5, 6]),  # 段階1〜6の6人が描かれていたので1人目は使わない
    "A3": ("back", [2, 3, 4, 5, 6]),
    "A4": ("shoulder", [2, 3, 4, 5, 6]),
    "A5": ("arm", [2, 3, 4, 5, 6]),
    "A6": ("leg", [2, 3, 4, 5, 6]),
    "A7": ("core", [2, 3, 4, 5, 6]),
    "A8": ("runner", [2, 3, 4, 5, 6]),
}


def split_columns(a, n):
    """列ごとの不透明画素数の谷で n 人に分ける"""
    col = (a[..., 3] > 60).sum(axis=0).astype(float)
    W = len(col)
    sm = np.convolve(col, np.ones(9) / 9, mode="same")
    cuts = []
    for k in range(1, n):
        center = W * k / n
        lo, hi = int(center - W / n * 0.4), int(center + W / n * 0.4)
        cuts.append(lo + int(np.argmin(sm[lo:hi])))
    edges = [0] + cuts + [W]
    return [(edges[i], edges[i + 1]) for i in range(n)]


for sheet, (htype, stages) in BODY.items():
    if not wanted(sheet):
        continue
    a = load(sheet)
    if (a[..., 3] < 10).mean() < 0.05:
        a = remove_checkerboard(a)
    a = clean_alpha(a)
    for (x0, x1), st in zip(split_columns(a, len(stages)), stages):
        if st is None:
            continue
        part = a[:, x0:x1].copy()
        # 隣の人の端（細い切れ端）を除去: 一番大きい塊とその近くだけ残す
        m = part[..., 3] > 30
        lab, comps = components(m)
        big = max(comps, key=len)
        keep = np.zeros_like(m)
        for pts in comps:
            if len(pts) >= len(big) * 0.01:
                ys, xs = zip(*pts)
                keep[list(ys), list(xs)] = True
        part[~keep] = 0
        save_webp(crop_alpha(part, 2), os.path.join(PUB, "hero", f"{htype}_{st}.webp"), max_h=640)
        print("hero", f"{htype}_{st}")


# ---------------- グリッド状のシート ----------------
def cut_items(name, n, dilate=15):
    a = clean_alpha(load(name))
    m = a[..., 3] > 30
    big = np.array(Image.fromarray((m * 255).astype("uint8")).filter(ImageFilter.MaxFilter(dilate))) > 0
    lab, comps = components(big)
    comps = sorted(comps, key=len, reverse=True)[:n]
    boxes = []
    for pts in comps:
        ys, xs = zip(*pts)
        boxes.append((min(ys), max(ys), min(xs), max(xs)))
    # 行 → 列 の順に並べる
    boxes.sort(key=lambda b: (b[0] + b[1]) / 2)
    rows, cur = [], [boxes[0]]
    for b in boxes[1:]:
        h = cur[0][1] - cur[0][0]
        if (b[0] + b[1]) / 2 - (cur[0][0] + cur[0][1]) / 2 < h * 0.5:
            cur.append(b)
        else:
            rows.append(cur)
            cur = [b]
    rows.append(cur)
    ordered = [b for r in rows for b in sorted(r, key=lambda b: b[2])]
    out = []
    for y0, y1, x0, x1 in ordered:
        part = a[y0:y1 + 1, x0:x1 + 1].copy()
        sub = lab[y0:y1 + 1, x0:x1 + 1]
        # 自分の塊以外は消す
        ids = np.unique(sub[sub > 0])
        mine = max(ids, key=lambda i: (sub == i).sum())
        part[sub != mine] = 0
        out.append(crop_alpha(part, 1))
    return out


def square(arr, size, fill=0.86):
    im = Image.fromarray(arr)
    s = size * fill / max(im.size)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return np.array(canvas)


ICONS = {
    "C1": ["headband_white", "headband_blue", "headband_black", "headband_red", "crown_gold", "necklace_silver", "necklace_fang", "necklace_gold", "cape_red"],
    "C2": ["cape_black", "cape_gold", "wrist_red", "wrist_black", "wrist_iron", "wrist_gold", "hand_dumbbell", "hand_kettlebell", "belt_leather"],
    "C3": ["belt_champion", "shorts_slime", "shorts_red", "shorts_camo", "shorts_blue", "shorts_pink", "shorts_gold", "shoes_wind", "shoes_rock"],
    "C4": ["shoes_fire", "shoes_gold", "aura_wind", "aura_flame", "aura_purple", "aura_gold"],
}
for sheet, ids in ICONS.items():
    if not wanted(sheet):
        continue
    parts = cut_items(sheet, len(ids), dilate=3 if sheet == "C1" else 15)
    for pid, arr in zip(ids, parts):
        save_webp(square(arr, 160), os.path.join(PUB, "items", f"{pid}.webp"), q=90)
        # 体に重ねる装備は大きめの元画像も保存
        if pid.startswith(("crown", "necklace", "cape", "hand")):
            save_webp(arr, os.path.join(PUB, "items", f"{pid}_wear.webp"), max_side=360, q=90)
    print(sheet, "→", ids)

FX = {
    "D1": ["logo_levelup", "logo_evolution", "logo_critical", "logo_clear", "logo_dungeonclear", "logo_itemget", "logo_newrecord", "logo_miss"],
    "D2": ["chest_closed", "chest_open", "hit", "hit_crit", "slash", "explosion", "rays", "flame", "xp_orb"],
    "D3": ["aura_wind", "aura_flame", "aura_purple", "aura_gold"],
}
for sheet, names in FX.items():
    if not wanted(sheet):
        continue
    parts = cut_items(sheet, len(names), dilate=31 if sheet != "D1" else 21)
    for nm, arr in zip(names, parts):
        save_webp(arr, os.path.join(PUB, "fx", f"{nm}.webp"), max_side=720 if sheet == "D3" else 512, q=86)
    print(sheet, "→", names)

# ---------------- アプリアイコン ----------------
if wanted("E1"):
  icon = Image.open(os.path.join(SRC, "E1.png")).convert("RGB")
  for size, nm in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png")):
      icon.resize((size, size), Image.LANCZOS).save(os.path.join(PUB, "icons", nm))
print("icons done")
