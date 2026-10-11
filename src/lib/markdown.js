/**
 * Article markdown renderer, run at build time.
 *
 * Same line-based renderer the site has always used (each non-empty line is
 * its own paragraph, so existing articles render exactly as before), with
 * two changes: math is rendered to HTML by KaTeX here instead of in the
 * browser, and lines that are raw HTML blocks are passed through unwrapped.
 */
import katex from 'katex';

function renderMath(raw) {
  const display = raw.startsWith('$$');
  const tex = display ? raw.slice(2, -2) : raw.slice(1, -1);
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false });
  } catch {
    return raw;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

const BLOCK_HTML = /^<(div|figure|iframe|video|audio|table|section|details|aside|p|ul|ol|blockquote|hr)\b/i;

export function renderMarkdown(md) {
  // Pull math out first so line parsing and inline rules can't touch it.
  const math = [];
  const PH = (i) => ` MATH${i} `;
  md = md.replace(/\$\$([\s\S]+?)\$\$/g, (m) => { math.push(m); return PH(math.length - 1); });
  md = md.replace(/\$([^\$\n]+?)\$/g, (m) => { math.push(m); return PH(math.length - 1); });

  const lines = md.split('\n');
  let html = '';
  let inCode = false, codeBuf = '', codeLang = '';
  let inList = false, listType = '';

  const closeList = () => {
    if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; listType = ''; }
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html += `<pre><code class="language-${codeLang}">${escapeHtml(codeBuf.trimEnd())}</code></pre>\n`;
        codeBuf = ''; codeLang = ''; inCode = false;
      } else {
        closeList(); codeLang = line.slice(3).trim(); inCode = true;
      }
      continue;
    }
    if (inCode) { codeBuf += line + '\n'; continue; }
    if (line.trim() === '') { closeList(); continue; }

    const h = line.match(/^(#{2,6})\s+(.+)/);
    if (h) { closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>\n`; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { closeList(); html += '<hr>\n'; continue; }
    if (line.startsWith('> ')) { closeList(); html += `<blockquote><p>${inline(line.slice(2))}</p></blockquote>\n`; continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList || listType !== 'ul') { closeList(); html += '<ul>\n'; inList = true; listType = 'ul'; }
      html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>\n`;
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') { closeList(); html += '<ol>\n'; inList = true; listType = 'ol'; }
      html += `<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>\n`;
      continue;
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)$/);
    if (img) {
      closeList();
      html += img[3]
        ? `<figure><img src="${img[2]}" alt="${img[1]}"><figcaption>${img[3]}</figcaption></figure>\n`
        : `<img src="${img[2]}" alt="${img[1]}">\n`;
      continue;
    }
    if (BLOCK_HTML.test(line.trim())) { closeList(); html += line + '\n'; continue; }
    closeList();
    html += `<p>${inline(line)}</p>\n`;
  }
  closeList();

  html = html.replace(/ MATH(\d+) /g, (_m, i) => {
    const raw = math[+i];
    if (raw.startsWith('$$')) return `</p><div class="math-block">${renderMath(raw)}</div><p>`;
    return renderMath(raw);
  });
  html = html.replace(/<p>\s*<\/p>/g, '');

  // Articles used to live at /articles/?slug=x, so "../" meant the site root.
  // They now live at /articles/x/; make those links root-absolute.
  html = html.replace(/(src|href)="\.\.\//g, '$1="/');
  // Old-style article links point at the new pages.
  html = html.replace(/(https:\/\/www\.josephbakarji\.com)?\/articles\/\?slug=([\w-]+)/g, '/articles/$2/');
  return html;
}

// Title from the first "# " line, body without it.
export function splitTitle(md) {
  const m = md.match(/^# (.+)\n+/);
  return m ? { title: m[1].trim(), body: md.slice(m[0].length) } : { title: null, body: md };
}
