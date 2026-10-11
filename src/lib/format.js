export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Paths in data/*.json are site-root-relative without a leading slash.
export function url(path) {
  if (!path || /^(https?:|mailto:|#|\/)/i.test(path)) return path;
  return '/' + path;
}

export function isExternal(href) {
  return /^https?:\/\//i.test(href || '');
}

export function ytId(input) {
  const s = String(input || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Articles visible in listings: not drafts, not unlisted.
export function listedArticles(articles) {
  return (articles || [])
    .filter(a => a.published !== false && a.listed !== false)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function articleHref(a) {
  return a.external_url || `/articles/${a.slug}/`;
}

// "A and B and C" from Scholar exports, with Bakarji in bold.
export function fmtAuthors(raw) {
  return String(raw || '')
    .split(/\s+and\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(n => (/bakarji/i.test(n) ? `<strong>${esc(n)}</strong>` : esc(n)))
    .join(', ');
}

export function fmtVenue(v) {
  if (!v) return '';
  const s = String(v);
  if (/^arxiv preprint/i.test(s)) return 'arXiv';
  return s.replace(/,?\s*(19|20)\d{2}\s*$/, '');
}

// HTML stored in data/*.json (by the admin dashboard) uses page-relative
// "../" links from the old one-folder-per-page layout. Make them root-absolute
// and point old ?slug= article links at the new article pages.
export function rootLinks(html) {
  return String(html || '')
    .replace(/(src|href)="\.\.\//g, '$1="/')
    .replace(/(https:\/\/www\.josephbakarji\.com)?\/articles\/\?slug=([\w-]+)/g, '/articles/$2/');
}
