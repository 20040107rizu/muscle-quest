"""ボス一覧画像（5段・5/5/5/5/6体）を1体ずつ切り出す。
各キャラの中心から同時に領域を広げ、ぶつかった所で分ける。"""
import sys
from collections import deque

import numpy as np
from PIL import Image

src, outdir = sys.argv[1], sys.argv[2]
arr = np.array(Image.open(src).convert("RGBA"))
mask = arr[..., 3] > 30
H, W = mask.shape
rows_y = [100, 272, 437, 592, 750]
cols = [5, 5, 5, 5, 6]

seeds = []
for r, n in enumerate(cols):
    for c in range(n):
        cx, cy = W / n * (c + 0.5), rows_y[r]
        oy, ox = max(0, int(cy) - 60), max(0, int(cx) - 60)
        ys, xs = np.nonzero(mask[oy:int(cy) + 60, ox:int(cx) + 60])
        k = ((ys + oy - cy) ** 2 + (xs + ox - cx) ** 2).argmin()
        seeds.append((ys[k] + oy, xs[k] + ox))

lab = np.full((H, W), -1, np.int32)
q = deque()
for i, (y, x) in enumerate(seeds):
    lab[y, x] = i
    q.append((y, x))
steps = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1))
while q:
    y, x = q.popleft()
    l = lab[y, x]
    for dy, dx in steps:
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
            lab[ny, nx] = l
            q.append((ny, nx))

# 本体とつながっていない粒（泡・歯車など）は一番近いキャラへ
S = np.array(seeds)
ys, xs = np.nonzero(mask & (lab < 0))
for y, x in zip(ys, xs):
    lab[y, x] = int(((S[:, 0] - y) ** 2 + (S[:, 1] - x) ** 2).argmin())

# 隣のキャラの破片を持ち主に戻す
rgb = arr[..., :3].astype(int)
r_, g_, b_ = rgb[..., 0], rgb[..., 1], rgb[..., 2]
xs_all = np.arange(W)[None, :].repeat(H, 0)
ys_all = np.arange(H)[:, None].repeat(W, 1)
# 四天王の左端に付いたドラゴンの翼（赤いマント以外）
lab[(lab == 23) & (xs_all < 424) & ~(r_ > b_ + 40)] = 22
lab[(lab == 23) & (xs_all < 445) & (b_ >= r_ - 20) & (b_ > g_ + 10)] = 22
# 重装兵の足元に付いた黄緑の切れ端は捨てる
soldier_bottom = ys_all[lab == 13].max()
lab[(lab == 13) & (g_ > b_ + 25) & (ys_all > soldier_bottom - 10)] = -1

for i in range(len(seeds)):
    m = lab == i
    yy, xx = np.nonzero(m)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    # 高さ3px以下の細い切れ端（隣の影など）を除去
    sub = m[y0:y1, x0:x1].copy()
    for yy2 in range(sub.shape[0] - 4, sub.shape[0]):
        row = sub[yy2]
        if row.sum() and not sub[max(0, yy2 - 4):yy2].any(axis=0)[row].any():
            sub[yy2] = False
    # 12px 未満の孤立した点を除去（スライムの泡などは残る大きさ）
    seen = np.zeros_like(sub)
    for sy, sx in zip(*np.nonzero(sub)):
        if seen[sy, sx]:
            continue
        comp, dq = [], deque([(sy, sx)])
        seen[sy, sx] = True
        while dq:
            cy, cx = dq.popleft()
            comp.append((cy, cx))
            for dy, dx in steps:
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < sub.shape[0] and 0 <= nx < sub.shape[1] and sub[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    dq.append((ny, nx))
        if len(comp) < 12:
            for cy, cx in comp:
                sub[cy, cx] = False
    m[y0:y1, x0:x1] = sub
    yy, xx = np.nonzero(m)
    y0, y1, x0, x1 = yy.min(), yy.max() + 1, xx.min(), xx.max() + 1
    crop = arr[y0:y1, x0:x1].copy()
    crop[~m[y0:y1, x0:x1]] = 0
    h, w = crop.shape[:2]
    s = max(h, w) + 8
    canvas = np.zeros((s, s, 4), np.uint8)
    canvas[s - h - 4:s - 4, (s - w) // 2:(s - w) // 2 + w] = crop
    Image.fromarray(canvas).save(f"{outdir}/{i:02d}.png")
    print(i, x0, y0, x1 - x0, y1 - y0)
