# Gluvn: a wearable glove musical instrument

*I've been building these gloves for over a decade now, starting at UC San Diego in 2014 and now at the Music Intelligence Lab at AUB. I've filmed very rough cuts along the way and kept postponing the finished video I'd share with the community. I've finally decided to give up on perfection, so I'm sharing some of these reels here for reference. More details on the current state of the project below.*

<div style="position:relative; padding-bottom:56.25%; height:0; max-width:800px; margin:1.5rem auto;"><iframe src="https://www.youtube.com/embed/rFsVS_Wkfo0" style="position:absolute; top:0; left:0; width:100%; height:100%;" title="Gluvn demo reel" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>

Gluvn, short for glove instrument, is a wearable sensor glove instrument I've been building on and off since 2014. Each finger has a resistive bend/flex sensor and a pressure-sensitive tip, and the palm carries an inertial measurement unit (accelerometer and gyroscope). The readings stream over serial (or Bluetooth in later iterations) to a laptop that maps them to MIDI or OSC control signals routed into a DAW. The vision is to create a new kind of instrument, one that can enable forms of expression unavailable with other digital interfaces. This is also work that fits in the movement-to-music research project at the lab. Of course, this is not entirely new; the idea first appeared in the 1980s with the [DataGlove](https://en.wikipedia.org/wiki/Data_Glove) and has been explored by many others since then, but the design problem is far from solved.

## Some background 

The first prototype came out of a collaboration that started at the [COSMOS](https://cosmos.ucsd.edu/) summer program at UC San Diego in 2014, with people from the music department and the mechanical engineering department where I was doing my MS. When I left for my PhD, I kept iterating on it and ended up using it for my AI course at Stanford, for mapping [gesture to music](https://arxiv.org/abs/2001.09551). It's now one of the ongoing strands of the [Music Intelligence Lab](https://musicintelligencelab.com) at AUB, alongside the [Musical Flow Rope](../projects/#proj-musical-flow-rope) and the [Music in Motion](https://www.josephbakarji.com/articles/?slug=music-in-motion) project. A single glove consists of:

- **Five flex sensors** on the fingers, giving continuous bend readings from full extension to full flexion.
- **An IMU on the palm** (accelerometer + gyroscope), providing orientation (roll, pitch, yaw) and other motion features (like energy, jerk, etc.).
- **A small microcontroller** on the wrist that assembles these into a serial stream. The videos above show the Arduino micro-based early prototypes; the current version, being developed by Hélène Jabbour, a Masters student at the Music Intelligence Lab, uses M5Stack Stick development boards that pack an ESP32, Bluetooth, and a battery in a small package.
- **A Python mapping layer** that turns the sensor data into MIDI notes in real-time.

## The mapping problem

While the hardware is not easy to build and maintain (sensors keep breaking because they're not made for soft materials), the really challenging part is what to map onto what. A 16-dimensional (flex+IMU+pressure) times 2 hands input time series is a high-dimensional continuous signal. How that maps to sound is a complex design task, that has tripped up many others before me. I remember an expert in music tech explicitly advising me to completely drop the project. Everyone tries it and fails. For one, there's no haptic feedback. And for two, there are too many degrees of freedom. That's why this problem is interesting.

One way to do the mapping is to learn it from performance on a piano: a data-driven mapping. Here's a preprint on the approach: [Machine Learning for a Music Glove Instrument](https://arxiv.org/abs/2001.09551) (arXiv:2001.09551, 2020).

Currently, the project has been picked up by Hélène Jabbour, an MS student in Mechanical Engineering at AUB, who is bringing the sensing and mapping stack to a mature, performance-ready version. More on this soon, as we prepare to open source the hardware and software.

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
