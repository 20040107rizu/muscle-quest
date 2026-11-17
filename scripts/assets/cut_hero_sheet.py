"""主人公の体シート（濃紺の背景＋スポットライト、下に文字）から1人ずつ切り出す。
背景は青みがかった暗い色なので、画像の端から「青っぽく暗い」画素を塗りつぶして透過にする。
キャラは黒い輪郭線で囲まれているため、塗りつぶしは輪郭で止まる。
使い方: python3 -I hero_cut.py <sheet.png> <出力フォルダ> <名前の接頭辞> <人数>
"""
import sys
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

src, outdir, prefix, count = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
im = Image.open(src).convert("RGB")
arr = np.array(im).astype(int)
H, W, _ = arr.shape
TEXT_TOP = 700  # これより下は文字なので捨てる
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
lum = (r + g + b) / 3
# 背景らしさ: 青みがある（b が r より大きい）かつ暗い
ratio_px = (b - r) / np.maximum(lum, 1)
# ショーツの範囲（オレンジの腰ゴムの真下130px）は、股の濃い影を背景と誤認しないよう判定を厳しくする
orange_px = (r > 180) & (g < 140) & (b < 90)
shorts_zone = np.zeros((H, W), bool)
for x in range(W):
    oy = np.nonzero(orange_px[:TEXT_TOP, x])[0]
    if len(oy):
        shorts_zone[oy.max():oy.max() + 130, x] = True
# 腰ゴムの左右の列にも少し広げる（股の影は腰ゴムの幅の内側にある）
shorts_zone = np.array(Image.fromarray((shorts_zone * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))) > 0
threshold = np.where(shorts_zone, 0.56, 0.5)
bgish = (ratio_px > threshold) | (lum < 12)

bg = np.zeros((H, W), bool)
q = deque()
for x in range(W):
    for y in (0, TEXT_TOP - 1):
        if bgish[y, x]:
            bg[y, x] = True
            q.append((y, x))
for y in range(TEXT_TOP):
    for x in (0, W - 1):
        if bgish[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        ny, nx = y + dy, x + dx
        if 0 <= ny < TEXT_TOP and 0 <= nx < W and bgish[ny, nx] and not bg[ny, nx]:
            bg[ny, nx] = True
            q.append((ny, nx))
bg[TEXT_TOP:] = True


def components(mask):
    """8近傍の連結成分 → [(面積, 画素リスト)]"""
    seen = np.zeros_like(mask)
    out = []
    for sy, sx in zip(*np.nonzero(mask)):
        if seen[sy, sx]:
            continue
        pts, dq = [], deque([(sy, sx)])
        seen[sy, sx] = True
        while dq:
            cy, cx = dq.popleft()
            pts.append((cy, cx))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        dq.append((ny, nx))
        out.append((len(pts), pts))
    return out


# 腕と胴の間・脚の間に閉じ込められた背景も抜く
for area, pts in components(bgish & ~bg):
    if area < 150:
        continue
    ys, xs = zip(*pts)
    ys, xs = list(ys), list(xs)
    # 背景らしい青みが強い塊だけ（ショーツの影は青みが弱いので残る）
    ratio = ((b[ys, xs] - r[ys, xs]) / np.maximum(lum[ys, xs], 1)).mean()
    if ratio > 0.62:
        bg[ys, xs] = True

fg = ~bg
# 細かいノイズを除去し、輪郭を少しなめらかに
fgimg = Image.fromarray((fg * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
fg = np.array(fgimg) > 0

# 列ごとの前景量から人の区切りを探す
colsum = fg.sum(axis=0)
segs, inside, start = [], False, 0
for x in range(W):
    on = colsum[x] > 3
    if on and not inside:
        inside, start = True, x
    elif not on and inside:
        inside = False
        segs.append((start, x))
if inside:
    segs.append((start, W))
segs = [s for s in segs if s[1] - s[0] > 40]
# つながってしまった場合は、谷で分割
while len(segs) < count:
    widest = max(segs, key=lambda s: s[1] - s[0])
    a, z = widest
    mid = a + (z - a) // 4 + int(np.argmin(colsum[a + (z - a) // 4: z - (z - a) // 4]))
    segs.remove(widest)
    segs += [(a, mid), (mid, z)]
    segs.sort()
print("segments", segs)

alpha = (fg * 255).astype("uint8")
alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.7)))
rgba = np.dstack([np.array(im), alpha])
for i, (x0, x1) in enumerate(segs[:count]):
    # 本体と、本体の2%以上の大きさの塊だけ残す（床の影の点々などを除去）
    comps = components(fg[:, x0:x1])
    biggest = max(a for a, _ in comps)
    sub = np.zeros((H, x1 - x0), bool)
    for area, pts in comps:
        if area >= biggest * 0.02:
            ys_, xs_ = zip(*pts)
            sub[list(ys_), list(xs_)] = True
    # ショーツの裾の欠けを埋める: オレンジの腰ゴムから下の一定範囲で、
    # 左右が暗い色（ショーツ）にはさまれた細い隙間を前景に戻す
    seg = arr[:, x0:x1]
    orange = (seg[..., 0] > 180) & (seg[..., 1] < 140) & (seg[..., 2] < 90) & sub
    orows = np.nonzero(orange.sum(axis=1) > 20)[0]
    if len(orows):
        top = orows.max()
        seglum = seg.mean(axis=2)
        for yy in range(top, min(H, top + 130)):
            row = sub[yy]
            xs_on = np.nonzero(row)[0]
            if len(xs_on) < 2:
                continue
            gaps = np.nonzero(np.diff(xs_on) > 1)[0]
            for gi in gaps:
                a, z = xs_on[gi], xs_on[gi + 1]
                if z - a <= 24 and seglum[yy, a] < 70 and seglum[yy, z] < 70:
                    row[a:z] = True
        # 縦方向: ショーツ（暗い）→ 短い隙間 → 太もも、と続く列の隙間を埋める
        oxs = np.nonzero(orange.any(axis=0))[0]
        for xx in range(oxs.min(), oxs.max() + 1):
            col = sub[top:min(H, top + 160), xx]
            on = np.nonzero(col)[0]
            if len(on) < 2:
                continue
            for gi in np.nonzero(np.diff(on) > 1)[0]:
                a, z = on[gi], on[gi + 1]
                if z - a <= 30 and seglum[top + a, xx] < 70:
                    col[a:z] = True
    ys = np.nonzero(sub.any(axis=1))[0]
    y0, y1 = ys.min(), ys.max() + 1
    crop = rgba[y0:y1, x0:x1].copy()
    crop[..., 3] = np.where(sub[y0:y1], crop[..., 3], 0)
    Image.fromarray(crop).save(f"{outdir}/{prefix}_{i + 1}.png")
    print(prefix, i + 1, x0, y0, x1 - x0, y1 - y0)
