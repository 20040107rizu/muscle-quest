"""称号素材（MUSCLE_QUEST_title_vfx_100.zip を展開したフォルダ）を取り込む。

使い方: python3 -I scripts/assets/import_titles.py <展開したフォルダ>
  - plates/ effects/ wordmarks/ の PNG（1200×200）を半分の大きさの WebP にして public/titles/ へ
  - asset_index.csv から src/domain/titleDefs.json を作る（称号ID・名前・レア度・条件・推奨プレート/エフェクト）
"""
import csv
import json
import os
import sys

from PIL import Image

src = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out = os.path.join(ROOT, "public", "titles")

rows = list(csv.DictReader(open(os.path.join(src, "asset_index.csv"), encoding="utf-8")))
need = {"plates": {r["defaultPlateId"] for r in rows}, "effects": {r["defaultEffectId"] for r in rows}, "wordmarks": {r["id"] for r in rows}}

total = 0
for sub, ids in need.items():
    os.makedirs(os.path.join(out, sub), exist_ok=True)
    for i in sorted(ids):
        im = Image.open(os.path.join(src, sub, f"{i}.png")).convert("RGBA").resize((600, 100), Image.LANCZOS)
        p = os.path.join(out, sub, f"{i}.webp")
        im.save(p, "WEBP", quality=82, method=6)
        total += os.path.getsize(p)
print("images", sum(len(v) for v in need.values()), "bytes", total)

defs = [
    {
        "id": r["id"],
        "name": r["name"],
        "rarity": r["rarity"],
        "condition": r["condition"],
        "value": float(r["value"]),
        "howToGet": r["how_to_get"],
        "flavor": r["flavor"],
        "theme": r["theme"],
        "plate": r["defaultPlateId"],
        "effect": r["defaultEffectId"],
    }
    for r in rows
]
json.dump(defs, open(os.path.join(ROOT, "src", "domain", "titleDefs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("titles", len(defs))
