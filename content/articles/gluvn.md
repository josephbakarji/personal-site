# Gluvn: a five-finger sensor glove for music

*A reference page for the Gluvn project, with a demo reel and links to the paper. Rough cut for now; will polish over time.*

<div style="position:relative; padding-bottom:56.25%; height:0; max-width:800px; margin:1.5rem auto;"><iframe src="https://www.youtube.com/embed/rFsVS_Wkfo0" style="position:absolute; top:0; left:0; width:100%; height:100%;" title="Gluvn demo reel" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

Gluvn is a wearable five-finger sensor glove instrument I've been building on and off since 2014. Each finger has a bend/flex sensor, and the palm carries an inertial measurement unit (accelerometer plus gyroscope). The readings stream over serial (or Bluetooth in later iterations) to a laptop that maps them to MIDI or OSC control signals routed into a DAW or synth. The idea is a "portable studio", an instrument that carries part of the composition rather than being a neutral controller, so the mapping between hand gesture and sound is itself an artistic choice.

## Origins: COSMOS at UC San Diego, 2014

The first prototype came out of the [COSMOS](https://cosmos.ucsd.edu/) summer program at UC San Diego in 2014. I've kept iterating on it during breaks between other projects since then, and it is now one of the ongoing strands of the [Music Intelligence Lab](https://musicintelligencelab.com) at AUB, alongside the [Musical Flow Rope](../projects/#proj-musical-flow-rope) and the [Music in Motion](https://www.josephbakarji.com/articles/?slug=music-in-motion) project.

## What's on it

- **Five flex sensors** on the fingers, giving continuous bend readings from full extension to full flexion.
- **An IMU on the palm** (accelerometer plus gyroscope), giving hand orientation and motion energy.
- **A small microcontroller** on the wrist that assembles these into a serial stream.
- **A mapping layer** on a laptop that turns the finger positions and hand motion into MIDI notes, continuous MIDI CCs, or OSC messages.

## The mapping problem

The hardware is the easy half. The interesting half is what to map onto what. A five-finger flex vector plus an IMU is a high-dimensional continuous signal; music, as scored, is a mostly discrete grid of events. Every glove instrument ends up making a decision about how to bridge the two, and that decision is what gives it its character. Gluvn's iterations have gone through:

- **Discrete note triggers** on finger-bend thresholds (early prototypes).
- **Chord-shape recognition** on the full finger vector (mid iterations).
- **Continuous expressive mappings** where finger positions drive filter cutoffs, synth parameters, and vocoder controls (recent work).

The machine-learning side of the mapping (from finger-bend sensors to note events) is written up here: [Machine Learning for a Music Glove Instrument](https://arxiv.org/abs/2001.09551) (arXiv:2001.09551, 2020).

## Current work: Hélène Jabbour

The current chapter is being written by **Hélène Jabbour**, an MS student in Mechanical Engineering at AUB, who is bringing the sensing and mapping stack to a mature, performance-ready version. Her thesis focuses on making the glove reliable across users and hand sizes, and on turning the recent expressive-mapping experiments into a stable interface a performer can actually rehearse on.

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
