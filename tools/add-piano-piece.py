#!/usr/bin/env python3
"""
Encode a piano video for the /music/ page and (optionally) register it
in data/music.json.

Deals with the mp4 rotation-metadata gotcha:
  1. Reads the source with -noautorotate (ignores any display-matrix
     rotation baked into the file), so we work from the raw pixel frame.
  2. Applies whichever transpose/flip filters the caller asked for.
  3. Encodes to H.264 mp4 with faststart + AAC audio.
  4. Remuxes with -display_rotation:v 0 so browsers can't apply their
     own rotation on playback.

Usage examples:
  # Landscape source, no rotation, register as a piece:
  ./add-piano-piece.py ~/Downloads/foo.mov \\
      --slug piano-foo --title "Foo" --year 2026 \\
      --gol --band-axis y --band-pos 0.60

  # Landscape source recorded with the camera on its side; rotate CW,
  # then flip 180 so hammers play to the right:
  ./add-piano-piece.py ~/Downloads/bar.mov \\
      --slug piano-bar --title "Bar" --year 2026 \\
      --rotate cw --flip 180 \\
      --gol --band-axis x --band-pos 0.42 --band-thick 0.06 --no-flip-cols

  # Just re-encode, don't touch music.json:
  ./add-piano-piece.py foo.mov --slug foo --title Foo --no-register
"""
import argparse
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

SITE_ROOT   = pathlib.Path(__file__).resolve().parent.parent
VIDEO_DIR   = SITE_ROOT / 'assets' / 'music' / 'video'
MUSIC_JSON  = SITE_ROOT / 'data' / 'music.json'


def run(cmd, **kw):
    """Run a subprocess, tee stderr on failure, raise on non-zero."""
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        sys.stderr.write(r.stderr)
        raise RuntimeError(f'command failed: {" ".join(cmd)}')
    return r


def encode(src: pathlib.Path, dst: pathlib.Path, *,
           rotate: str | None, flip: str | None, crop: str | None,
           start: str | None, end: str | None, crf: int) -> None:
    """Encode `src` to a web-safe mp4 at `dst`, with optional rotation/flip/crop/trim."""
    vf = []
    if rotate == 'cw':   vf.append('transpose=1')
    if rotate == 'ccw':  vf.append('transpose=2')
    if rotate == '180':  vf += ['transpose=1', 'transpose=1']
    if flip   == 'h':    vf.append('hflip')
    if flip   == 'v':    vf.append('vflip')
    if flip   == '180':  vf += ['hflip', 'vflip']
    if crop:             vf.append(f'crop={crop}')
    vf_arg   = ['-vf', ','.join(vf)] if vf else []
    trim_in  = ['-ss', start] if start else []
    trim_out = ['-to', end]   if end   else []

    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp:
        tmp_path = pathlib.Path(tmp.name)

    try:
        # First encode: -noautorotate ignores source's display matrix so
        # transpose/flip filters operate on the raw stored pixels.
        # -ss goes AFTER -i for accurate seeking with re-encoding.
        run([
            'ffmpeg', '-y', '-noautorotate',
            '-i', str(src),
            *trim_in, *trim_out,
            *vf_arg,
            '-c:v', 'libx264', '-crf', str(crf), '-preset', 'veryfast',
            '-c:a', 'aac', '-b:a', '128k',
            '-movflags', '+faststart',
            '-map_metadata', '-1', '-map_metadata:s:v', '-1', '-map_metadata:s:a', '-1',
            str(tmp_path),
        ])
        # Second pass: -display_rotation:v 0 on input, -c copy on output.
        # Some ffmpeg/x264 combinations sneak a display matrix into the
        # first output; this remux guarantees the browser plays the raw
        # frame without applying any rotation of its own.
        dst.parent.mkdir(parents=True, exist_ok=True)
        run([
            'ffmpeg', '-y',
            '-display_rotation:v', '0',
            '-i', str(tmp_path),
            '-c', 'copy',
            '-movflags', '+faststart',
            str(dst),
        ])
    finally:
        tmp_path.unlink(missing_ok=True)


def register(section: str, slug: str, title: str, year: int | None, description: str,
             video_rel: str, gol: bool, band_axis: str, band_pos: float,
             band_thick: float, flip_cols: bool) -> None:
    """Insert (or replace) an entry in data/music.json's given section."""
    data = json.loads(MUSIC_JSON.read_text(encoding='utf-8'))
    entry = {
        'id':          slug,
        'title':       title,
        'year':        year,
        'video':       {'type': 'local', 'src': video_rel},
    }
    if description:  # skip the field entirely for empty description
        entry['description'] = description
    if section == 'piano':
        entry['gol'] = gol
        if gol:
            entry['pol'] = {
                'band':     {'axis': band_axis, 'position': band_pos, 'thickness': band_thick},
                'flipCols': flip_cols,
            }
    arr = data.setdefault(section, [])
    # Replace existing entry with the same id, else prepend so newest is on top
    for i, p in enumerate(arr):
        if p.get('id') == slug:
            arr[i] = entry
            break
    else:
        arr.insert(0, entry)
    MUSIC_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('src', type=pathlib.Path, help='source video (mov / mp4 / any ffmpeg-readable)')
    ap.add_argument('--slug',  required=True, help='id and filename stem (kebab-case)')
    ap.add_argument('--title', required=True, help='display title')
    ap.add_argument('--year',  type=int, default=None)
    ap.add_argument('--description', default=None,
                    help='caption; pass "" to leave the entry with no description')

    # Encoding
    ap.add_argument('--rotate', choices=['cw', 'ccw', '180'], help='rotate the raw stored frame')
    ap.add_argument('--flip',   choices=['h', 'v', '180'],    help='mirror the frame after rotation')
    ap.add_argument('--crop',   help='ffmpeg crop filter W:H:X:Y (e.g. "1080:1400:0:0") — applied after rotate/flip')
    ap.add_argument('--start',  help='trim start (ffmpeg timestamp, e.g. "0:07" or "7.5")')
    ap.add_argument('--end',    help='trim end (ffmpeg timestamp, e.g. "4:39" — must be > start)')
    ap.add_argument('--crf',    type=int, default=24, help='x264 quality (lower = larger + better)')
    ap.add_argument('--section', choices=['piano', 'ropeflow'], default='piano',
                    help='which array in music.json to register into')

    # Piano of Life config
    ap.add_argument('--gol',       action='store_true', default=True, help='enable GoL coupling (default: on)')
    ap.add_argument('--no-gol',    dest='gol', action='store_false')
    ap.add_argument('--band-axis', choices=['x', 'y', 'auto'], default='auto',
                    help='"y" for landscape hammer-below-keys, "x" for portrait hammers-in-a-vertical-strip')
    ap.add_argument('--band-pos',  type=float, default=0.60, help='fraction along the OTHER axis (0..1)')
    ap.add_argument('--band-thick',type=float, default=0.05, help='fraction of that axis for band thickness')
    ap.add_argument('--flip-cols',    dest='flip_cols', action='store_true',  default=True,
                    help='map col 0 to bottom of strip (musical convention, landscape default)')
    ap.add_argument('--no-flip-cols', dest='flip_cols', action='store_false',
                    help='map col 0 to top of strip (use with a 180°-flipped portrait)')

    ap.add_argument('--no-register', dest='register', action='store_false', default=True,
                    help="don't touch data/music.json")
    args = ap.parse_args()

    if not args.src.exists():
        sys.exit(f'source not found: {args.src}')

    slug = args.slug.strip().replace(' ', '-').lower()
    dst  = VIDEO_DIR / f'{slug}.mp4'
    print(f'encoding → {dst}')
    encode(args.src, dst,
           rotate=args.rotate, flip=args.flip, crop=args.crop,
           start=args.start, end=args.end, crf=args.crf)

    size_mb = dst.stat().st_size / 1024 / 1024
    print(f'  done ({size_mb:.1f} MB)')

    if args.register:
        # description=None means "use title as fallback"; description=""
        # (explicit empty) means "leave the entry without a caption".
        if args.description is None:
            desc = args.title
        else:
            desc = args.description
        video_rel = f'assets/music/video/{slug}.mp4'
        register(
            section=args.section,
            slug=slug, title=args.title, year=args.year,
            description=desc,
            video_rel=video_rel, gol=args.gol,
            band_axis=args.band_axis, band_pos=args.band_pos, band_thick=args.band_thick,
            flip_cols=args.flip_cols,
        )
        print(f'registered in {MUSIC_JSON.relative_to(SITE_ROOT)} as "{slug}" ({args.section})')
    else:
        print('(skipped music.json update)')


if __name__ == '__main__':
    main()
