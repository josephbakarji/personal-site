# Piano of Life: A Piano Video Triggered Game of Life

What would be a good representation of the various projects I like to work on. How about I combine two of my passions: 1. discovering patterns in complex systems and simulating them. The game of life is a good toy representaiton of that. 2. Playing the piano and discovery new sounds. 

So here's a short experiment where a piano video seeds a Game of Life whose column density becomes a live spectral filter over the piano's own audio. The whole thing runs in a browser, has no dependencies beyond vanilla JavaScript, Canvas 2D, and Web Audio, and works on any top-down piano video. Fork the code on github: [github.com/josephbakarji/piano-of-life](https://github.com/josephbakarji/piano-of-life). If you want to play with it now: **[open the standalone](https://josephbakarji.github.io/piano-of-life)**, drop in a video, click *GoL filter: OFF* to turn it *ON*, and unmute the video.

## The pipeline

### 1. Luminance detection at a thin band

The video is a top-down view of my upright piano. The main assumption is that the hammers are going down when triggering the strings. When a key is pressed, the corresponding hammer rotates about a pivot below the frame; its felt tip travels down toward the strings. Motion, viewed from directly above, is small but the *interface* between the bright felt and the darker mechanism is what is being captured.

That interface is the observable. Position a thin horizontal band across the video at the resting-felt-tip line. Split the band into $N$ uniform columns. Each frame, compute the per-column mean luminance:

$$\mu_c(t) \;=\; \frac{1}{|B_c|} \sum_{(x,y)\in B_c} Y(x, y, t)$$

where $B_c$ is the band-column strip and $Y(x, y, t) = 0.299 R + 0.587 G + 0.114 B$ is Rec. 601 luma. Frame-over-frame signed change,

$$\Delta \mu_c(t) \;=\; \mu_c(t) - \mu_c(t - \delta t),$$

tells you two directions independently: $\Delta \mu_c < 0$ means the band *darkened* at column $c$ (felt tip left the band, moving up — **strike**); $\Delta \mu_c > 0$ means the band *brightened* (felt returned into the band — **return**). A discrete hit at column $c$ fires when $|\Delta \mu_c|$ exceeds a threshold $\tau$, the sign matches your chosen direction, and no hit has fired at column $c$ in the last $\Delta_c$ milliseconds (per-column cooldown).

That's the whole detector. It works because the geometry of the observable does the work. This is a lazy implementation that doesn't segment the hammers themselves but would work across videos with the same nature. Please do extend it to hammer segmentation if you're interested. The advantage is that anything with a well-defined bright/dark interface that moves cyclically will produce clean hits: mallets on a marimba, drumsticks on a snare, keys on a keyboard, feet on a treadmill. The Game of Life would still work.

### 2. Shaded Game of Life

Each hit falls a piano-roll-like bar into the GoL zone. When it arrives, it seeds a small cluster ($k$ cells wide by $k$ tall, $k$ growing with hit strength) at that column, high in the grid. Standard Conway rules run at around 6 Hz: live with 2 or 3 neighbors, born on exactly 3, else dead.

The twist is a per-cell alpha $\alpha_{ij} \in [0, 1]$ carrying "recency":

$$\alpha_{ij}(t+1) \;=\; \begin{cases}
1 & \text{if newly born} \\
\max(\alpha_{ij}(t), 0.9) & \text{if alive and survives} \\
0.55 \cdot \alpha_{ij}(t) & \text{if died this tick}
\end{cases}$$

Newly-alive cells snap to full alpha, cells alive for a while hold near 1, cells that just died fade slowly. The rendered grid is a continuous texture rather than binary on/off — perceptually closer to what you'd expect a "state" to look like, and it makes the spectral filter behave more musically because bands don't cut off the instant a cell dies.

### 3. Column PMF as a spectral shape

The GoL grid has columns. If you sum the shaded alpha down each column, you get a distribution (call it $\pi_c$) that changes over time as the GoL evolves. This is the moment the piece I like about this project happens: **the same axis** the detector used to place hits, and the GoL uses to lay out cells, becomes a **frequency axis** for the filter. Column $c$ maps to a filter band $b_c$, with center frequency log-spaced between $f_\min$ and $f_\max$ (defaults A2 = 110 Hz to C7 = 2093 Hz across 32 bands):

$$f(b) \;=\; f_\min \left( \frac{f_\max}{f_\min} \right)^{b / (B - 1)}$$

Each band's normalized weight is

$$w_b \;=\; \frac{\sum_{c \in b} \pi_c}{\max_{b'} \sum_{c' \in b'} \pi_{c'}} \cdot 0.9,$$

and each band's gain smoothly follows $w_b$ with an 80 ms time constant so the filter doesn't zipper.

### 4. Applying the filter

The piano's own audio is routed through Web Audio via `MediaElementAudioSource`. Each of the 32 bandpass filters (Q ≈ 9) receives the full signal in parallel; each has its own gain node driven by $w_b$; the outputs sum through a wet mix. A dry path sums in a scaled copy of the raw signal for reference. The piano still sounds like a piano; but its *timbre* — which partials are prominent — is now shaped by the current GoL state. Where the GoL has developed structure in some column range, the corresponding piano frequencies bloom. A drifting glider walks a formant across the piano's range. A blob-oscillator holds a resonance. A stable still-life bakes in a fixed vowel-like coloration.

## Why it's a nice representation of a framework I've been thinking about

If you buy that intelligence is best modeled not as a static map from input to output but as a cycle in which the outputs of one boundary (action) flow back to become the inputs of another (perception), and if you buy that objects, including individuals, are the stable attractors of such cycles rather than their substrate, then this toy is an analogous instance of this idea. The Game of Life is a substrate on which the pianist's actions leave a trace that persists after the strike ends. The filter is what happens when the substrate reasserts itself in the source's own medium. And every stable Game of Life pattern (glider, blinker, block) is a candidate "identity" for the system: a fixed spectral color it will impose on the piano until something perturbs it. Ok, it's a bit far fetched, but at least it's fun to watch.

## Try it

**[Open the standalone tool →](https://josephbakarji.github.io/piano-of-life)**

Drop in a top-down piano video. Adjust the band Y until the gold band sits on the resting felt-tip line. Turn the GoL filter on. Set dry ≈ 0.35, wet ≈ 0.75.

For your own video: MP4/WebM/MOV, any length. Nothing is uploaded; the video and the audio processing all happen in your browser.

## Code and repository

- Repo: [github.com/josephbakarji/piano-of-life](https://github.com/josephbakarji/piano-of-life)
- MIT licensed.
- Sample piano video included.

## Extensions I'd like to try

- **Alternative detectors.** Adaptive per-column Y (curve-following bands to handle non-parallel geometries). Audio-onset frontend (librosa/aubio) with pitch estimation so the piano roll is pitch-correct. MIDI input as a source when no video is available.
- **Alternative substrates.** Lenia (continuous-space CA). Reaction-diffusion. Cyclic CA. The framework claim is that the *substrate* is doing the work; changing it should audibly change the character of the filter.
- **Alternative audio backends.** A single convolution node whose impulse response is derived from the PMF (proper spectral filter, not a bank). Additive synthesis in parallel to the source, so silent bands still resonate. Granular playback keyed off strikes.

If you build any of these, I'd love to see it!
