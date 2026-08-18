# Landing Hero Animation — Design Proposal

**Concept**: A left-to-right procession that visualizes Joseph's framework —
*physical action → discretization → self-organizing substrate → sonification →
entropy*. The animation runs in a hero band above/behind the intro card.

The internal narrative (not shown on screen):
piano hammer strikes → piano roll grid → Game of Life on that grid (occasionally
sonified) → cells drop off the right edge as grains → pile in an hourglass.

Framework payload for Joseph (not to be surfaced in copy): compression across
scales, action–perception loop, philanosis–entropy duality read as *the same
operation seen from two sides of a boundary*.

---

## Integration Notes (how this slots into `index.html`)

**Hero band dimensions.** Recommended fixed aspect band at the top of the
viewport, `min-height: 320px`, `max-height: 46vh`. On desktop the intro card
sits *inside* this band, centered vertically; on mobile the band collapses to
~220px and the intro card drops below it. Current landing renders the Game of
Life across the full viewport — the new animation replaces that background
strictly within the hero band.

**Where the intro card sits.** Two options — the prototype implements **A**:

- **(A) Card floats over the animation**, centered, with a `backdrop-filter:
  blur(10px)` panel. The animation dims to ~35% opacity behind the card region
  via a radial mask so text stays readable at all times.
- **(B) Animation is a slim band above the card** (200–260px tall). More
  conservative but loses the "text sits in the world" feel.

**JS file structure**, mirroring `js/gameoflife.js`:

```
js/
  pixel-font.js        (existing, keep)
  gameoflife.js        (existing — retire from landing, keep for /life route)
  landing-anim.js      (new, IIFE, same shape as gameoflife.js)
```

The new module exposes the same lifecycle: `init()`, `sizeCanvas()`,
`bindControls()`, `debounce()`. Config constants live at the top (durations per
stage, palette, cell sizes). All colors read from `--accent-*` CSS vars by
sampling `getComputedStyle(document.documentElement)` at init.

`index.html` changes (later, not now):

- Replace `<canvas id="life-canvas">` with `<canvas id="hero-anim"
  aria-hidden="true">`.
- Wrap it in `<div class="hero-band">` sized via `landing.css` (`.hero-band {
  min-height: 320px; max-height: 46vh; aspect-ratio: 16 / 7; }`).
- Add mute + pause controls to the existing bottom `.controls` bar with
  `#anim-mute` and `#anim-pause` ids.
- Load order: `<script src="js/landing-anim.js" defer>`; the pixel-font script
  is no longer needed by the landing (keep it for the `/life` fallback route).

Reduced-motion path: on `prefers-reduced-motion: reduce` the module skips the
animation and paints the sonified-GoL frame (the "peak" frame of the sequence)
as a still image. This is the frame that best represents the framework in a
glance.

---

## Approaches Considered

### Approach 1 — Single-canvas continuous flow ("river")

Everything on one canvas, painted continuously from left to right. Piano
hammers on the far left tap strings; string vibrations extrude into a piano
roll that scrolls right, quantizes into a grid, boots up Game of Life, drops
cells off the right cliff as grains, and piles them in an hourglass at the
far-right edge. Nothing ever fully leaves the frame — it's one long conveyor.

- *Feel*: like a Bret Victor essay figure. The whole framework visible at
  once. Reads as a system diagram that happens to move.
- *Tradeoffs*: hardest to make readable — six ideas in one visual field
  compete for attention. Requires very careful density control per stage.
  Also the hardest to tune for the ~46vh hero band; needs a wide aspect
  (16:7 minimum). Very difficult on mobile — has to collapse to a stacked
  vertical version.
- *Complexity*: high. Every stage has to render every frame, and the
  handoffs between stages must remain visible mid-flight.

### Approach 2 — Staged sequence with cross-fades

The canvas is one scene; time is divided into 4–5 stages that cross-fade
into each other. Stage 1 draws piano and hammers. It fades and stage 2
(discretization) fades in *in the same coordinate space*, so a struck note
becomes a piano-roll cell. Stage 3 is a full grid Game of Life. Stage 4
sonifies live cells (audio + a color pulse). Stage 5 tips the grid
90° into an hourglass and cells fall as grains onto a pile. Loop.

- *Feel*: cinematic, calm, easier to read. Each stage gets its own moment.
  Joseph's framework arrives as a sequence you follow rather than a diagram
  you decode.
- *Tradeoffs*: less "everything at once" than Approach 1 — visitors who
  arrive mid-loop see one stage, not the whole story. Requires a subtle
  progress hint (a thin timeline bar) so the loop feels intentional.
  Cross-fades hide the geometric fact that a piano-roll cell IS a GoL cell
  IS a grain — which is the whole point.
- *Complexity*: medium. Each stage is a self-contained render function.
  Timing is the main challenge; audio hooks only into stage 4.

### Approach 3 — Layered continuous flow ("morph in place")

Hybrid. One canvas, one coordinate system, but stages *morph* rather than
cross-fade. The same cell that was a piano roll note becomes a GoL cell
becomes a grain — the same pixel changes role. There are no cuts; motion is
constant left-to-right but at any given moment ~three stages are visible
across the width of the canvas. A slow "wave" moves through: the left edge
is always piano, the middle is always GoL, the right edge is always
hourglass, but individual cells travel through all of them.

- *Feel*: this is the framework. Compression happens along the wave. It
  makes the philanosis↔entropy duality visible: the same cell is
  "self-organizing" mid-canvas and "entropy grain" at the right. The
  hero-band aspect (wide, short) plays to this format's strengths.
- *Tradeoffs*: medium-high complexity. Requires all stages alive
  simultaneously, but with density gradients so the eye can follow the
  flow. Individual "cells" need identity that persists through
  transformation. Very effective on desktop; on mobile the same idea works
  vertically (top-to-bottom flow) with the mobile band being tall/narrow.
- *Complexity*: medium-high, but manageable — most of the code is stage
  render functions gated by a horizontal position range.

---

## Recommendation: Approach 3 (Layered continuous flow)

Approach 3 wins because **it visualizes the claim, not the sequence**. The
framework's core assertion is that these are not five separate things — they
are one operation viewed at five scales / stages. A staged sequence
(Approach 2) accidentally teaches the opposite: "here's stage 1, then stage
2." A continuous flow with morphing identity teaches: "the piano note *is*
the GoL cell *is* the grain — the substrate changes, the token persists."

The hero-band aspect ratio favors it: a wide short band naturally reads as
a left-to-right process. Sonification pins to the middle third (GoL zone),
which is also where the intro card sits — so audio arrives at the same
horizontal moment the reader's eye is on the text. That's a pleasant
coincidence of the format.

Framework payoff: the philanosis–entropy duality is literally the same
pixel viewed from two positions on the canvas — the middle (structure) and
the right (entropy). This is closer to Joseph's actual claim than any
side-by-side split would be.

**Stages implemented in the prototype** (compressed from 6 to 4):

1. **Piano strike** (left 20%) — hammers tap horizontal strings; a struck
   string ripples and emits a discrete cell into the flow.
2. **Piano roll / grid** (25–50%) — cells snap to a rectangular grid and
   scroll right at grid velocity. The grid itself is faintly visible.
3. **Game of Life** (50–75%) — Life rules run on the grid. Live cells
   occasionally trigger a soft sine ping (sonification, muted by default).
4. **Fall & pile** (75–100%) — cells falling off the right edge accelerate
   downward under gravity, land in a wedge-shaped pile, and settle. The
   pile is the hourglass base.

The two omitted stages ("discretization" and "block fall") are absorbed:
discretization is what happens at the boundary of stages 1↔2; block fall
is stage 4.

**Timing**: 20-second reference loop for eye-training, but the prototype
runs continuously — there is no restart cut. A subtle 20s color oscillation
(gold ↔ warmer gold) is the only cadence hint.

**Audio**: Web Audio API only. Small polyphonic sine bank; each sonified
GoL cell triggers a short attack-decay envelope at a pitch determined by
its row (rows map to a pentatonic scale in C, so any subset sounds
consonant). Off by default; unlocks on first user click of the mute
toggle. No audio on load.

---

## Prototype Notes

- File: `landing-animation-prototype.html`. Standalone, no imports, opens in
  Chrome directly.
- ~20s reference cycle, but continuous — no jarring restarts.
- Controls: **pause**, **mute** (unmutes audio), **stage indicator** (very
  faint at bottom).
- `prefers-reduced-motion`: renders the sonified-GoL frame as a static image
  with a small caption "animation paused (reduced motion)".
- Mobile: below 640px, band drops to 220px and flow simplifies (fewer
  particles, cell size scales up so the density stays visually similar).
- Palette pulled from the light-mode variables listed in the brief:
  `#faf8f3` background, `#c4a46c` primary accent, teal/green/purple/red as
  hop accents on individual stage boundaries.
