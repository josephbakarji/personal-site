/**
 * Landing hero animation.
 *
 * A slice of the piano video sits at the top of the hero band; directly
 * below is a shaded Game of Life zone. Hammer strikes detected in the
 * video seed cells at the top row of the GoL grid, so the piano
 * literally generates the boundary condition of the substrate below it.
 *
 * Detection: signed luminance change at a thin horizontal band, per
 * column, over 120 columns. Strike = band darkens (felt moved up out of
 * band). Cooldown filters double-fires.
 *
 * Simplified from the piano-dev / piano-of-life sandbox: no piano-roll
 * intermediate stage, no hourglass, no audio filter for the landing.
 *
 * Vanilla JS + Canvas 2D. No dependencies.
 */
(function () {
  'use strict';

  // DOM
  const video      = document.getElementById('hero-video');
  const detOverlay = document.getElementById('det-overlay');
  const rollCanvas = document.getElementById('hero-roll-canvas');
  const golCanvas  = document.getElementById('hero-canvas');
  const pauseBtn   = document.getElementById('hero-ctrl-pause');
  const audioBtn   = document.getElementById('hero-ctrl-audio');

  if (!video || !golCanvas) return;

  const detCtx  = detOverlay ? detOverlay.getContext('2d') : null;
  const rollCtx = rollCanvas ? rollCanvas.getContext('2d') : null;
  const golCtx  = golCanvas.getContext('2d');

  // Hidden downsampled canvas for detection
  const workCv  = document.createElement('canvas');
  workCv.width  = 320;
  workCv.height = 180;
  const workCtx = workCv.getContext('2d', { willReadFrequently: true });

  // Config
  const cfg = {
    nCols: 120,
    threshold: 8,
    bandY: 0.60,
    bandThickness: 0.05,
    cooldownMs: 260,
    direction: 'strike',
    dirBias: 1.8,
    showBand: false,
  };

  // State
  let prevLumaBand = null;
  let lastHitAt = new Array(cfg.nCols).fill(-Infinity);
  let lastFrameMs = 0;

  const P = {
    accent: '#a6844e',
    accentSoft: 'rgba(166,132,78,0.16)',
    accentLine: 'rgba(166,132,78,0.6)',
    cyan: '#4d8478',
    green: '#5f8a4f',
    red: '#a05548',
    grid: 'rgba(28,27,31,0.04)',
  };

  function hexRgb(h){ return { r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) }; }
  function mix(c1,c2,t){ const r1=hexRgb(c1), r2=hexRgb(c2); return `rgb(${(r1.r*(1-t)+r2.r*t)|0},${(r1.g*(1-t)+r2.g*t)|0},${(r1.b*(1-t)+r2.b*t)|0})`; }

  // GoL (shaded)
  let gol = {
    cols: cfg.nCols,
    rows: 0,
    cellW: 0, cellH: 0,
    grid: null, next: null, alpha: null,
    tickMs: 0, stepMs: 160,
  };

  function fitCanvas(cv) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = cv.getBoundingClientRect();
    cv.width  = Math.round(rect.width * dpr);
    cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resetGol() {
    const rect = golCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
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

  function resizeAll() {
    fitCanvas(golCanvas);
    if (detOverlay) fitCanvas(detOverlay);
    if (rollCanvas) fitCanvas(rollCanvas);
    resetGol();
  }

  // Piano roll bars falling through the clearance band
  const rollBars = [];
  const ROLL_SPEED_PX_PER_S = 220; // bar falls at ~220px/s

  function spawnRollBar(col, strength) {
    rollBars.push({ col, y: 0, strength, alive: true });
  }

  function drawRollBars(dtMs) {
    if (!rollCtx || !rollCanvas) return;
    const rect = rollCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    rollCtx.clearRect(0, 0, w, h);

    const dy = ROLL_SPEED_PX_PER_S * dtMs / 1000;
    const colW = w / cfg.nCols;

    for (const b of rollBars) {
      if (!b.alive) continue;
      b.y += dy;
      const barH = 6 + Math.min(14, b.strength * 20);
      const alpha = Math.max(0.35, 1 - (b.y / h) * 0.6);
      rollCtx.fillStyle = P.accent;
      rollCtx.globalAlpha = alpha;
      rollCtx.fillRect(b.col * colW + 1, b.y, Math.max(2, colW - 2), barH);

      if (b.y > h - 2) {
        b.alive = false;
        // Bar reached the GoL: seed cells at top row for that column
        seedGolTop(b.col, b.strength);
      }
    }
    rollCtx.globalAlpha = 1;
    // Prune dead bars
    for (let i = rollBars.length - 1; i >= 0; i--) {
      if (!rollBars[i].alive) rollBars.splice(i, 1);
    }
  }

  // Detection: signed luma change in a thin band, 120 columns
  function detectStrikes(nowMs) {
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
    const colFloatW = W / nCols;

    for (let y = y0; y < y1; y++) {
      let colEnd = colFloatW, colIdx = 0;
      for (let x = 0; x < W; x++) {
        while (x >= colEnd && colIdx < nCols - 1) { colIdx++; colEnd = (colIdx + 1) * colFloatW; }
        const i = (y * W + x) * 4;
        const lum = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
        meanLuma[colIdx] += lum;
      }
    }
    const bandArea = y1 - y0;
    for (let c = 0; c < nCols; c++) meanLuma[c] /= bandArea * colFloatW;

    const dLuma = new Float32Array(nCols);
    if (prevLumaBand && prevLumaBand.length === nCols) {
      for (let c = 0; c < nCols; c++) dLuma[c] = meanLuma[c] - prevLumaBand[c];
    }
    prevLumaBand = meanLuma;

    const hits = [];
    for (let c = 0; c < nCols; c++) {
      const d = dLuma[c];
      const strikeMag = -d;
      const returnMag =  d;
      let strong = cfg.direction === 'strike' ? strikeMag
                 : cfg.direction === 'return' ? returnMag
                 : Math.max(strikeMag, returnMag);
      if (strong < cfg.threshold) continue;
      if ((nowMs - lastHitAt[c]) <= cfg.cooldownMs) continue;
      if (cfg.direction !== 'any') {
        const opp = (cfg.direction === 'strike') ? returnMag : strikeMag;
        if (strong < cfg.dirBias * Math.max(0, opp)) continue;
      }
      hits.push({ col: c, strength: Math.min(1, strong / 40) });
      lastHitAt[c] = nowMs;
    }
    return hits;
  }

  // Seed GoL at the top row from detected column hits
  function seedGolTop(col, strength) {
    if (!gol.grid) return;
    const size = 1 + Math.floor(strength * 3);
    const cw = Math.floor(size / 2);
    for (let dc = -cw; dc <= cw; dc++) {
      const cc = col + dc;
      if (cc < 0 || cc >= gol.cols) continue;
      for (let rr = 0; rr < Math.min(2, size); rr++) {
        if (rr >= gol.rows) break;
        if (Math.random() < 0.85) {
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
        if (willLive) alpha[idx] = alive ? Math.max(alpha[idx], 0.9) : 1;
        else {
          alpha[idx] *= 0.55;
          if (alpha[idx] < 0.02) alpha[idx] = 0;
        }
      }
    }
    gol.grid = next;
    gol.next = grid;
  }

  function drawGol(dtMs) {
    const rect = golCanvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    golCtx.clearRect(0, 0, w, h);
    if (!gol.grid) return;

    gol.tickMs += dtMs;
    if (gol.tickMs > gol.stepMs) { tickGol(); gol.tickMs = 0; }

    // Very faint column grid (sparser than 120)
    golCtx.strokeStyle = P.grid;
    golCtx.lineWidth = 1;
    for (let c = 4; c < gol.cols; c += 4) {
      golCtx.beginPath();
      golCtx.moveTo(c * gol.cellW + 0.5, 0);
      golCtx.lineTo(c * gol.cellW + 0.5, h);
      golCtx.stroke();
    }

    // Shaded cells with column-gradient color
    for (let r = 0; r < gol.rows; r++) {
      for (let c = 0; c < gol.cols; c++) {
        const a = gol.alpha[r * gol.cols + c];
        if (a <= 0.02) continue;
        const t = c / Math.max(1, gol.cols - 1);
        golCtx.fillStyle = mix(P.accent, P.red, t * 0.35);
        golCtx.globalAlpha = Math.min(1, a);
        golCtx.fillRect(c * gol.cellW + 1, r * gol.cellH + 1, Math.max(1, gol.cellW - 2), gol.cellH - 2);
      }
    }
    golCtx.globalAlpha = 1;
  }

  // Optional detection band overlay (debug)
  function drawDetectionOverlay() {
    if (!detCtx) return;
    const rect = detOverlay.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    detCtx.clearRect(0, 0, w, h);
    if (!cfg.showBand) return;
    const cy = cfg.bandY * h;
    const halfT = (cfg.bandThickness * h) / 2;
    const y0 = cy - halfT, y1 = cy + halfT;
    detCtx.fillStyle = P.accentSoft;
    detCtx.fillRect(0, y0, w, y1 - y0);
    detCtx.strokeStyle = P.accentLine;
    detCtx.lineWidth = 1;
    detCtx.strokeRect(0.5, y0 + 0.5, w - 1, y1 - y0 - 1);
  }

  // Controls
  function wireControls() {
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        if (video.paused) { video.play(); pauseBtn.textContent = 'pause'; pauseBtn.setAttribute('aria-pressed', 'false'); }
        else              { video.pause(); pauseBtn.textContent = 'play';  pauseBtn.setAttribute('aria-pressed', 'true'); }
      });
    }
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        audioBtn.textContent = video.muted ? 'audio: off' : 'audio: on';
        audioBtn.setAttribute('aria-pressed', video.muted ? 'false' : 'true');
      });
    }
  }

  // Main loop
  function frame(now) {
    const dt = Math.min(50, now - lastFrameMs || 16);
    lastFrameMs = now;
    drawDetectionOverlay();
    const hits = detectStrikes(now);
    // Strikes spawn roll bars in the clearance band; when they reach the
    // bottom of the clearance, they seed GoL cells at the same column.
    for (const h of hits) {
      if (rollCanvas) spawnRollBar(h.col, h.strength);
      else            seedGolTop(h.col, h.strength);
    }
    drawRollBars(dt);
    drawGol(dt);
    requestAnimationFrame(frame);
  }

  function init() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      return;
    }
    wireControls();
    resizeAll();
    window.addEventListener('resize', resizeAll);
    video.play().catch(() => {});
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
