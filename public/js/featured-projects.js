/**
 * Landing page: featured project thumbnails.
 * Pulls from data/portfolio.json (single source of truth so the
 * grid and the /projects/ page can never drift), takes the first
 * N with `featured: true`, and renders them as square thumbnails
 * with title + one-line blurb.
 */
(function () {
  'use strict';

  const container = document.getElementById('featured-grid');
  if (!container) return;

  const MAX = 4; // cap so the landing stays scannable

  fetch('data/portfolio.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('portfolio load failed', err);
      container.innerHTML = '<div class="featured-card featured-card--skeleton">could not load projects.</div>';
    });

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function render(data) {
    const projects = (data.projects || [])
      .filter(p => p.published !== false && p.featured === true)
      .slice(0, MAX);

    if (!projects.length) {
      container.innerHTML = '<div class="featured-card featured-card--skeleton">no featured projects yet.</div>';
      return;
    }

    container.innerHTML = projects.map(p => {
      const thumb = p.thumbnail
        ? `<img class="featured-card-thumb" src="${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy">`
        : `<div class="featured-card-thumb featured-card-thumb--empty" aria-hidden="true">no thumbnail</div>`;
      return `
        <a class="featured-card" href="projects/#proj-${esc(p.id)}">
          ${thumb}
          <div class="featured-card-body">
            <h3 class="featured-card-title">${esc(p.title)}</h3>
            <p class="featured-card-blurb">${esc(p.blurb || '')}</p>
          </div>
        </a>
      `;
    }).join('');
  }
})();
