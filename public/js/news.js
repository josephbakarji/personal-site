(function () {
  'use strict';

  const container = document.getElementById('news-list');
  if (!container) return;

  const INITIAL_ITEMS = 5;

  function fmtDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${MONTHS[m - 1]} ${d}, ${y}`;
  }

  function itemHtml(item, hidden) {
    const kindClass = `news-kind news-kind--${item.kind || 'writing'}`;
    const body = item.link
      ? `<a href="${item.link}" ${item.link.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${item.headline}</a>`
      : item.headline;
    const note = item.note
      ? `<span class="news-note"> &middot; ${item.note}</span>`
      : '';
    const cls = hidden ? 'news-item news-item--extra' : 'news-item';
    const attr = hidden ? ' hidden' : '';
    return `
      <li class="${cls}"${attr}>
        <span class="news-date">${fmtDate(item.date)}</span>
        <span class="${kindClass}">${item.kind || 'writing'}</span>
        <span class="news-body">${body}${note}</span>
      </li>
    `;
  }

  function render(items) {
    if (!items || items.length === 0) {
      container.innerHTML = '<li class="news-item news-item--skeleton">nothing yet.</li>';
      return;
    }

    const sorted = items.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const initial = sorted.slice(0, INITIAL_ITEMS);
    const rest = sorted.slice(INITIAL_ITEMS);

    let html = initial.map(i => itemHtml(i, false)).join('');
    html += rest.map(i => itemHtml(i, true)).join('');

    if (rest.length > 0) {
      html += `
        <li class="news-toggle-row">
          <button type="button" class="news-toggle" id="news-toggle" aria-expanded="false">
            show ${rest.length} more
          </button>
        </li>
      `;
    }

    container.innerHTML = html;

    const btn = document.getElementById('news-toggle');
    const extras = container.querySelectorAll('.news-item--extra');
    if (btn && extras.length) {
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        extras.forEach(el => { el.hidden = expanded; });
        btn.textContent = expanded ? `show ${rest.length} more` : 'show fewer';
        btn.setAttribute('aria-expanded', String(!expanded));
      });
    }
  }

  fetch('data/news.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => render(data.items))
    .catch(err => {
      console.warn('news.json load failed', err);
      container.innerHTML = '<li class="news-item news-item--skeleton">could not load news.</li>';
    });
})();
