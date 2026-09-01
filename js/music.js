/**
 * /music/ renderer — pulls from data/music.json and lays out three sections:
 * piano pieces (optional Piano-of-Life panel per piece), rope-flow performances
 * (YouTube embeds), and a browser physics sim iframe at the bottom.
 */
(function () {
  'use strict';

  const introEl   = document.getElementById('music-intro');
  const wipEl     = document.getElementById('music-wip');
  const pianoEl   = document.getElementById('piano-list');
  const ropeEl    = document.getElementById('rope-list');
  const simFrame  = document.getElementById('ropeflow-sim');
  const simBlurb  = document.getElementById('rope-sim-blurb');
  const simSec    = document.getElementById('ropeflow-sim-section');
  if (!pianoEl) return;

  fetch('../data/music.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('music.json load failed', err);
      pianoEl.innerHTML = '<p class="music-empty">could not load music.</p>';
      ropeEl.innerHTML  = '';
    });

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Extract a YouTube video id from any common URL form. Returns null if
  // the id can't be found, in which case we render a "no video" placeholder.
  function ytId(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function pianoPieceHtml(p, i) {
    const hasLocal = p.video?.type === 'local' && p.video?.src;
    const hasYt    = p.video?.type === 'youtube' && ytId(p.video.id || p.video.src);

    let mediaHtml = '';
    if (hasLocal) {
      const golPanel = p.gol
        ? `<canvas class="pol-strip" id="pol-strip-${i}"></canvas>
           <div class="pol-substrate">
             <canvas class="pol-gol" id="pol-gol-${i}"></canvas>
             <button class="pol-stop" id="pol-stop-${i}" type="button" aria-pressed="true" title="stop simulation" aria-label="stop simulation">
               <svg class="ic ic-pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="0.5"/><rect x="9" y="3" width="3" height="10" rx="0.5"/></svg>
               <svg class="ic ic-play"  viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6L13 8z"/></svg>
             </button>
           </div>`
        : '';
      const mediaClasses = [
        'piece-media',
        p.gol ? 'piece-media--with-gol' : '',
      ].filter(Boolean).join(' ');
      mediaHtml = `
        <div class="${mediaClasses}">
          <div class="pol-video-wrap">
            <video id="piece-video-${i}" src="../${esc(p.video.src)}" controls playsinline preload="metadata"></video>
          </div>
          ${golPanel}
        </div>`;
    } else if (hasYt) {
      mediaHtml = `
        <div class="piece-media piece-media--youtube">
          <iframe src="https://www.youtube.com/embed/${esc(hasYt)}" title="${esc(p.title)}"
                  frameborder="0" loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>`;
    } else {
      mediaHtml = `<div class="piece-media piece-media--empty">no video yet</div>`;
    }

    const gnote = p.gol && !hasLocal
      ? `<p class="piece-note">Piano-of-Life coupling requires a local <code>.mp4</code> video (YouTube frames aren't accessible from the page).</p>`
      : '';

    const year = p.year ? `<span class="piece-year">${esc(p.year)}</span>` : '';

    return `
      <article class="music-piece" id="${esc(p.id)}" data-id="${esc(p.id)}">
        ${mediaHtml}
        <div class="piece-body">
          <h3 class="piece-title">${esc(p.title)} ${year}</h3>
          ${p.description ? `<p class="piece-desc">${p.description}</p>` : ''}
          ${gnote}
        </div>
      </article>
    `;
  }

  function ropeItemHtml(r, i) {
    const hasLocal = r.video?.type === 'local' && r.video?.src;
    const ytid     = r.video?.type === 'youtube' ? ytId(r.video.id || r.video.src) : null;
    let media = '';
    if (hasLocal) {
      media = `<div class="piece-media piece-media--rope-local">
          <video src="../${esc(r.video.src)}" controls playsinline preload="metadata"></video>
        </div>`;
    } else if (ytid) {
      media = `<div class="piece-media piece-media--youtube">
          <iframe src="https://www.youtube.com/embed/${esc(ytid)}" title="${esc(r.title)}"
                  frameborder="0" loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>`;
    } else {
      media = `<div class="piece-media piece-media--empty">drop a video src or YouTube URL in music.json</div>`;
    }
    const year = r.year ? `<span class="piece-year">${esc(r.year)}</span>` : '';
    return `
      <article class="music-piece music-piece--rope" id="${esc(r.id)}" data-id="${esc(r.id)}">
        ${media}
        <div class="piece-body">
          <h3 class="piece-title">${esc(r.title)} ${year}</h3>
          ${r.description ? `<p class="piece-desc">${r.description}</p>` : ''}
        </div>
      </article>
    `;
  }

  function render(data) {
    if (introEl) introEl.innerHTML = data.intro_html || '';
    if (wipEl && data.under_construction_note) {
      wipEl.innerHTML = `<span class="wip-tag">// under construction</span> ${esc(data.under_construction_note)}`;
    }
    const pianoNoteEl = document.getElementById('piano-note');
    if (pianoNoteEl) {
      pianoNoteEl.textContent = data.piano_note || '';
      if (!data.piano_note) pianoNoteEl.style.display = 'none';
    }

    const pianoPieces = data.piano || [];
    pianoEl.innerHTML = pianoPieces.length
      ? pianoPieces.map(pianoPieceHtml).join('')
      : '<p class="music-empty">no pieces yet.</p>';

    const ropeItems = data.ropeflow || [];
    ropeEl.innerHTML = ropeItems.length
      ? ropeItems.map(ropeItemHtml).join('')
      : '<p class="music-empty">no rope-flow videos yet.</p>';

    // Wire up Piano of Life on any piece that opted in and has a local video.
    pianoPieces.forEach((p, i) => {
      if (!p.gol || p.video?.type !== 'local') return;
      const video = document.getElementById(`piece-video-${i}`);
      const strip = document.getElementById(`pol-strip-${i}`);
      const gol   = document.getElementById(`pol-gol-${i}`);
      if (video && gol && window.PianoOfLife) {
        // Wait until dimensions are known before mounting so canvases get the
        // right pixel size on first paint. Per-piece overrides come from
        // music.json's `pol` field: { band: {axis, position, thickness},
        // threshold, flipCols, ... }.
        const stopBtn = document.getElementById(`pol-stop-${i}`);
        const cfg = { video, strip, gol, stopBtn };
        if (p.pol?.band)                  cfg.band      = p.pol.band;
        if (p.pol?.threshold != null)     cfg.threshold = p.pol.threshold;
        if (p.pol?.flipCols  != null)     cfg.flipCols  = p.pol.flipCols;
        requestAnimationFrame(() => window.PianoOfLife.mount(cfg));
      }
    });

    // Ropeflow simulator iframe
    if (data.simulation?.src && simFrame) {
      simFrame.src = data.simulation.src;
      if (simBlurb) simBlurb.textContent = data.simulation.blurb || '';
    } else if (simSec) {
      simSec.style.display = 'none';
    }
  }
})();
