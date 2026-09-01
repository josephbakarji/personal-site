(function () {
  'use strict';

  const container = document.getElementById('recent-articles');
  if (!container) return;

  const MAX_ITEMS = 3;

  function fmtDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }

  function render(articles) {
    if (!articles || articles.length === 0) {
      container.innerHTML = '<li class="writing-item writing-item--skeleton">nothing yet.</li>';
      return;
    }
    // Filter out drafts (`published: false`) and unlisted entries
    // (`listed: false`), then sort by date desc and take top MAX_ITEMS.
    const visible = articles.filter(a => a.published !== false && a.listed !== false);
    const sorted = visible.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const top = sorted.slice(0, MAX_ITEMS);

    container.innerHTML = top.map(a => {
      const href = a.source === 'substack' && a.external_url
        ? a.external_url
        : `articles/?slug=${encodeURIComponent(a.slug)}`;
      const target = href.startsWith('http') ? 'target="_blank" rel="noopener"' : '';
      const excerpt = a.excerpt
        ? `<span class="writing-excerpt">${a.excerpt.slice(0, 180)}${a.excerpt.length > 180 ? '&hellip;' : ''}</span>`
        : '';
      return `
        <li class="writing-item">
          <a href="${href}" ${target}>
            <span class="writing-date">${fmtDate(a.date)}</span>
            <span>
              <span class="writing-title">${a.title}</span>
              ${excerpt}
            </span>
          </a>
        </li>
      `;
    }).join('');
  }

  fetch('data/articles.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => render(data.articles))
    .catch(err => {
      console.warn('articles.json load failed', err);
      container.innerHTML = '<li class="writing-item writing-item--skeleton">could not load articles.</li>';
    });
})();
