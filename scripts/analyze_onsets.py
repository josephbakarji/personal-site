#!/usr/bin/env python3
"""
Analyze piano audio → onset times + dominant pitches → JSON.

Uses librosa's onset detector with CQT-based dominant-pitch estimation at each
onset. Piano is polyphonic; we report the loudest bin as a proxy for the row a
piano-roll bar should live in on the animation. Confidence is the normalized
peak magnitude.

Usage:
    analyze_onsets.py --wav path.wav --out out.json --video piano.mp4 --duration 20
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import librosa
import numpy as np


def analyze(wav_path: Path, sr: int = 22050):
    y, sr = librosa.load(str(wav_path), sr=sr, mono=True)

    # Onset detection
    onset_frames = librosa.onset.onset_detect(
        y=y, sr=sr, backtrack=True, units='frames',
        pre_max=20, post_max=20, pre_avg=100, post_avg=100, delta=0.07, wait=5,
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    # CQT for pitch estimation. Piano range: A0 (21) to C8 (108).
    n_bins = 88
    fmin = librosa.midi_to_hz(21)  # A0
    hop_length = 512
    C = np.abs(librosa.cqt(
        y=y, sr=sr,
        fmin=fmin,
        n_bins=n_bins,
        bins_per_octave=12,
        hop_length=hop_length,
    ))
    # Normalize per-frame so peak magnitudes are comparable
    C_norm = C / (C.max(axis=0, keepdims=True) + 1e-9)

    onsets = []
    for t in onset_times:
        frame = int(round(t * sr / hop_length))
        # small window around the onset
        lo = max(0, frame - 1)
        hi = min(C.shape[1], frame + 4)
        window = C[:, lo:hi].sum(axis=1)
        if window.max() < 1e-6:
            continue
        peak_bin = int(np.argmax(window))
        midi = 21 + peak_bin  # A0 = 21
        confidence = float(window[peak_bin] / (window.sum() + 1e-9))
        note_name = librosa.midi_to_note(midi)
        onsets.append({
            't': round(float(t), 4),
            'midi': int(midi),
            'note': note_name,
            'confidence': round(confidence, 3),
        })

    return {
        'duration': round(float(len(y) / sr), 3),
        'sr': int(sr),
        'onsets': onsets,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--wav', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--video', default='piano.mp4')
    ap.add_argument('--duration', type=float, default=None,
                    help='segment duration (for meta only)')
    args = ap.parse_args()

    result = analyze(args.wav)
    result['video'] = args.video
    if args.duration is not None:
        result['segment_duration'] = args.duration

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2))

    n = len(result['onsets'])
    d = result['duration']
    print(f"  {n} onsets over {d:.2f}s ({n/d:.1f}/s avg)")
    if n:
        midis = [o['midi'] for o in result['onsets']]
        print(f"  pitch range: MIDI {min(midis)}–{max(midis)} "
              f"({librosa.midi_to_note(min(midis))}–{librosa.midi_to_note(max(midis))})")


if __name__ == '__main__':
    main()
