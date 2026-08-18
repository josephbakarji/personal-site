/**
 * Game of Life Engine
 * Extracted from ML4Science Lecture 5, enhanced for personal website.
 *
 * Features:
 * - Responsive canvas (full viewport)
 * - Pixel-font name rendering as initial condition
 * - "Seed and dissolve" — name holds, then simulation starts
 * - Cell glow and fade trails
 * - Retina display support
 * - Click-to-toggle cells
 */

(function () {
  // --- State ---
  let canvas, ctx;
  let grid = [];
  let rows = 0, cols = 0;
  let cellSize = 8;
  let generation = 0;
  let playing = false;
  let animId = null;
  let holdTimer = null;
  let initialized = false;

  // --- Config ---
  const NAME_FULL = 'JOSEPH BAKARJI';
  const NAME_SHORT = 'BAKARJI';
  const HOLD_DURATION = 2500;  // ms to display name before dissolving
  const STEP_INTERVAL = 100;   // ms between generations
  const CELL_COLOR = '#c4a46c';
  const CELL_GLOW_COLOR = 'rgba(196, 164, 108, 0.25)';
  const BG_COLOR = '#1c1b1f';

  // --- Initialization ---

  function init() {
    canvas = document.getElementById('life-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    sizeCanvas();
    resetToName();
    bindControls();
    initialized = true;

    window.addEventListener('resize', debounce(onResize, 300));
  }

  function sizeCanvas() {
    const container = canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Compute grid dimensions
    cellSize = w < 768 ? 5 : (w < 1200 ? 7 : 8);
    cols = Math.floor(w / cellSize);
    rows = Math.floor(h / cellSize);
  }

  function createEmptyGrid() {
    return Array.from({ length: rows }, () => new Uint8Array(cols));
  }

  function resetToName() {
    stop();
    generation = 0;
    updateGenDisplay();

    grid = createEmptyGrid();

    // Choose text that fits
    const text = textFitsInGrid(NAME_FULL, cols) ? NAME_FULL : NAME_SHORT;
    renderTextToGrid(text, grid, rows, cols);
    draw();

    // Hold the name, then auto-start
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      playing = true;
      updatePlayBtn();
      animate();
    }, HOLD_DURATION);
  }

  function onResize() {
    sizeCanvas();
    resetToName();
  }

  // --- Simulation ---

  function step() {
    const newGrid = createEmptyGrid();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let neighbors = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = (r + dr + rows) % rows;
            const nc = (c + dc + cols) % cols;
            neighbors += grid[nr][nc];
          }
        }

        if (grid[r][c] === 1) {
          newGrid[r][c] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          newGrid[r][c] = (neighbors === 3) ? 1 : 0;
        }
      }
    }

    grid = newGrid;
    generation++;
    updateGenDisplay();
  }

  function animate() {
    if (!playing) return;
    step();
    draw();
    animId = setTimeout(() => requestAnimationFrame(animate), STEP_INTERVAL);
  }

  function stop() {
    playing = false;
    clearTimeout(holdTimer);
    if (animId) {
      clearTimeout(animId);
      animId = null;
    }
    updatePlayBtn();
  }

  // --- Drawing ---

  function draw() {
    if (!ctx) return;
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);

    // Slight fade trail instead of hard clear
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Draw live cells with glow
    ctx.shadowBlur = 4;
    ctx.shadowColor = CELL_GLOW_COLOR;
    ctx.fillStyle = CELL_COLOR;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 1) {
          ctx.fillRect(
            c * cellSize + 0.5,
            r * cellSize + 0.5,
            cellSize - 1,
            cellSize - 1
          );
        }
      }
    }

    // Reset shadow for performance
    ctx.shadowBlur = 0;
  }

  // --- Controls ---

  function bindControls() {
    // Play/Pause
    const playBtn = document.getElementById('life-play');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        clearTimeout(holdTimer);
        playing = !playing;
        updatePlayBtn();
        if (playing) animate();
      });
    }

    // Reset
    const resetBtn = document.getElementById('life-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetToName();
      });
    }

    // Click to toggle cells
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const c = Math.floor(x / cellSize);
      const r = Math.floor(y / cellSize);
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = grid[r][c] ? 0 : 1;
        draw();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        clearTimeout(holdTimer);
        playing = !playing;
        updatePlayBtn();
        if (playing) animate();
      } else if (e.code === 'KeyR') {
        resetToName();
      }
    });
  }

  function updatePlayBtn() {
    const btn = document.getElementById('life-play');
    if (btn) btn.textContent = playing ? 'pause' : 'play';
  }

  function updateGenDisplay() {
    const el = document.getElementById('life-gen');
    if (el) el.textContent = generation;
  }

  // --- Utilities ---

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // --- Start on DOM ready ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
