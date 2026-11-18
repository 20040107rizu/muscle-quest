"""主人公の体の画像から、装備を重ねるための位置（アンカー）と塗り替え用マスクを作る。

使い方:
  python3 -I scripts/assets/hero_anchors.py            # public/hero/*.webp を全部処理
  python3 -I scripts/assets/hero_anchors.py --debug DIR  # 確認用に印を描いた画像も出す

出力:
  src/components/heroAnchors.json   各画像の頭・首・肩・手首・腰・足の位置（画像の幅・高さに対する割合）
  public/hero/masks/{名前}_shorts.webp / _band.webp / _shoes.webp   ショーツ・腰ゴム・シューズの形（白=その部位）
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HERO = os.path.join(ROOT, "public", "hero")
MASKS = os.path.join(HERO, "masks")
OUT = os.path.join(ROOT, "src", "components", "heroAnchors.json")
debug_dir = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None
os.makedirs(MASKS, exist_ok=True)


def runs(row):
    """True が続く区間 [(開始, 終了)]"""
    xs = np.nonzero(row)[0]
    if len(xs) == 0:
        return []
    out, s = [], xs[0]
    for a, b in zip(xs, xs[1:]):
        if b != a + 1:
            out.append((s, a))
            s = b
    out.append((s, xs[-1]))
    return out


def save_mask(mask, path):
    img = Image.fromarray((mask * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.6))
    img.save(path, "WEBP", quality=80)


def analyze(path):
    name = os.path.splitext(os.path.basename(path))[0]
    a = np.array(Image.open(path).convert("RGBA")).astype(int)
    H, W = a.shape[:2]
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = al > 128
    lum = (r + g + b) / 3
    skin = (r > 140) & (r - b > 35)

    ys = np.nonzero(m.any(axis=1))[0]
    y0 = ys.min()

    # 腰ゴム（オレンジ）: 肌（ピンク・金色）と区別するため、赤みと彩度が強いものだけ
    orange = m & (r > 190) & (g > 60) & (g < 150) & (b < 90) & (r - g > 85) & (g - b > 20)
    orange[int(0.6 * H):] = False  # シューズのオレンジは除く
    counts = orange.sum(axis=1)
    orows = np.nonzero(counts > 8)[0]
    # 連続した行のかたまりのうち、いちばん画素が多いものを腰ゴムとする
    blocks, cur = [], [orows[0]]
    for y in orows[1:]:
        if y - cur[-1] <= 2:
            cur.append(y)
        else:
            blocks.append(cur)
            cur = [y]
    blocks.append(cur)
    blk = max(blocks, key=lambda bl: counts[bl].sum())
    wb_top, wb_bot = blk[0], blk[-1]
    orange[: wb_top] = False
    orange[wb_bot + 1:] = False
    ox = np.nonzero(orange.any(axis=0))[0]
    wb_x0, wb_x1 = ox.min(), ox.max()
    cx = (wb_x0 + wb_x1) / 2

    # 行ごとの幅
    def width(y):
        xs = np.nonzero(m[y])[0]
        return (xs.max() - xs.min()) if len(xs) else 0

    # 首: 頭の下で一番細い行。肩: 首より下で急に幅が広がる行
    lo, hi = int(y0 + 0.08 * H), int(y0 + 0.18 * H)
    neck_y = lo + int(np.argmin([width(y) for y in range(lo, hi)]))
    forehead_y = int(y0 + 0.42 * (neck_y - y0))
    head_w = width(forehead_y)
    sh_y = next((y for y in range(neck_y, wb_top) if width(y) > 2.4 * width(neck_y)), neck_y + int(0.03 * H))
    shoulder_w = width(min(H - 1, sh_y + int(0.025 * H)))

    # ショーツ（腰ゴムの下の暗い紺色）: 金色のオーラや肌の影（暖色）は除く
    zone = np.zeros_like(m)
    zone[wb_bot:min(H, int(wb_bot + 0.24 * H)), max(0, int(wb_x0 - 0.06 * W)):int(wb_x1 + 0.06 * W)] = True
    shorts = m & zone & (lum < 95) & ~skin & (b >= r - 12)
    # 細かい点を除き、少しだけ広げて境目をなじませる
    shorts = np.array(Image.fromarray((shorts * 255).astype("uint8")).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))) > 0
    # 裾: ショーツの幅が腰ゴムの半分を下回った行（股の影まで含めない）
    half = 0.5 * (wb_x1 - wb_x0)
    wide = [y for y in range(wb_bot, min(H, int(wb_bot + 0.24 * H))) if shorts[y].sum() > half]
    hem_y = max(wide) if wide else int(wb_bot + 0.17 * H)
    shorts[hem_y + 3:] = False
    band = orange.copy()
    feet_top = int(H - 0.11 * H)
    shoes = np.zeros_like(m)
    # 靴: 肌以外の暗い部分とオレンジのライン。神話段階の金色のオーラ（明るい黄色）は除く
    glowish = (r > 150) & (g > 120) & (b < 140)
    shoe_px = m & ~skin & ((lum < 110) | ((r > 180) & (g < 140))) & ~glowish
    shoes[feet_top:] = shoe_px[feet_top:]
    fy = np.nonzero(shoes.any(axis=1))[0]

    # 手首: ショーツより外側にある「肌色の区間」を腕としてたどり、拳の上のくびれを探す
    skin2 = m & (r > 120) & (r - b > 25)

    def wrist(side):
        # 腰ゴム〜ショーツの裾の高さで、ショーツ以外の肌色は「腕と拳」だけ。その一番下が拳
        y_lo, y_hi = int(wb_top - 0.12 * H), int(hem_y - 0.015 * H)
        band_skin = np.zeros_like(m)
        band_skin[y_lo:y_hi] = skin2[y_lo:y_hi] & ~shorts[y_lo:y_hi]
        xs_all = np.arange(W)[None, :]
        band_skin &= (xs_all < cx - 0.12 * W) if side == "L" else (xs_all > cx + 0.12 * W)
        ys_ = np.nonzero(band_skin.any(axis=1))[0]
        if not len(ys_):
            return None
        fist_bottom = ys_.max()
        fist_rows = band_skin[int(fist_bottom - 0.045 * H):fist_bottom + 1]
        fxs = np.nonzero(fist_rows.any(axis=0))[0]
        fx = (fxs.min() + fxs.max()) / 2
        wy = int(fist_bottom - 0.075 * H)
        # 手首の高さで、拳の真上にある肌の区間の幅
        rs = runs(skin2[wy])
        seg = min(rs, key=lambda s_: abs((s_[0] + s_[1]) / 2 - fx)) if rs else (int(fx - 0.03 * W), int(fx + 0.03 * W))
        return {
            "x": round(float((seg[0] + seg[1]) / 2 / W), 4),
            "y": round(float(wy / H), 4),
            "w": round(float((seg[1] - seg[0] + 1) / W), 4),
            "fistX": round(float(fx / W), 4),
            "fistY": round(float((fist_bottom - 0.025 * H) / H), 4),
        }

    wl, wr = wrist("L"), wrist("R")

    save_mask(shorts, os.path.join(MASKS, f"{name}_shorts.webp"))
    save_mask(band, os.path.join(MASKS, f"{name}_band.webp"))
    save_mask(shoes, os.path.join(MASKS, f"{name}_shoes.webp"))

    anchors = {
        "w": W,
        "h": H,
        "cx": round(float(cx / W), 4),
        "headTop": round(float(y0 / H), 4),
        "forehead": round(float(forehead_y / H), 4),
        "headW": round(float(head_w / W), 4),
        "neck": round(float(neck_y / H), 4),
        "neckW": round(float(width(neck_y) / W), 4),
        "shoulder": round(float(sh_y / H), 4),
        "shoulderW": round(float(shoulder_w / W), 4),
        "waistTop": round(float(wb_top / H), 4),
        "waistBottom": round(float(wb_bot / H), 4),
        "waistX0": round(float(wb_x0 / W), 4),
        "waistX1": round(float(wb_x1 / W), 4),
        "hem": round(float(hem_y / H), 4),
        "feetTop": round(float((fy.min() if len(fy) else feet_top) / H), 4),
        "wristL": wl,
        "wristR": wr,
    }

    if debug_dir:
        im = Image.open(path).convert("RGBA")
        bg = Image.new("RGBA", im.size, (40, 90, 50, 255))
        bg.alpha_composite(im)
        d = ImageDraw.Draw(bg)
        d.line([(0, forehead_y), (W, forehead_y)], fill=(255, 0, 255), width=2)
        d.line([(cx - head_w / 2, forehead_y + 4), (cx + head_w / 2, forehead_y + 4)], fill=(255, 255, 0), width=2)
        d.line([(0, neck_y), (W, neck_y)], fill=(0, 255, 255), width=1)
        d.line([(0, sh_y), (W, sh_y)], fill=(0, 128, 255), width=1)
        d.rectangle([wb_x0, wb_top, wb_x1, wb_bot], outline=(255, 0, 0), width=2)
        d.line([(0, hem_y), (W, hem_y)], fill=(255, 128, 0), width=1)
        for wv in (wl, wr):
            if wv:
                x, y, w = wv["x"] * W, wv["y"] * H, wv["w"] * W
                d.line([(x - w / 2, y), (x + w / 2, y)], fill=(255, 0, 0), width=3)
                d.ellipse([wv["fistX"] * W - 4, wv["fistY"] * H - 4, wv["fistX"] * W + 4, wv["fistY"] * H + 4], outline=(255, 255, 255), width=2)
        tint = np.array(bg)
        for mk, col in ((shorts, (255, 0, 0)), (shoes, (0, 120, 255))):
            tint[mk, :3] = (tint[mk, :3] * 0.5 + np.array(col) * 0.5).astype("uint8")
        Image.fromarray(tint).save(os.path.join(debug_dir, f"{name}.png"))
    return name, anchors


result = {}
for p in sorted(glob.glob(os.path.join(HERO, "*.webp"))):
    n, an = analyze(p)
    result[n] = an
    print(n, "wristL" if an["wristL"] else "NO wristL", "wristR" if an["wristR"] else "NO wristR")
with open(OUT, "w") as f:
    json.dump(result, f, ensure_ascii=False, indent=1)
print("wrote", OUT)
