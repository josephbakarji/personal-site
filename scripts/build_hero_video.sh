#!/bin/bash
# Reproducible hero-video pipeline.
#
# Usage:
#   scripts/build_hero_video.sh <SOURCE.mov> [START_SEC] [END_SEC]
#
# Example:
#   scripts/build_hero_video.sh ~/Downloads/IMG_1131.MOV 40 60
#
# Produces:
#   assets/hero/piano.mp4          — H.264 MP4, 720p, audio kept for optional unmute
#   assets/hero/piano.webm         — VP9 WebM, same content, browser fallback
#   assets/hero/piano-poster.jpg   — first-frame poster
#   data/piano-onsets.json         — onset + pitch analysis from librosa
#
# Requires: ffmpeg, python3 with librosa+numpy+soundfile.

set -euo pipefail

SRC="${1:?usage: build_hero_video.sh SOURCE [START END]}"
START="${2:-40}"
END="${3:-60}"
DUR=$(( END - START ))
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUT_DIR="$SITE_DIR/assets/hero"
DATA_DIR="$SITE_DIR/data"
TMP_WAV="$(mktemp -t piano.XXXXXX).wav"

mkdir -p "$OUT_DIR" "$DATA_DIR"

echo "[1/5] Trim + transcode MP4 (H.264, 720p, ${DUR}s from ${START}s)..."
ffmpeg -y -ss "$START" -i "$SRC" -t "$DUR" \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black" \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -preset medium \
  -c:a aac -b:a 96k -movflags +faststart \
  "$OUT_DIR/piano.mp4" 2>&1 | tail -5

echo "[2/5] Transcode WebM (VP9)..."
ffmpeg -y -ss "$START" -i "$SRC" -t "$DUR" \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=black" \
  -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -cpu-used 3 \
  -c:a libopus -b:a 96k \
  "$OUT_DIR/piano.webm" 2>&1 | tail -5

echo "[3/5] Poster frame..."
ffmpeg -y -ss "$START" -i "$SRC" -frames:v 1 -q:v 3 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease" \
  "$OUT_DIR/piano-poster.jpg" 2>&1 | tail -3

echo "[4/5] Extract audio for analysis..."
ffmpeg -y -ss "$START" -i "$SRC" -t "$DUR" -vn -ac 1 -ar 22050 "$TMP_WAV" 2>&1 | tail -3

echo "[5/5] Onset + pitch analysis (librosa)..."
python3 "$SCRIPT_DIR/analyze_onsets.py" \
  --wav "$TMP_WAV" \
  --out "$DATA_DIR/piano-onsets.json" \
  --video piano.mp4 \
  --duration "$DUR"

rm -f "$TMP_WAV"

echo ""
echo "=== Pipeline complete ==="
echo "  MP4:     $OUT_DIR/piano.mp4"
echo "  WebM:    $OUT_DIR/piano.webm"
echo "  Poster:  $OUT_DIR/piano-poster.jpg"
echo "  Onsets:  $DATA_DIR/piano-onsets.json"
ls -lh "$OUT_DIR" "$DATA_DIR/piano-onsets.json"
