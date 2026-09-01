# Gluvn — a five-finger sensor glove for music

*A first pass. The videos below are a mix of polished excerpts, quick demos, and unedited experiments that I'll trim and re-caption over time.*

Gluvn is a wearable glove instrument I've been building on and off since 2019. Each finger carries a bend/flex sensor and the palm carries an IMU; the readings stream to a laptop that maps them to musical control signals over MIDI or OSC. The idea is to build a "portable studio" — an instrument that carries part of the composition rather than being a neutral controller, so the mapping between hand gesture and sound is itself an artistic choice.

## A polished excerpt (2024)

<video src="../assets/music/video/gluvn/gluvn-ideas-2024.mp4" controls playsinline preload="metadata" style="width:100%; max-width:800px; display:block; margin: 1.5rem auto;"></video>

## With Jacob (choir)

<video src="../assets/music/video/gluvn/jacob-choir.mp4" controls playsinline preload="metadata" style="width:100%; max-width:400px; display:block; margin: 1.5rem auto;"></video>

## Acceleration demo

*Raw IMU acceleration driving the mapping. Full-length; will trim to the interesting stretch.*

<video src="../assets/music/video/gluvn/accel-demo.mp4" controls playsinline preload="metadata" style="width:100%; max-width:400px; display:block; margin: 1.5rem auto;"></video>

## Early narrated demo

*From an earlier iteration; I talk through the design in the first minute or so.*

<video src="../assets/music/video/gluvn/gluvn-early-demo.mp4" controls playsinline preload="metadata" style="width:100%; max-width:800px; display:block; margin: 1.5rem auto;"></video>

## Vocoder mode (reference)

*Rough visual quality; kept here mostly as a reference for students working on similar mappings.*

<video src="../assets/music/video/gluvn/gluvn-vocoder.mp4" controls playsinline preload="metadata" style="width:100%; max-width:800px; display:block; margin: 1.5rem auto;"></video>

## References

The ML side of the mapping (from finger-bend sensors to note events) is written up here: [Machine Learning for a Music Glove Instrument](https://arxiv.org/abs/2001.09551) (arXiv:2001.09551, 2020).

## Cite

```bibtex
@misc{bakarji2020gluvn,
  title        = {Machine Learning for a Music Glove Instrument},
  author       = {Bakarji, Joseph},
  year         = {2020},
  eprint       = {2001.09551},
  archivePrefix= {arXiv},
  primaryClass = {cs.SD},
  url          = {https://arxiv.org/abs/2001.09551}
}
```
