/**
 * Admin CMS — client-side logic
 */

(function () {
  let articles = [];
  let selectedSlug = null;
  let filter = 'all'; // all | local | substack | draft
  let dirty = false;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // --- Init ---

  async function init() {
    await loadArticles();
    renderList();
    bindToolbar();
    bindKeyboard();
  }

  // --- Data ---

  async function loadArticles() {
    const resp = await fetch('/api/articles');
    const data = await resp.json();
    articles = data.articles || [];
  }

  function getArticle(slug) {
    return articles.find(a => a.slug === slug);
  }

  // --- Article List ---

  function renderList() {
    const list = $('#article-list');
    const filtered = articles.filter(a => {
      if (filter === 'local') return a.source === 'local';
      if (filter === 'substack') return a.source === 'substack';
      if (filter === 'draft') return a.published === false;
      return true;
    });

    $('#article-count').textContent = `${filtered.length} / ${articles.length}`;

    list.innerHTML = filtered.map(a => {
      const isDraft = a.published === false;
      const cls = [
        'article-item',
        a.slug === selectedSlug ? 'selected' : '',
        isDraft ? 'draft' : '',
      ].join(' ').trim();

      const sourceBadge = a.source === 'substack'
        ? '<span class="badge badge-substack">substack</span>'
        : '<span class="badge badge-local">local</span>';
      const draftBadge = isDraft
        ? ' <span class="badge badge-draft">draft</span>'
        : '';

      return `
        <div class="${cls}" data-slug="${a.slug}">
          <div class="item-title">${esc(a.title)}</div>
          <div class="item-meta">
            <span>${a.date || 'no date'}</span>
            ${sourceBadge}${draftBadge}
          </div>
        </div>
      `;
    }).join('');

    // Bind clicks
    $$('.article-item', list).forEach(el => {
      el.addEventListener('click', () => selectArticle(el.dataset.slug));
    });
  }

  // --- Select Article ---

  async function selectArticle(slug) {
    if (dirty && !confirm('Unsaved changes. Discard?')) return;
    dirty = false;
    selectedSlug = slug;
    renderList();

    const article = getArticle(slug);
    if (!article) return;

    const panel = $('#editor-panel');
    panel.innerHTML = '';

    // Meta bar
    const metaBar = document.createElement('div');
    metaBar.className = 'meta-bar';
    metaBar.innerHTML = `
      <div class="field field-title">
        <label>Title</label>
        <input type="text" id="meta-title" value="${esc(article.title)}">
      </div>
      <div class="field field-slug">
        <label>Slug</label>
        <input type="text" id="meta-slug" value="${esc(article.slug)}">
      </div>
      <div class="field field-date">
        <label>Date</label>
        <input type="date" id="meta-date" value="${article.date || ''}">
      </div>
      <div class="field field-tags">
        <label>Tags</label>
        <input type="text" id="meta-tags" value="${(article.tags || []).join(', ')}">
      </div>
      <div class="field field-toggle">
        <input type="checkbox" id="meta-math" ${article.has_math ? 'checked' : ''}>
        <label for="meta-math">Math</label>
      </div>
      <div class="field field-toggle">
        <input type="checkbox" id="meta-published" ${article.published !== false ? 'checked' : ''}>
        <label for="meta-published">Published</label>
      </div>
      <button class="btn btn-green btn-sm" id="save-meta">Save meta</button>
      <button class="btn btn-red btn-sm" id="delete-article">Delete</button>
    `;
    panel.appendChild(metaBar);

    // Content area
    if (article.source === 'substack') {
      const notice = document.createElement('div');
      notice.className = 'substack-notice';
      notice.innerHTML = `
        <span>Substack article — content managed externally</span>
        <a href="${article.external_url}" target="_blank">${article.external_url}</a>
      `;
      panel.appendChild(notice);
    } else {
      // Markdown editor
      const editorContent = document.createElement('div');
      editorContent.className = 'editor-content';
      editorContent.innerHTML = `
        <div class="md-editor">
          <div class="pane-label">Markdown</div>
          <textarea id="md-textarea" spellcheck="false">Loading...</textarea>
        </div>
        <div class="md-preview-pane">
          <div class="pane-label">Preview</div>
          <div class="md-preview" id="md-preview"></div>
        </div>
      `;
      // Make preview pane scrollable
      editorContent.querySelector('.md-preview-pane').style.cssText = 'flex:1;display:flex;flex-direction:column;overflow:hidden;';
      editorContent.querySelector('.md-preview').style.cssText = 'flex:1;overflow-y:auto;padding:16px 20px;';
      panel.appendChild(editorContent);

      // Load content
      try {
        const resp = await fetch(`/api/articles/${slug}/content`);
        if (resp.ok) {
          const data = await resp.json();
          $('#md-textarea').value = data.content;
          updatePreview(data.content);
        } else {
          $('#md-textarea').value = `# ${article.title}\n\n`;
          updatePreview(`# ${article.title}\n\n`);
        }
      } catch (e) {
        $('#md-textarea').value = `# ${article.title}\n\n`;
      }

      // Live preview
      $('#md-textarea').addEventListener('input', (e) => {
        dirty = true;
        updatePreview(e.target.value);
      });
    }

    // Bind meta save
    $('#save-meta').addEventListener('click', saveMeta);
    $('#delete-article').addEventListener('click', deleteArticle);

    // Excerpt from meta inputs
    $$('.meta-bar input', panel).forEach(el => {
      el.addEventListener('change', () => { dirty = true; });
    });
  }

  // --- Save ---

  async function saveMeta() {
    if (!selectedSlug) return;

    const payload = {
      title: $('#meta-title').value,
      slug: $('#meta-slug').value,
      date: $('#meta-date').value,
      tags: $('#meta-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      has_math: $('#meta-math').checked,
      published: $('#meta-published').checked,
    };

    const resp = await fetch(`/api/articles/${selectedSlug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      const updated = await resp.json();
      selectedSlug = updated.slug;
      await loadArticles();
      renderList();
      toast('Metadata saved');
      dirty = false;
    } else {
      toast('Failed to save', true);
    }
  }

  async function saveContent() {
    if (!selectedSlug) return;
    const textarea = $('#md-textarea');
    if (!textarea) return;

    const resp = await fetch(`/api/articles/${selectedSlug}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: textarea.value }),
    });

    if (resp.ok) {
      toast('Content saved');
      dirty = false;
    } else {
      toast('Failed to save content', true);
    }
  }

  async function deleteArticle() {
    if (!selectedSlug) return;
    const article = getArticle(selectedSlug);
    if (!confirm(`Delete "${article.title}"?`)) return;

    const resp = await fetch(`/api/articles/${selectedSlug}?delete_file=true`, {
      method: 'DELETE',
    });

    if (resp.ok) {
      selectedSlug = null;
      await loadArticles();
      renderList();
      $('#editor-panel').innerHTML = '<div class="editor-empty">Select an article to edit</div>';
      toast('Article deleted');
    }
  }

  // --- New Article ---

  async function createArticle() {
    const title = prompt('Article title:');
    if (!title) return;

    const resp = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date: new Date().toISOString().slice(0, 10), published: false }),
    });

    if (resp.ok) {
      const article = await resp.json();
      await loadArticles();
      renderList();
      selectArticle(article.slug);
      toast('Article created (draft)');
    }
  }

  // --- Sync ---

  async function syncSubstack() {
    toast('Syncing Substack...');
    const resp = await fetch('/api/sync/substack', { method: 'POST' });
    const data = await resp.json();
    if (data.success) {
      await loadArticles();
      renderList();
      toast('Substack synced');
      showSyncOutput(data.output);
    } else {
      toast('Sync failed', true);
      showSyncOutput(data.error || data.output);
    }
  }

  async function syncScholar() {
    toast('Syncing Scholar...');
    const resp = await fetch('/api/sync/scholar', { method: 'POST' });
    const data = await resp.json();
    if (data.success) {
      toast('Scholar synced');
      showSyncOutput(data.output);
    } else {
      toast('Scholar sync failed', true);
      showSyncOutput(data.error || data.output);
    }
  }

  // --- Markdown Preview ---

  function updatePreview(md) {
    const preview = $('#md-preview');
    if (!preview) return;
    preview.innerHTML = renderMarkdown(md);
  }

  function renderMarkdown(md) {
    const lines = md.split('\n');
    let html = '';
    let inCode = false, codeBuf = '', codeLang = '';
    let inList = false, listType = '';

    for (const line of lines) {
      if (line.startsWith('```')) {
        if (inCode) {
          html += `<pre><code>${esc(codeBuf.trimEnd())}</code></pre>\n`;
          codeBuf = ''; codeLang = ''; inCode = false;
        } else {
          closeList(); codeLang = line.slice(3).trim(); inCode = true;
        }
        continue;
      }
      if (inCode) { codeBuf += line + '\n'; continue; }
      if (line.trim() === '') { closeList(); continue; }

      const hm = line.match(/^(#{1,6})\s+(.+)/);
      if (hm) { closeList(); const l = hm[1].length; html += `<h${l}>${inline(hm[2])}</h${l}>\n`; continue; }
      if (line.startsWith('> ')) { closeList(); html += `<blockquote><p>${inline(line.slice(2))}</p></blockquote>\n`; continue; }
      if (/^[-*]\s+/.test(line)) {
        if (!inList || listType !== 'ul') { closeList(); html += '<ul>\n'; inList = true; listType = 'ul'; }
        html += `<li>${inline(line.replace(/^[-*]\s+/, ''))}</li>\n`; continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        if (!inList || listType !== 'ol') { closeList(); html += '<ol>\n'; inList = true; listType = 'ol'; }
        html += `<li>${inline(line.replace(/^\d+\.\s+/, ''))}</li>\n`; continue;
      }
      closeList();
      html += `<p>${inline(line)}</p>\n`;
    }
    closeList();
    return html;

    function closeList() {
      if (inList) { html += listType === 'ul' ? '</ul>\n' : '</ol>\n'; inList = false; listType = ''; }
    }
  }

  function inline(t) {
    return t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  }

  // --- Toolbar ---

  function bindToolbar() {
    $('#btn-new').addEventListener('click', createArticle);
    $('#btn-sync-substack').addEventListener('click', syncSubstack);
    $('#btn-sync-scholar').addEventListener('click', syncScholar);
    $('#btn-preview').addEventListener('click', () => window.open('/', '_blank'));

    // Filter tabs
    $$('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        filter = tab.dataset.filter;
        $$('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderList();
      });
    });
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Cmd+S / Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveMeta();
        saveContent();
      }
    });
  }

  // --- Utils ---

  function esc(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, isError) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.className = 'toast'; }, 3000);
  }

  function showSyncOutput(text) {
    const el = $('#sync-output');
    el.textContent = text || '';
    el.className = 'sync-output show';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.className = 'sync-output'; }, 10000);
  }

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
