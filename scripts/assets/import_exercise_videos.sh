#!/usr/bin/env bash
# 種目のお手本動画（画像生成AIが作った筋肉模型の動画）を軽くして public/exercises/{種目ID}.mp4 に置く。
# 使い方: bash scripts/assets/import_exercise_videos.sh <動画のフォルダ>...
#   ファイル名は「01_bench_press.mp4」のように 番号_種目ID（後ろに余計な語が付いていてもよい）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/public/exercises"
mkdir -p "$OUT"
IDS="bench_press chest_press incline_db_press push_up lat_pulldown seated_row assisted_chin pull_up deadlift squat leg_press leg_extension leg_curl shoulder_press lateral_raise dumbbell_curl triceps_pushdown ab_crunch hanging_leg_raise one_arm_db_row standing_db_press bent_knee_situp floor_crunch twist_crunch front_plank twist_leg_raise seated_knee_up close_grip_bench incline_chest_press cable_crossover dips"
for dir in "$@"; do
  for f in "$dir"/*.mp4 "$dir"/*.mov; do
    [[ -e "$f" ]] || continue
    base="$(basename "$f")"; base="${base%.*}"
    name="${base#[0-9][0-9]_}"
    id=""
    for c in $IDS; do
      if [[ "$name" == "$c" || "$name" == "${c}_"* ]]; then id="$c"; fi
    done
    [[ -z "$id" ]] && { echo "skip $base"; continue; }
    ffmpeg -v error -y -i "$f" -an -vf "scale=432:480:flags=lanczos,fps=24" \
      -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart "$OUT/$id.mp4"
    echo "$id $(stat -c %s "$OUT/$id.mp4")"
  done
done
