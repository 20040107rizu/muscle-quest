"""単体で描かれた首の装備（例: タオル）を、バランス型の各段階の首まわりに合わせて装備レイヤーにする。

使い方: python3 -I scripts/assets/place_neck_item.py <装備ID> <画像.png> <首のすき間の左端> <右端> <肩に乗る高さ> <奥側を隠す高さ>
  すき間の左右端・高さは、画像の幅・高さに対する割合（0〜1）。
  首の後ろに回る部分（すき間の間で「奥側を隠す高さ」より上）は透明にする（首に隠れるため）。
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
item, src = sys.argv[1], sys.argv[2]
gap_l, gap_r, sit_y, hide_y = map(float, sys.argv[3:7])

im = Image.open(src).convert("RGBA")
a = np.array(im)
H0, W0 = a.shape[:2]
a[: int(hide_y * H0), int(gap_l * W0): int(gap_r * W0), 3] = 0
ys, xs = np.nonzero(a[..., 3] > 8)
a = a[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
off_x, off_y = xs.min(), ys.min()
item_img = Image.fromarray(a)

anchors = json.load(open(os.path.join(ROOT, "src", "components", "heroAnchors.json")))
layers_path = os.path.join(ROOT, "src", "components", "gearLayers.json")
layers = json.load(open(layers_path))
layers[item] = {}
os.makedirs(os.path.join(ROOT, "public", "gear", item), exist_ok=True)
for st in range(1, 7):
    name = f"balance_{st}"
    an = anchors[name]
    W, H = an["w"], an["h"]
    waist = (an["waistX1"] - an["waistX0"]) * W
    neck = min(max(an["neckW"] * W, waist * 0.4), waist * 0.5)
    # 首のすき間 = 首の太さ × 1.15
    s = neck * 1.15 / ((gap_r - gap_l) * W0)
    w, h = round(item_img.width * s), round(item_img.height * s)
    cx = an["cx"] * W
    gap_cx_img = (gap_l + gap_r) / 2 * W0 - off_x
    x = cx - gap_cx_img * s
    y = an["shoulder"] * H - (sit_y * H0 - off_y) * s
    item_img.resize((w, h), Image.LANCZOS).save(os.path.join(ROOT, "public", "gear", item, f"{name}.webp"), "WEBP", quality=88, method=6)
    layers[item][name] = [round(x, 1), round(y, 1), w, h]
    if st == 3:
        side = int(max(item_img.size) / 0.86)
        c = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        c.alpha_composite(item_img, ((side - item_img.width) // 2, (side - item_img.height) // 2))
        c.resize((160, 160), Image.LANCZOS).save(os.path.join(ROOT, "public", "items", f"{item}.webp"), "WEBP", quality=90)
json.dump(layers, open(layers_path, "w"), indent=0)
print("placed", item)
