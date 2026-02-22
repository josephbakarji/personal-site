/**
 * Articles system
 * - Listing page: loads articles.json, renders cards
 * - Viewer page: loads .md from content/articles/, renders with marked + KaTeX
 */

(function () {
  const DATA_PATH = '../data/articles.json';
  const CONTENT_PATH = '../content/articles/';

  // Detect which mode we're in based on URL
  function init() {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug');

    if (slug) {
      loadArticle(slug);
    } else {
      loadListing();
    }
  }

  // --- Listing ---

  async function loadListing() {
    const container = document.getElementById('article-list');
    if (!container) return;

    try {
      const resp = await fetch(DATA_PATH);
      const data = await resp.json();

      const articles = data.articles.sort((a, b) => b.date.localeCompare(a.date));

      container.innerHTML = articles.map(a => {
        const href = a.external_url
          ? a.external_url
          : `?slug=${a.slug}`;
        const target = a.external_url ? ' target="_blank" rel="noopener"' : '';
        const sourceTag = a.source === 'substack'
          ? '<span class="article-tag" style="color:var(--accent-yellow);border-color:rgba(229,192,123,0.3)">substack</span>'
          : '';
        const externalIcon = a.external_url ? ' ↗' : '';

        return `
          <a class="article-card" href="${href}"${target}>
            <div class="article-title">${a.title}${externalIcon}</div>
            <div class="article-meta">${formatDate(a.date)}${a.has_math ? ' · math' : ''}</div>
            <div class="article-excerpt">${a.excerpt}</div>
            <div class="article-tags">
              ${a.tags.map(t => `<span class="article-tag">${t}</span>`).join('')}
              ${sourceTag}
            </div>
          </a>
        `;
      }).join('');
    } catch (e) {
      container.innerHTML = '<p style="color:var(--text-muted)">Failed to load articles.</p>';
    }
  }

  // --- Viewer ---

  async function loadArticle(slug) {
    const headerEl = document.getElementById('article-header');
    const contentEl = document.getElementById('article-content');
    if (!contentEl) return;

    // Show loading
    contentEl.innerHTML = '<p style="color:var(--text-muted)">Loading...</p>';

    try {
      // Load metadata
      const metaResp = await fetch(DATA_PATH);
      const metaData = await metaResp.json();
      const meta = metaData.articles.find(a => a.slug === slug);

      if (headerEl && meta) {
        headerEl.innerHTML = `
          <h1>${meta.title}</h1>
          <div class="meta">${formatDate(meta.date)} · ${meta.tags.join(' · ')}</div>
        `;
      }

      // Load markdown
      const mdResp = await fetch(CONTENT_PATH + slug + '.md');
      if (!mdResp.ok) throw new Error('Article not found');
      const md = await mdResp.text();

      // Render markdown (skip the first H1 since we show it in the header)
      let processed = md.replace(/^# .+\n+/, '');
      contentEl.innerHTML = renderMarkdown(processed);

      // Render math if KaTeX is loaded
      if (window.renderMathInElement) {
        renderMathInElement(contentEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
          throwOnError: false
        });
      }

      // Update page title
      if (meta) document.title = meta.title + ' — Joseph Bakarji';

    } catch (e) {
      contentEl.innerHTML = `<p style="color:var(--accent-red)">Article not found: ${slug}</p>`;
    }
  }

  // --- Minimal Markdown Renderer ---
  // Handles: headings, paragraphs, bold, italic, code, links, images,
  // blockquotes, lists, horizontal rules, figures
  // Does NOT handle nested lists or complex constructs — use marked.js for that

  function renderMarkdown(md) {
    const lines = md.split('\n');
    let html = '';
    let inCodeBlock = false;
    let codeBuffer = '';
    let codeLang = '';
    let inList = false;
    let listType = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fenced code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          html += `<pre><code class="language-${codeLang}">${escapeHtml(codeBuffer.trimEnd())}</code></pre>\n`;
          codeBuffer = '';
          codeLang = '';
          inCodeBlock = false;
        } else {
          closeList();
          codeLang = line.slice(3).trim();
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer += line + '\n';
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        closeList();
        continue;
      }

      // Headings
      const headingMatch = line.match(/^(#{2,6})\s+(.+)/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        html += `<h${level}>${inline(headingMatch[2])}</h${level}>\n`;
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
        closeList();
        html += '<hr>\n';
        continue;
      }

      // Blockquote
      if (line.startsWith('> ')) {
        closeList();
        html += `<blockquote><p>${inline(line.slice(2))}</p></blockquote>\n`;
        continue;
      }

      // Unordered list
      if (/^[-*]\s+/.test(line)) {
        if (!inList || listType !== 'ul') {
          closeList();
          html += '<ul>\n';
          inList = true;
          listType = 'ul';
        }
        html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>\n`;
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+/.test(line)) {
        if (!inList || listType !== 'ol') {
          closeList();
          html += '<ol>\n';
          inList = true;
          listType = 'ol';
        }
        html += `<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>\n`;
        continue;
      }

      // Image with optional figure/caption: ![alt](src "caption")
      const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+?)(?:\s+"([^"]*)")?\)$/);
      if (imgMatch) {
        closeList();
        const alt = imgMatch[1];
        const src = imgMatch[2];
        const caption = imgMatch[3];
        if (caption) {
          html += `<figure><img src="${src}" alt="${alt}"><figcaption>${caption}</figcaption></figure>\n`;
        } else {
          html += `<img src="${src}" alt="${alt}">\n`;
        }
        continue;
      }

      // Paragraph
      closeList();
      html += `<p>${inline(line)}</p>\n`;
    }

    closeList();
    return html;

    function closeList() {
      if (inList) {
        html += listType === 'ul' ? '</ul>\n' : '</ol>\n';
        inList = false;
        listType = '';
      }
    }
  }

  // Inline markdown: bold, italic, code, links, images
  function inline(text) {
    return text
      // Inline code (before other processing)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // Bold + italic
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // --- Init ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
