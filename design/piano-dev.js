/**
 * Piano dev sandbox — v3
 *
 * Detection model change (from motion-in-a-band → luminance-at-an-interface):
 *   We watch a THIN horizontal band positioned at the resting felt-tip line.
 *   Per column we compute mean luminance. Frame-over-frame:
 *     - band DARKENS  → hammer felt has moved UP out of the band → STRIKE
 *     - band BRIGHTENS → felt has returned INTO the band → RETURN
 *   Uniform regular grid (fine — user can go up to 88 cells). Multiple
 *   adjacent columns triggering for one hammer is expected; we don't merge.
 *
 * GoL: shaded cells (alpha per cell). Newly-alive cells clamp to full alpha;
 *   long-alive cells hold near 1; recently-dead cells fade ×0.55 per tick.
 *   Column-gradient color: gold → warm gold/red across the grid.
 */
(function () {
  'use strict';

  // ── DOM
  const video      = document.getElementById('piano-video');
  const detOverlay = document.getElementById('det-overlay');
  const motionCv   = document.getElementById('motion-canvas');
  const rollCv     = document.getElementById('roll-canvas');
  const golCv      = document.getElementById('gol-canvas');

  const detCtx    = detOverlay.getContext('2d');
  const motionCtx = motionCv.getContext('2d');
  const rollCtx   = rollCv.getContext('2d');
  const golCtx    = golCv.getContext('2d');

  // Hidden downsampled canvas for detection
  const workCv  = document.createElement('canvas');
  workCv.width  = 320;
  workCv.height = 180;
  const workCtx = workCv.getContext('2d', { willReadFrequently: true });

  // ── Config
  const cfg = {
    source: 'motion',           // 'motion' | 'onsets' | 'both'
    threshold: 8,
    bandY: 0.58,
    bandThickness: 0.05,
    nCols: 60,
    cooldownMs: 260,
    direction: 'strike',
    dirBias: 1.8,
    showZone: true,
    showCols: true,
    // Audio filter
    audioOn: false,
    dryGain: 0.35,
    wetGain: 0.75,
    fMin: 110,                  // A2
    fMax: 2093,                 // C7
    nBands: 32,
    qFactor: 9,
  };

  // ── State
  let prevLumaBand = null;      // Float32Array[nCols] — mean luma per column of previous band
  let lastFrameMs = 0;
  let stats = { hits: 0, startMs: performance.now(), fps: 0, lastFpsAt: performance.now(), fpsCount: 0, peakStrike: 0, sumDir: 0 };
  let lastHitAt = new Array(cfg.nCols).fill(-Infinity);
  let onsets = null;
  let onsetsFired = null;
  let onsetsDuration = 20;

  // Piano roll bars
  const rollBars = [];
  const ROLL_SPEED = 220;

  // GoL (shaded)
  let gol = {
    cols: cfg.nCols, rows: 20,
    cellW: 0, cellH: 0,
    grid: null,       // Uint8Array
    next: null,       // Uint8Array
    alpha: null,      // Float32Array
    tickMs: 0,
    stepMs: 160,
  };

  const P = {
    fg:    '#1c1b1f',
    muted: '#5a544c',
    accent:'#a6844e',
    cyan:  '#4d8478',
    green: '#5f8a4f',
    red:   '#a05548',
    grid:  'rgba(28,27,31,0.05)',
    zone:  'rgba(166,132,78,0.16)',
    zoneStroke: 'rgba(166,132,78,0.6)',
  };

  // ── Audio: GoL PMF → bandpass filter bank applied to the piano video's audio
  //
  // Signal graph:
  //   video ─► MediaElementSource ─┬─► dryGain ────────────────────► master ─► out
  //                                └─► [bp₁, bp₂, ... bpN] ─► bandGains ─► wetSum ─► master
  //
  // Each bandpass center frequency is log-spaced between fMin and fMax; the gain
  // on that band is a smoothed target driven by summing the shaded-GoL alpha
  // over its column range, normalized to the peak of the current PMF.
  const audio = {
    ctx: null,
    source: null,
    master: null,
    drySum: null,
    wetSum: null,
    filters: [],
    gains: [],
    ready: false,
    peakSmoothed: 0,
  };

  function initAudio() {
    if (audio.ready) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
    try {
      audio.source = audio.ctx.createMediaElementSource(video);
    } catch (e) {
      console.warn('createMediaElementSource failed', e);
      return;
    }

    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 1.0;
    audio.master.connect(audio.ctx.destination);

    audio.drySum = audio.ctx.createGain();
    audio.drySum.gain.value = cfg.dryGain;
    audio.source.connect(audio.drySum);
    audio.drySum.connect(audio.master);

    audio.wetSum = audio.ctx.createGain();
    audio.wetSum.gain.value = cfg.wetGain;
    audio.wetSum.connect(audio.master);

    for (let b = 0; b < cfg.nBands; b++) {
      const t = b / (cfg.nBands - 1);
      const freq = cfg.fMin * Math.pow(cfg.fMax / cfg.fMin, t);
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = cfg.qFactor;
      const gain = audio.ctx.createGain();
      gain.gain.value = 0;
      audio.source.connect(filter);
      filter.connect(gain);
      gain.connect(audio.wetSum);
      audio.filters.push(filter);
      audio.gains.push(gain);
    }

    audio.ready = true;
  }

  async function enableAudio() {
    initAudio();
    if (!audio.ctx) return;
    try { await audio.ctx.resume(); } catch (e) { /* ignore */ }
    video.muted = false;
    cfg.audioOn = true;
    document.getElementById('btn-gol-audio').textContent = 'GoL filter: ON';
    document.getElementById('btn-gol-audio').classList.add('active');
    document.getElementById('btn-audio').textContent = 'mute video';
  }

  function disableAudio() {
    cfg.audioOn = false;
    if (audio.ready) {
      const now = audio.ctx.currentTime;
      for (const g of audio.gains) g.gain.setTargetAtTime(0, now, 0.05);
    }
    document.getElementById('btn-gol-audio').textContent = 'GoL filter: OFF';
    document.getElementById('btn-gol-audio').classList.remove('active');
  }

  function updateAudio() {
    if (!audio.ready || !cfg.audioOn || !gol.alpha) return;

    // Reduce PMF: sum shaded-alpha per column across rows, then bin into nBands
    const cols = gol.cols;
    const rows = gol.rows;
    const alpha = gol.alpha;
    const perCol = new Float32Array(cols);
    for (let c = 0; c < cols; c++) {
      let s = 0;
      for (let r = 0; r < rows; r++) s += alpha[r * cols + c];
      perCol[c] = s;
    }
    const pmf = new Float32Array(cfg.nBands);
    for (let c = 0; c < cols; c++) {
      const b = Math.min(cfg.nBands - 1, Math.floor((c / cols) * cfg.nBands));
      pmf[b] += perCol[c];
    }
    let peak = 0;
    for (let b = 0; b < cfg.nBands; b++) if (pmf[b] > peak) peak = pmf[b];
    audio.peakSmoothed = 0.9 * audio.peakSmoothed + 0.1 * peak;
    const norm = peak > 0 ? 1 / peak : 0;

    const now = audio.ctx.currentTime;
    const TC = 0.08;   // smoothing time constant (s)
    for (let b = 0; b < cfg.nBands; b++) {
      const target = pmf[b] * norm * 0.9;
      audio.gains[b].gain.setTargetAtTime(target, now, TC);
    }
    // Update dry/wet from cfg (might have moved sliders)
    audio.drySum.gain.setTargetAtTime(cfg.dryGain, now, 0.03);
    audio.wetSum.gain.setTargetAtTime(cfg.wetGain, now, 0.03);
  }

  // Simple linear color mix (hex → rgb → back)
  function hexRgb(h) {
    return { r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) };
  }
  function mix(c1, c2, t) {
    const r1 = hexRgb(c1), r2 = hexRgb(c2);
    return `rgb(${(r1.r * (1 - t) + r2.r * t) | 0},${(r1.g * (1 - t) + r2.g * t) | 0},${(r1.b * (1 - t) + r2.b * t) | 0})`;
  }

  // ── UI wiring
  function wireControls() {
    const bind = (id, fn) => document.getElementById(id).addEventListener('input', fn);
    const click = (id, fn) => document.getElementById(id).addEventListener('click', fn);

    bind('thr', e => {
      cfg.threshold = +e.target.value;
      document.getElementById('thr-val').textContent = cfg.threshold.toFixed(1);
    });
    bind('band-y', e => { cfg.bandY = +e.target.value; document.getElementById('band-y-val').textContent = cfg.bandY.toFixed(2); prevLumaBand = null; });
    bind('band-t', e => { cfg.bandThickness = +e.target.value; document.getElementById('band-t-val').textContent = cfg.bandThickness.toFixed(2); prevLumaBand = null; });
    bind('cols', e => {
      cfg.nCols = +e.target.value;
      document.getElementById('cols-val').textContent = cfg.nCols;
      lastHitAt = new Array(cfg.nCols).fill(-Infinity);
      prevLumaBand = null;
      resetGol();
    });
    bind('cd', e => { cfg.cooldownMs = +e.target.value; document.getElementById('cd-val').textContent = cfg.cooldownMs; });
    bind('bias', e => { cfg.dirBias = +e.target.value; document.getElementById('bias-val').textContent = cfg.dirBias.toFixed(1) + '×'; });

    ['motion', 'onsets', 'both'].forEach(k => {
      click(`src-${k}`, () => {
        cfg.source = k;
        document.querySelectorAll('[data-src]').forEach(b => b.classList.toggle('active', b.dataset.src === k));
      });
    });
    ['strike', 'return', 'any'].forEach(k => {
      click(`dir-${k}`, () => {
        cfg.direction = k;
        document.querySelectorAll('[data-dir]').forEach(b => b.classList.toggle('active', b.dataset.dir === k));
      });
    });

    click('ov-zone', () => { cfg.showZone = !cfg.showZone; document.getElementById('ov-zone').classList.toggle('active', cfg.showZone); });
    click('ov-cols', () => { cfg.showCols = !cfg.showCols; document.getElementById('ov-cols').classList.toggle('active', cfg.showCols); });

    click('btn-pause', () => {
      if (video.paused) { video.play(); document.getElementById('btn-pause').textContent = 'pause'; }
      else              { video.pause(); document.getElementById('btn-pause').textContent = 'play'; }
    });
    click('btn-audio', () => {
      video.muted = !video.muted;
      document.getElementById('btn-audio').textContent = video.muted ? 'unmute video' : 'mute video';
    });

    // GoL filter
    click('btn-gol-audio', () => {
      if (cfg.audioOn) disableAudio();
      else enableAudio();
    });
    bind('dry', e => { cfg.dryGain = +e.target.value; document.getElementById('dry-val').textContent = cfg.dryGain.toFixed(2); });
    bind('wet', e => { cfg.wetGain = +e.target.value; document.getElementById('wet-val').textContent = cfg.wetGain.toFixed(2); });
  }

  // ── Canvas sizing (DPR)
  function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = cv.getBoundingClientRect();
    cv.width  = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function resizeAll() {
    fitCanvas(detOverlay);
    fitCanvas(motionCv);
    fitCanvas(rollCv);
    fitCanvas(golCv);
    resetGol();
  }

  // ── Detection: luminance change at a thin interface band
  function detectBand(nowMs) {
    if (video.readyState < 2 || video.videoWidth === 0) return [];
    workCtx.drawImage(video, 0, 0, workCv.width, workCv.height);
    const img = workCtx.getImageData(0, 0, workCv.width, workCv.height).data;

    const W = workCv.width, H = workCv.height;
    const cy = cfg.bandY * H;
    const halfT = (cfg.bandThickness * H) / 2;
    const y0 = Math.max(0, Math.floor(cy - halfT));
    const y1 = Math.min(H, Math.floor(cy + halfT));
    if (y1 <= y0) return [];

    const nCols = cfg.nCols;
    const meanLuma = new Float32Array(nCols);

    // Per-column mean luminance across the thin band
    const colFloatW = W / nCols;
    // Precompute column of each x for speed
    // (linear pass, x cheap)
    for (let y = y0; y < y1; y++) {
      let colStart = 0, colEnd = colFloatW, colIdx = 0;
      for (let x = 0; x < W; x++) {
        while (x >= colEnd && colIdx < nCols - 1) { colIdx++; colEnd = (colIdx + 1) * colFloatW; }
        const i = (y * W + x) * 4;
        const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        meanLuma[colIdx] += lum;
      }
    }
    const bandArea = y1 - y0;
    for (let c = 0; c < nCols; c++) {
      meanLuma[c] /= bandArea * colFloatW;  // normalize per pixel in the column strip
    }

    // Signed change per column
    const dLuma = new Float32Array(nCols);
    if (prevLumaBand && prevLumaBand.length === nCols) {
      for (let c = 0; c < nCols; c++) dLuma[c] = meanLuma[c] - prevLumaBand[c];
    }
    prevLumaBand = meanLuma;

    // Motion bars: color by sign, magnitude scaled to threshold*2
    drawMotionBars(dLuma);

    // Overall direction stat (integrate)
    let sumSigned = 0, absSum = 0, peakStrike = 0;
    for (let c = 0; c < nCols; c++) {
      sumSigned += dLuma[c];
      absSum    += Math.abs(dLuma[c]);
      if (-dLuma[c] > peakStrike) peakStrike = -dLuma[c];  // strike = darkening
    }
    stats.peakStrike = 0.85 * stats.peakStrike + 0.15 * peakStrike;
    stats.sumDir     = absSum > 0 ? sumSigned / absSum : 0;

    // Emit hits based on direction + threshold + cooldown
    const hits = [];
    for (let c = 0; c < nCols; c++) {
      const d = dLuma[c];
      const strikeMag = -d;  // positive if band DARKENED (felt moved up out of band)
      const returnMag =  d;  // positive if band BRIGHTENED (felt returned)

      let strong = 0;
      if (cfg.direction === 'strike')      strong = strikeMag;
      else if (cfg.direction === 'return') strong = returnMag;
      else                                 strong = Math.max(strikeMag, returnMag);

      if (strong < cfg.threshold) continue;
      if ((nowMs - lastHitAt[c]) <= cfg.cooldownMs) continue;

      // Direction-bias: require the chosen sign to dominate the opposite by dirBias×
      // (only meaningful when direction != 'any')
      if (cfg.direction !== 'any') {
        const opp = (cfg.direction === 'strike') ? returnMag : strikeMag;
        if (strong < cfg.dirBias * Math.max(0, opp)) continue;
      }

      hits.push({ col: c, strength: Math.min(1, strong / 40) });
      lastHitAt[c] = nowMs;
    }
    return hits;
  }

  function drawMotionBars(dLuma) {
    const rect = motionCv.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    motionCtx.clearRect(0, 0, w, h);

    const nCols = cfg.nCols;
    const colW = w / nCols;
    const scale = 1 / (cfg.threshold * 2);  // threshold sits at midheight of bar

    for (let c = 0; c < nCols; c++) {
      const d = dLuma[c];
      const mag = Math.abs(d);
      const v = Math.min(1, mag * scale);
      const barH = v * (h - 4);
      const x = c * colW;

      // Strike (darkening) = cyan; return (brightening) = red
      const strike = d < 0;
      const color = strike ? P.cyan : P.red;

      motionCtx.fillStyle = color;
      motionCtx.globalAlpha = mag > cfg.threshold ? 0.95 : 0.30;
      motionCtx.fillRect(x + 1, h - barH, Math.max(1, colW - 2), barH);
    }
    motionCtx.globalAlpha = 1;

    // Threshold line at midheight
    motionCtx.strokeStyle = P.accent;
    motionCtx.setLineDash([4, 4]);
    motionCtx.lineWidth = 1;
    const thrY = h - (0.5 * (h - 4));
    motionCtx.beginPath(); motionCtx.moveTo(0, thrY); motionCtx.lineTo(w, thrY); motionCtx.stroke();
    motionCtx.setLineDash([]);
  }

  // ── Detection band overlay on video
  function drawDetectionOverlay() {
    const rect = detOverlay.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    detCtx.clearRect(0, 0, w, h);

    if (cfg.showZone) {
      const cy = cfg.bandY * h;
      const halfT = (cfg.bandThickness * h) / 2;
      const y0 = cy - halfT;
      const y1 = cy + halfT;
      detCtx.fillStyle = P.zone;
      detCtx.fillRect(0, y0, w, y1 - y0);
      detCtx.strokeStyle = P.zoneStroke;
      detCtx.lineWidth = 1;
      detCtx.strokeRect(0.5, y0 + 0.5, w - 1, y1 - y0 - 1);
    }
    if (cfg.showCols) {
      const cy = cfg.bandY * h;
      const halfT = (cfg.bandThickness * h) / 2 + 6;
      const y0 = cy - halfT;
      const y1 = cy + halfT;
      detCtx.strokeStyle = 'rgba(28,27,31,0.15)';
      detCtx.lineWidth = 1;
      const colW = w / cfg.nCols;
      for (let c = 1; c < cfg.nCols; c++) {
        const x = c * colW;
        detCtx.beginPath();
        detCtx.moveTo(x + 0.5, y0);
        detCtx.lineTo(x + 0.5, y1);
        detCtx.stroke();
      }
    }
  }

  // ── Audio onset comparison mode
  function fireAudioOnsets() {
    if (!onsets || !onsets.length) return [];
    const t = video.currentTime % onsetsDuration;
    const hits = [];
    for (let i = 0; i < onsets.length; i++) {
      if (onsetsFired[i]) continue;
      if (t >= onsets[i].t) {
        onsetsFired[i] = true;
        const midi = onsets[i].midi;
        const col = Math.max(0, Math.min(cfg.nCols - 1, Math.floor((midi - 21) / (108 - 21) * cfg.nCols)));
        hits.push({ col, strength: onsets[i].confidence || 0.2 });
      }
    }
    if (t < 0.5) {
      const anyFired = onsetsFired.some(Boolean);
      const nearEnd = onsets[onsets.length - 1]?.t > onsetsDuration - 0.5;
      if (anyFired && nearEnd) onsetsFired.fill(false);
    }
    return hits;
  }

  // ── Piano roll
  function spawnBar(col, strength) {
    rollBars.push({ col, y: 0, strength, alive: true });
    stats.hits += 1;
  }
  function drawRoll(dtMs) {
    const rect = rollCv.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    rollCtx.clearRect(0, 0, w, h);

    rollCtx.strokeStyle = P.grid;
    rollCtx.lineWidth = 1;
    const colW = w / cfg.nCols;
    for (let c = 1; c < cfg.nCols; c++) {
      rollCtx.beginPath();
      rollCtx.moveTo(c * colW + 0.5, 0);
      rollCtx.lineTo(c * colW + 0.5, h);
      rollCtx.stroke();
    }

    const dy = ROLL_SPEED * dtMs / 1000;
    for (const b of rollBars) {
      if (!b.alive) continue;
      b.y += dy;
      const barH = 12 + Math.min(20, b.strength * 30);
      const alpha = Math.max(0.15, 1 - b.y / h);
      rollCtx.fillStyle = P.accent;
      rollCtx.globalAlpha = alpha;
      rollCtx.fillRect(b.col * colW + 2, b.y, Math.max(1, colW - 4), barH);
      if (b.y > h) { b.alive = false; seedGol(b.col, b.strength); }
    }
    rollCtx.globalAlpha = 1;
    for (let i = rollBars.length - 1; i >= 0; i--) if (!rollBars[i].alive) rollBars.splice(i, 1);
  }

  // ── Shaded Game of Life
  function resetGol() {
    const rect = golCv.getBoundingClientRect();
    if (!rect.width) return;
    gol.cols = cfg.nCols;
    gol.cellW = rect.width / gol.cols;
    gol.cellH = gol.cellW;
    gol.rows  = Math.max(6, Math.floor(rect.height / gol.cellH));
    const N = gol.cols * gol.rows;
    gol.grid  = new Uint8Array(N);
    gol.next  = new Uint8Array(N);
    gol.alpha = new Float32Array(N);
    gol.tickMs = 0;
  }
  function seedGol(col, strength) {
    if (!gol.grid) return;
    const size = 1 + Math.floor(strength * 4);   // 1..5 cells wide
    const centerRow = 1;
    for (let dr = 0; dr < size; dr++) {
      for (let dc = -Math.floor(size / 2); dc <= Math.floor(size / 2); dc++) {
        const cc = col + dc;
        const rr = centerRow + dr;
        if (cc < 0 || cc >= gol.cols || rr < 0 || rr >= gol.rows) continue;
        if (Math.random() < 0.75) {
          gol.grid[rr * gol.cols + cc] = 1;
          gol.alpha[rr * gol.cols + cc] = 1;
        }
      }
    }
  }
  function tickGol() {
    const { grid, next, alpha, cols, rows } = gol;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const rr = r + dr, cc = c + dc;
            if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) continue;
            n += grid[rr * cols + cc];
          }
        }
        const alive = grid[r * cols + c];
        const idx = r * cols + c;
        const willLive = (alive && (n === 2 || n === 3)) || (!alive && n === 3);
        next[idx] = willLive ? 1 : 0;

        // Shading update
        if (willLive) {
          alpha[idx] = alive ? Math.max(alpha[idx], 0.9) : 1;
        } else {
          alpha[idx] *= 0.55;      // dying fade
          if (alpha[idx] < 0.02) alpha[idx] = 0;
        }
      }
    }
    gol.grid = next;
    gol.next = grid;
  }
  function drawGol(dtMs) {
    const rect = golCv.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    golCtx.clearRect(0, 0, w, h);
    if (!gol.grid) return;

    gol.tickMs += dtMs;
    if (gol.tickMs > gol.stepMs) { tickGol(); gol.tickMs = 0; }

    // Faint grid
    golCtx.strokeStyle = P.grid;
    golCtx.lineWidth = 1;
    for (let c = 1; c < gol.cols; c++) {
      golCtx.beginPath();
      golCtx.moveTo(c * gol.cellW + 0.5, 0);
      golCtx.lineTo(c * gol.cellW + 0.5, h);
      golCtx.stroke();
    }
    for (let r = 1; r < gol.rows; r++) {
      golCtx.beginPath();
      golCtx.moveTo(0, r * gol.cellH + 0.5);
      golCtx.lineTo(w, r * gol.cellH + 0.5);
      golCtx.stroke();
    }

    // Cells (shaded, column-gradient color)
    for (let r = 0; r < gol.rows; r++) {
      for (let c = 0; c < gol.cols; c++) {
        const a = gol.alpha[r * gol.cols + c];
        if (a <= 0.02) continue;
        const t = c / Math.max(1, gol.cols - 1);
        const col = mix(P.accent, P.red, t * 0.45);
        golCtx.fillStyle = col;
        golCtx.globalAlpha = Math.min(1, a);
        golCtx.fillRect(c * gol.cellW + 1, r * gol.cellH + 1, gol.cellW - 2, gol.cellH - 2);
      }
    }
    golCtx.globalAlpha = 1;
  }

  // ── Status bar
  function updateStatus(nowMs) {
    document.getElementById('s-time').textContent = video.currentTime.toFixed(2);
    document.getElementById('s-hits').textContent = stats.hits;
    const elapsed = (nowMs - stats.startMs) / 1000;
    document.getElementById('s-rate').textContent = (stats.hits / Math.max(1, elapsed)).toFixed(2);
    document.getElementById('s-peak').textContent = stats.peakStrike.toFixed(2);
    document.getElementById('s-fps').textContent = stats.fps;
    document.getElementById('s-onsets').textContent = onsets ? onsets.length : '?';
    const dir = document.getElementById('s-dir');
    if (dir) {
      const v = -stats.sumDir;   // negative sumDir means strike-heavy
      dir.textContent = (v > 0 ? '+' : '') + v.toFixed(2);
      dir.style.color = v > 0.1 ? P.cyan : v < -0.1 ? P.red : P.muted;
    }
    const seg = document.getElementById('s-seg');
    if (seg) seg.textContent = `uniform (${cfg.nCols})`;

    stats.fpsCount++;
    if (nowMs - stats.lastFpsAt > 500) {
      stats.fps = Math.round(stats.fpsCount * 1000 / (nowMs - stats.lastFpsAt));
      stats.fpsCount = 0;
      stats.lastFpsAt = nowMs;
    }
  }

  // ── Main loop
  function frame(now) {
    const dt = Math.min(50, now - lastFrameMs || 16);
    lastFrameMs = now;

    drawDetectionOverlay();

    let hits = [];
    if (cfg.source === 'motion' || cfg.source === 'both') hits = hits.concat(detectBand(now));
    if (cfg.source === 'onsets' || cfg.source === 'both') hits = hits.concat(fireAudioOnsets());
    for (const h of hits) spawnBar(h.col, h.strength);

    drawRoll(dt);
    drawGol(dt);
    updateAudio();
    updateStatus(now);
    requestAnimationFrame(frame);
  }

  function init() {
    wireControls();
    resizeAll();
    window.addEventListener('resize', resizeAll);

    fetch('/data/piano-onsets.json', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        onsets = d.onsets || [];
        onsetsFired = new Array(onsets.length).fill(false);
        onsetsDuration = d.duration || d.segment_duration || 20;
      })
      .catch(() => { onsets = []; onsetsFired = []; });

    video.play().catch(() => {});
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
