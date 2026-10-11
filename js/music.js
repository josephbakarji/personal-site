/**
 * /music/ renderer. Pulls data/music.json and lays out:
 *   - one Piano of Life player whose playlist is every piano piece with a
 *     local video and `gol: true`. The Game of Life grid is shared across
 *     the playlist, so what one piece grows carries into the next.
 *   - any other piano pieces (YouTube, or local without gol) as cards
 *   - rope-flow performances
 *   - an optional `live` list of upcoming dates
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const introEl = $('music-intro');
  const ropeEl  = $('rope-list');
  if (!ropeEl) return;

  fetch('../data/music.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('music.json load failed', err);
      ropeEl.innerHTML = '<p class="music-empty">could not load music.</p>';
    });

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Extract a YouTube video id from any common URL form.
  function ytId(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function fmtTime(t) {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function mediaHtml(item) {
    const v = item.video || {};
    if (v.type === 'local' && v.src) {
      return `<div class="piece-media piece-media--local">
          <video src="../${esc(v.src)}#t=0.1" controls playsinline preload="metadata"></video>
        </div>`;
    }
    const id = v.type === 'youtube' ? ytId(v.id || v.src) : null;
    if (id) {
      return `<div class="piece-media">
          <iframe src="https://www.youtube.com/embed/${esc(id)}" title="${esc(item.title)}"
                  frameborder="0" loading="lazy"
                  allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>`;
    }
    return '';
  }

  function cardHtml(item, extraClass = '') {
    const media = mediaHtml(item);
    if (!media) return '';
    const year = item.year ? `<span class="piece-year">${esc(item.year)}</span>` : '';
    return `
      <article class="music-piece ${extraClass}" id="${esc(item.id)}">
        ${media}
        <div class="piece-body">
          <h3 class="piece-title">${esc(item.title)} ${year}</h3>
          ${item.description ? `<p class="piece-desc">${item.description}</p>` : ''}
        </div>
      </article>`;
  }

  // ── Piano of Life player ──────────────────────────────────────────

  function mountPlayer(tracks) {
    const section = $('pol-player');
    if (!tracks.length || !window.PianoOfLife) { if (section) section.hidden = true; return; }

    const video    = $('pol-video');
    const playBtn  = $('pol-play');
    const filtBtn  = $('pol-filter');
    const simBtn   = $('pol-sim');
    const titleEl  = $('pol-now-title');
    const descEl   = $('pol-desc');
    const timeEl   = $('pol-time');
    const progEl   = $('pol-progress');
    const barEl    = $('pol-progress-bar');
    const listEl   = $('pol-playlist');

    listEl.innerHTML = tracks.map((t, i) => `
      <li class="pol-track" data-i="${i}">
        <button type="button">
          <span class="pol-track-n">${String(i + 1).padStart(2, '0')}</span>
          <span class="pol-track-title">${esc(t.title)}</span>
          <span class="pol-track-year">${esc(t.year || '')}</span>
        </button>
      </li>`).join('');

    let current = -1;
    let pol = null;

    function load(i, autoplay) {
      current = (i + tracks.length) % tracks.length;
      const t = tracks[current];
      video.src = '../' + t.video.src + '#t=0.1';  // fragment paints a first frame on mobile
      titleEl.textContent = t.title;
      descEl.innerHTML = t.description || '';
      descEl.hidden = !t.description;
      listEl.querySelectorAll('.pol-track').forEach((li) =>
        li.classList.toggle('is-current', +li.dataset.i === current));
      if (pol) {
        pol.setBand(t.pol?.band || {});
        pol.setFlipCols(t.pol?.flipCols ?? true);
      }
      if (autoplay) video.play().catch(() => {});
    }

    load(0, false);
    const t0 = tracks[0];
    requestAnimationFrame(() => {
      pol = window.PianoOfLife.mount({
        video, strip: $('pol-strip'), gol: $('pol-gol'),
        band: t0.pol?.band, flipCols: t0.pol?.flipCols ?? true,
        threshold: t0.pol?.threshold,
      });
    });

    playBtn.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {}); else video.pause();
    });
    video.addEventListener('click', () => playBtn.click());
    const syncPlay = () => {
      const playing = !video.paused && !video.ended;
      playBtn.classList.toggle('is-playing', playing);
      playBtn.setAttribute('aria-label', playing ? 'pause' : 'play');
    };
    video.addEventListener('play', () => { syncPlay(); $('pol-hint')?.remove(); });
    video.addEventListener('pause', syncPlay);
    video.addEventListener('ended', () => {
      syncPlay();
      if (current < tracks.length - 1) load(current + 1, true);
    });
    video.addEventListener('timeupdate', () => {
      timeEl.textContent = fmtTime(video.currentTime);
      barEl.style.width = video.duration ? `${(video.currentTime / video.duration) * 100}%` : '0';
    });
    progEl.addEventListener('click', (e) => {
      if (!video.duration) return;
      const r = progEl.getBoundingClientRect();
      video.currentTime = ((e.clientX - r.left) / r.width) * video.duration;
    });

    listEl.addEventListener('click', (e) => {
      const li = e.target.closest('.pol-track');
      if (!li) return;
      const i = +li.dataset.i;
      if (i === current) { playBtn.click(); return; }
      load(i, true);
    });

    filtBtn.addEventListener('click', () => {
      if (!pol) return;
      const on = filtBtn.getAttribute('aria-pressed') !== 'true';
      const ok = pol.setFilter(on);
      filtBtn.setAttribute('aria-pressed', ok ? 'true' : 'false');
    });

    simBtn.addEventListener('click', () => {
      if (!pol) return;
      const on = simBtn.getAttribute('aria-pressed') !== 'true';
      on ? pol.start() : pol.stop();
      simBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      simBtn.textContent = on ? 'simulation on' : 'simulation off';
    });
  }

  // ── Render ────────────────────────────────────────────────────────

  function render(data) {
    if (introEl) introEl.innerHTML = data.intro_html || '';
    const noteEl = $('piano-note');
    if (noteEl) {
      noteEl.textContent = data.piano_note || '';
      noteEl.hidden = !data.piano_note;
    }

    const piano  = data.piano || [];
    const tracks = piano.filter(p => p.gol && p.video?.type === 'local' && p.video?.src);
    const extra  = piano.filter(p => !tracks.includes(p));
    mountPlayer(tracks);

    if (extra.length) {
      $('piano-list').innerHTML = extra.map(p => cardHtml(p)).join('');
      $('piano-extra-section').hidden = false;
    }

    const rope = data.ropeflow || [];
    ropeEl.innerHTML = rope.length
      ? rope.map((r, i) => cardHtml(r, i === 0 ? 'music-piece--lead' : '')).join('')
      : '<p class="music-empty">no rope-flow videos yet.</p>';

    const live = (data.live || []).filter(l => l.date && l.title);
    if (live.length) {
      $('live-list').innerHTML = live.map(l => `
        <li class="live-item">
          <span class="live-date">${esc(l.date)}</span>
          <span class="live-title">${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>` : esc(l.title)}</span>
          ${l.place ? `<span class="live-place">${esc(l.place)}</span>` : ''}
        </li>`).join('');
      $('live-section').hidden = false;
    }
  }
})();
