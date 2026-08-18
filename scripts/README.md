# Site scripts

## `notebook_to_article.py` — Jupyter notebook to markdown article

Converts a `.ipynb` (local path or URL) into an article at
`content/articles/<slug>.md`, extracting embedded output images to
`content/articles/<slug>_files/` and rewriting image paths so they resolve
when the article is served.

Basic use (notebook already has executed outputs):
```bash
scripts/notebook_to_article.py path/to/notebook.ipynb my-slug \
  --title "My Article Title"
```

From a URL, executing the notebook to generate plots:
```bash
scripts/notebook_to_article.py \
  https://raw.githubusercontent.com/.../nb.ipynb my-slug \
  --execute --kernel python3 --title "My Title"
```

Overwrite an existing article: `--force`.

The generated markdown uses `$$...$$` for all math so the site's KaTeX
renderer picks it up consistently. Add the article's metadata to
`data/articles.json` manually, or edit it in the admin at
`/admin/`.

Adapted from
`~/Documents/01-teaching/ml4science/scripts/convert_notebook.py`.

---

# Hero-video pipeline

Reproducible pipeline for turning a piano video into landing-page assets:
- transcoded web-friendly MP4 + WebM
- poster frame
- JSON of note onsets + dominant pitches (for animation sync)

## One-shot build

```bash
cd personal-site
scripts/build_hero_video.sh ~/Downloads/IMG_1131.MOV 40 60
```

Arguments: `<source> <start_sec> <end_sec>`.

## Outputs

```
assets/hero/piano.mp4          H.264 720p, ~5-10 MB for 20s, audio kept
assets/hero/piano.webm         VP9 fallback
assets/hero/piano-poster.jpg   first-frame poster
data/piano-onsets.json         onset + pitch analysis
```

## When you record a new video

1. Drop it anywhere (Downloads is fine).
2. `scripts/build_hero_video.sh <path> <start> <end>` — this overwrites the assets.
3. Reload the landing page. The animation picks up the new onsets automatically.

## Dependencies

- `ffmpeg` (H.264, VP9, opus/aac encoders)
- `python3` with `librosa`, `numpy`, `soundfile` (installed globally)

## Tuning the onset detector

Edit `analyze_onsets.py` — the librosa parameters (`delta`, `pre_avg`, etc.)
control sensitivity. Lower `delta` → more onsets. Print onset count and pitch
range on stdout when the script finishes.

## What the JSON looks like

```json
{
  "video": "piano.mp4",
  "duration": 20.0,
  "sr": 22050,
  "onsets": [
    {"t": 0.523, "midi": 60, "note": "C4", "confidence": 0.87},
    {"t": 0.712, "midi": 64, "note": "E4", "confidence": 0.92}
  ]
}
```

`t` is time in seconds relative to segment start. `midi` is 21–108 (piano
range). `confidence` is proportion of energy at the dominant bin — treat as a
rough magnitude, not a probability.
