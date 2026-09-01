/**
 * Landing: selected publications.
 * Pulls from data/publications.json (auto-synced from Google Scholar),
 * ranks by citation count so the top-cited work floats to the top, and
 * caps at MAX. Any pub can be pinned by setting `featured: true` in
 * publications.json — those always show first, then the rest by cites.
 */
(function () {
  'use strict';

  const container = document.getElementById('selected-pubs');
  if (!container) return;

  const MAX = 5;

  fetch('data/publications.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('publications load failed', err);
      container.innerHTML = '<li class="pubs-item pubs-item--skeleton">could not load publications.</li>';
    });

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // "A and B and C" from Scholar exports → "A, B, C". Bold "Bakarji" so
  // he stands out in the author list.
  function fmtAuthors(raw) {
    const list = String(raw || '')
      .split(/\s+and\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    return list.map(n =>
      /bakarji/i.test(n) ? `<strong>${esc(n)}</strong>` : esc(n)
    ).join(', ');
  }

  // Compact venue string. Scholar sometimes gives "arXiv preprint arXiv:xxx",
  // shorten to "arXiv" in that case.
  function fmtVenue(v) {
    if (!v) return '';
    const s = String(v);
    if (/^arxiv preprint/i.test(s)) return 'arXiv';
    return s;
  }

  function render(data) {
    let pubs = (data.publications || []).slice();

    // Featured first (manual override), then by citation count desc,
    // then by year desc as a stable tie-breaker.
    pubs.sort((a, b) => {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fa !== fb) return fb - fa;
      const ca = a.citations || 0;
      const cb = b.citations || 0;
      if (ca !== cb) return cb - ca;
      return (b.year || 0) - (a.year || 0);
    });

    pubs = pubs.slice(0, MAX);

    if (!pubs.length) {
      container.innerHTML = '<li class="pubs-item pubs-item--skeleton">no publications yet.</li>';
      return;
    }

    container.innerHTML = pubs.map(p => {
      const authors = fmtAuthors(p.authors);
      const venue   = fmtVenue(p.venue);
      const year    = p.year || '';
      const cites   = (p.citations || 0);
      const link    = p.url || p.eprint;
      const titleEl = link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
        : esc(p.title);
      return `
        <li class="pubs-item">
          <div class="pubs-title">${titleEl}</div>
          <div class="pubs-meta">
            <span class="pubs-authors">${authors}</span>
            <span class="pubs-dot">·</span>
            <span class="pubs-venue">${esc(venue)}</span>
            ${year ? `<span class="pubs-dot">·</span><span class="pubs-year">${esc(year)}</span>` : ''}
            ${cites ? `<span class="pubs-dot">·</span><span class="pubs-cites">${cites} citation${cites === 1 ? '' : 's'}</span>` : ''}
          </div>
        </li>
      `;
    }).join('');
  }
})();
