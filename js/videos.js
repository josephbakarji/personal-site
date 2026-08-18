(function () {
  'use strict';

  const grid = document.getElementById('video-grid');
  const filter = document.getElementById('video-filter');
  if (!grid) return;

  let allVideos = [];
  let activeKind = 'all';

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }

  function thumbUrl(id) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }

  function embedUrl(id) {
    return `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`;
  }

  function videoCard(v) {
    const desc = v.description ? `<p class="video-desc">${v.description}</p>` : '';
    const dateStr = v.date ? ` &middot; ${fmtDate(v.date)}` : '';
    return `
      <div class="video-card" data-kind="${v.kind}">
        <div class="video-thumb" data-yt="${v.youtube_id}">
          <img loading="lazy" src="${thumbUrl(v.youtube_id)}" alt="${v.title}">
          <div class="video-thumb-play" aria-hidden="true"></div>
        </div>
        <div class="video-meta">
          <div class="video-title">${v.title}</div>
          <div class="video-info">
            <span class="video-kind video-kind--${v.kind}">${v.kind}</span>${dateStr}
          </div>
          ${desc}
        </div>
      </div>
    `;
  }

  function emptyState() {
    return `
      <div class="video-empty">
        <p>No videos here yet.</p>
        <p>Adding them soon &mdash; talks, instrument demos, lecture excerpts.</p>
        <p>In the meantime: <a href="https://soundcloud.com/user-343358875" target="_blank" rel="noopener">soundcloud</a>.</p>
      </div>
    `;
  }

  function render() {
    const items = activeKind === 'all'
      ? allVideos
      : allVideos.filter(v => v.kind === activeKind);
    if (!items.length) {
      grid.innerHTML = emptyState();
      grid.classList.remove('video-grid');
      return;
    }
    grid.classList.add('video-grid');
    grid.innerHTML = items.map(videoCard).join('');
    // Wire click-to-embed
    grid.querySelectorAll('.video-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        const id = thumb.dataset.yt;
        const iframe = document.createElement('iframe');
        iframe.className = 'video-embed';
        iframe.src = embedUrl(id);
        iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
        iframe.allowFullscreen = true;
        thumb.replaceWith(iframe);
      });
    });
  }

  function renderFilter(kinds) {
    if (!allVideos.length || !kinds) {
      filter.innerHTML = '';
      return;
    }
    const presentKinds = new Set(allVideos.map(v => v.kind));
    const buttons = [
      `<button class="video-filter-btn ${activeKind === 'all' ? 'video-filter-btn--active' : ''}" data-kind="all">all</button>`
    ];
    for (const k of kinds) {
      if (!presentKinds.has(k.slug)) continue;
      buttons.push(`<button class="video-filter-btn ${activeKind === k.slug ? 'video-filter-btn--active' : ''}" data-kind="${k.slug}">${k.label.toLowerCase()}</button>`);
    }
    filter.innerHTML = buttons.join('');
    filter.querySelectorAll('.video-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activeKind = btn.dataset.kind;
        renderFilter(kinds);
        render();
      });
    });
  }

  fetch('../data/videos.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      allVideos = (data.videos || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      renderFilter(data.kinds);
      render();
    })
    .catch(err => {
      console.warn('videos.json load failed', err);
      grid.innerHTML = '<p style="color: var(--text-muted);">could not load videos.</p>';
    });
})();
