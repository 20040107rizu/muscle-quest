"""UIシート（白・黒・透過の背景）から、マス目に並んだ素材を1つずつ切り出す。

使い方: python3 -I scripts/assets/import_ui_grid.py <シート画像> <出力フォルダ> <名前1,名前2,...>
  名前は左上から右へ、次の行へ…の順。「-」は飛ばす。
  画像の端から背景色（白か黒）をたどって透過にし、残った塊を行→列の順に並べて名前を付ける。
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

src, outdir, names = sys.argv[1], sys.argv[2], sys.argv[3].split(",")
os.makedirs(outdir, exist_ok=True)
a = np.array(Image.open(src).convert("RGBA")).astype(np.int16)
H, W = a.shape[:2]
rgb = a[..., :3]
mx, mn = rgb.max(axis=2), rgb.min(axis=2)
alpha = a[..., 3]

# 背景の判定: 透過、または四隅の色（白か黒）に近い無彩色
corner = np.median(np.array([rgb[2, 2], rgb[2, -3], rgb[-3, 2], rgb[-3, -3]]), axis=0)
bright = corner.mean() > 128
near = (np.abs(rgb - corner).max(axis=2) < 28) & (mx - mn < 22)
bgish = (alpha < 20) | near

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

fg = ~bg
# 縁のにじみ: 背景に接する画素は、背景色との差に応じて半透明にする
diff = np.abs(rgb - corner).max(axis=2)
edge_alpha = np.clip(diff / 60.0, 0, 1)
out_alpha = np.where(fg, 255, 0).astype(float)
from PIL import ImageFilter

border = (np.array(Image.fromarray((bg * 255).astype("uint8")).filter(ImageFilter.MaxFilter(3))) > 0) & fg
out_alpha[border] = 255 * edge_alpha[border]
out_alpha = np.minimum(out_alpha, alpha)

# 塊を探す。縁のハイライトで割れないよう、少し太らせた形でまとめる
group = np.array(Image.fromarray((fg * 255).astype("uint8")).filter(ImageFilter.MaxFilter(9))) > 0
lab = np.zeros((H, W), np.int32)
boxes = []
n = 0
for sy, sx in zip(*np.nonzero(group)):
    if lab[sy, sx]:
        continue
    n += 1
    dq = deque([(sy, sx)])
    lab[sy, sx] = n
    ys, xs = [sy], [sx]
    cnt = 0
    while dq:
        y, x = dq.popleft()
        cnt += 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and group[ny, nx] and not lab[ny, nx]:
                lab[ny, nx] = n
                dq.append((ny, nx))
                ys.append(ny)
                xs.append(nx)
    if cnt > H * W * 0.002:
        boxes.append((min(ys), max(ys), min(xs), max(xs), n))

boxes.sort(key=lambda b: (b[0] + b[1]) / 2)
rows, cur = [], [boxes[0]]
for b in boxes[1:]:
    if (b[0] + b[1]) / 2 - (cur[0][0] + cur[0][1]) / 2 < (cur[0][1] - cur[0][0]) * 0.5:
        cur.append(b)
    else:
        rows.append(cur)
        cur = [b]
rows.append(cur)
ordered = [b for r in rows for b in sorted(r, key=lambda b: b[2])]
print("found", len(ordered), "pieces in rows", [len(r) for r in rows])
rgba = np.dstack([a[..., :3], out_alpha]).astype(np.uint8)
for nm, (y0, y1, x0, x1, k) in zip(names, ordered):
    if nm == "-":
        continue
    part = rgba[y0:y1 + 1, x0:x1 + 1].copy()
    part[..., 3] = np.where((lab[y0:y1 + 1, x0:x1 + 1] == k) & fg[y0:y1 + 1, x0:x1 + 1], part[..., 3], 0)
    Image.fromarray(part).save(os.path.join(outdir, f"{nm}.webp"), "WEBP", quality=90, method=6)
    print(nm, x1 - x0 + 1, "x", y1 - y0 + 1)
