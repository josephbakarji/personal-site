(function () {
  'use strict';

  const container = document.getElementById('portfolio-grid');
  if (!container) return;

  fetch('../data/portfolio.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('portfolio.json load failed', err);
      container.innerHTML = '<li class="portfolio-card portfolio-card--skeleton">could not load projects.</li>';
    });

  // ─── Helpers ──────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function isExternal(href) {
    return /^https?:\/\//i.test(href || '');
  }

  // Infer a link type from label/href when the JSON doesn't set one, so
  // older projects still get sensible icons without touching the data.
  function inferType(l) {
    if (l.type) return l.type;
    const lab = (l.label || '').toLowerCase();
    const h   = (l.href  || '').toLowerCase();
    if (h.includes('arxiv') || h.includes('openreview') || lab.includes('paper') || lab.includes('arxiv')) return 'paper';
    if (h.includes('github')) return 'github';
    if (h.includes('youtu') || h.includes('vimeo') || lab.includes('video')) return 'video';
    if (lab.includes('essay') || lab.includes('blog') || lab.includes('substack')) return 'essay';
    if (lab.includes('demo') || lab.includes('app')) return 'demo';
    return 'site';
  }

  // Compact monochrome icons keyed by link type
  const ICONS = {
    paper:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2h7l3 3v9H3z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M10 2v3h3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 8h6M5 10.5h6M5 13h4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>',
    github: '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .5C3.6.5 0 4.1 0 8.5c0 3.5 2.3 6.5 5.4 7.6.4.1.6-.2.6-.4v-1.6c-2.2.5-2.7-.9-2.7-.9-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-4 0-.9.3-1.6.8-2.2-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.8-3.6 4 .3.3.6.8.6 1.6v2.3c0 .2.2.5.6.4C13.7 15 16 12 16 8.5 16 4.1 12.4.5 8 .5z"/></svg>',
    video:  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3.5" width="10" height="9" rx="1" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12 6.5l2.5-1.5v6L12 9.5z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>',
    demo:   '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5 12 8l-6.5 4.5z" fill="currentColor"/></svg>',
    essay:  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 2.5h7l3 3v8h-10z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M5 6.5h4M5 9h6M5 11.5h5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>',
    site:   '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" fill="none" stroke="currentColor" stroke-width="1"/></svg>',
    dataset:'<svg viewBox="0 0 16 16" aria-hidden="true"><ellipse cx="8" cy="4" rx="5.5" ry="1.8" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 4v4c0 1 2.4 1.8 5.5 1.8s5.5-.8 5.5-1.8V4M2.5 8v4c0 1 2.4 1.8 5.5 1.8s5.5-.8 5.5-1.8V8" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>',
  };

  // Match a YouTube URL, extract the 11-char video ID for embedding.
  function ytEmbed(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }
  function vimeoEmbed(url) {
    const m = String(url || '').match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  }

  // ─── Render pieces ────────────────────────────────────────────

  function mediaHtml(p) {
    if (p.video?.url) {
      const yt    = ytEmbed(p.video.url);
      const vimeo = vimeoEmbed(p.video.url);
      if (yt || vimeo) {
        return `<div class="portfolio-media portfolio-media--video">
          <iframe src="${esc(yt || vimeo)}" title="${esc(p.title)}" loading="lazy"
                  frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>
        </div>`;
      }
      // Local video file
      const poster = p.video.poster ? `poster="../${esc(p.video.poster)}"` : '';
      return `<div class="portfolio-media portfolio-media--video">
        <video src="../${esc(p.video.url)}" ${poster} controls preload="metadata"></video>
      </div>`;
    }
    if (p.thumbnail) {
      return `<div class="portfolio-media">
        <img src="../${esc(p.thumbnail)}" alt="${esc(p.title)}" loading="lazy">
      </div>`;
    }
    return `<div class="portfolio-media portfolio-media--empty" aria-hidden="true">no image</div>`;
  }

  function tagsHtml(tags) {
    if (!tags?.length) return '';
    return `<div class="portfolio-card-tags">${
      tags.map(t => `<span class="portfolio-tag">${esc(t)}</span>`).join('')
    }</div>`;
  }

  function peopleHtml(collaborators) {
    if (!collaborators?.length) return '';
    return `<div class="portfolio-card-people"><span class="portfolio-card-people-label">with</span> ${
      collaborators.map(esc).join(', ')
    }</div>`;
  }

  function linksHtml(links) {
    if (!links?.length) return '';
    return `<ul class="portfolio-card-links">${
      links.map(l => {
        const type = inferType(l);
        const icon = ICONS[type] || ICONS.site;
        const ext  = isExternal(l.href) ? ' target="_blank" rel="noopener"' : '';
        return `<li><a class="portfolio-link portfolio-link--${type}" href="${esc(l.href)}"${ext}>${icon}<span>${esc(l.label)}</span></a></li>`;
      }).join('')
    }</ul>`;
  }

  function cardHtml(p) {
    // Prefer the longer description; fall back to the blurb so a card is
    // never empty. GIF thumbnails (assets/projects/foo.gif) are rendered
    // by the browser natively via <img>, so no special handling needed.
    const body = p.description || p.blurb || '';
    return `
      <article class="portfolio-card" id="proj-${esc(p.id)}" data-id="${esc(p.id)}">
        ${mediaHtml(p)}
        <div class="portfolio-card-body">
          <h3 class="portfolio-card-title">${esc(p.title)}</h3>
          ${tagsHtml(p.tags)}
          ${body ? `<p class="portfolio-card-desc">${esc(body)}</p>` : ''}
          ${peopleHtml(p.collaborators)}
          ${linksHtml(p.links)}
        </div>
      </article>
    `;
  }

  function themeSectionHtml(theme, projects) {
    if (!projects.length) return '';
    // Keep the featured-first ordering (stable sort), but render every
    // card at the same size so the page reads as one consistent grid.
    const ordered = projects.slice().sort((a, b) => (b.featured === true) - (a.featured === true));
    return `
      <section class="portfolio-theme" id="theme-${esc(theme.id)}">
        <header class="portfolio-theme-head">
          <h2 class="portfolio-theme-title">${esc(theme.title)}</h2>
          ${theme.blurb ? `<p class="portfolio-theme-blurb">${esc(theme.blurb)}</p>` : ''}
        </header>
        <div class="portfolio-list">${ordered.map(cardHtml).join('')}</div>
      </section>
    `;
  }

  function render(data) {
    const projects = (data.projects || []).filter(p => p.published !== false);
    const themes   = (data.themes || []);

    // Group projects by theme id, keep original ordering within a theme
    const byTheme = new Map(themes.map(t => [t.id, []]));
    const orphans = [];
    for (const p of projects) {
      if (byTheme.has(p.theme)) byTheme.get(p.theme).push(p);
      else orphans.push(p);
    }

    let html = themes.map(t => themeSectionHtml(t, byTheme.get(t.id))).join('');
    if (orphans.length) {
      html += themeSectionHtml({ id: 'other', title: 'Other', blurb: '' }, orphans);
    }
    if (!html) {
      html = '<p class="portfolio-empty">no projects yet.</p>';
    }
    container.innerHTML = html;
  }
})();
