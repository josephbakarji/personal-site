(function () {
  'use strict';

  const listEl    = document.getElementById('pf-list');
  const editorEl  = document.getElementById('pf-editor');
  const countEl   = document.getElementById('pf-count');
  const newBtn    = document.getElementById('btn-new');
  const toastEl   = document.getElementById('toast');

  let projects = [];        // authoritative in-memory copy
  let themes   = [];        // theme options from portfolio.json
  let selectedId = null;    // id of the currently editing project
  let dirty = false;        // unsaved changes on the current form

  // Type labels for the per-link dropdown; keep in sync with LINK_TYPES in server.py
  const LINK_TYPES = ['paper', 'github', 'video', 'demo', 'essay', 'site', 'dataset'];

  // ─── Utilities ───────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function toast(msg, cls) {
    toastEl.textContent = msg;
    toastEl.className = 'toast show ' + (cls || '');
    setTimeout(() => { toastEl.className = 'toast'; }, 2600);
  }

  function slugify(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  }

  // ─── Load / render list ──────────────────────────────────────

  async function loadAll() {
    try {
      const resp = await fetch('/api/portfolio', { cache: 'no-store' });
      const data = await resp.json();
      projects = data.projects || [];
      themes   = data.themes   || [];
      renderList();
      if (selectedId && projects.find(p => p.id === selectedId)) {
        renderEditor(projects.find(p => p.id === selectedId));
      }
    } catch (e) {
      listEl.innerHTML = '<li class="pf-loading">failed to load projects</li>';
    }
  }

  function renderList() {
    countEl.textContent = `(${projects.length})`;
    if (!projects.length) {
      listEl.innerHTML = '<li class="pf-loading">no projects yet. click <em>+ new project</em>.</li>';
      return;
    }
    listEl.innerHTML = projects.map((p) => {
      const thumbHtml = p.thumbnail
        ? `<img class="pf-item-thumb" src="/${esc(p.thumbnail)}" alt="">`
        : `<div class="pf-item-thumb pf-item-thumb--empty">no img</div>`;
      const featured  = p.featured  ? '<span class="pf-flag on">★ featured</span>' : '';
      const draft     = p.published === false ? '<span class="pf-flag off">draft</span>' : '';
      const selected  = p.id === selectedId ? 'selected' : '';
      const meta = (p.tags || []).slice(0, 4).join(' · ') || '(no tags)';
      return `
        <li class="pf-item ${selected}" data-id="${esc(p.id)}" draggable="true">
          ${thumbHtml}
          <div class="pf-item-body">
            <div class="pf-item-title">${esc(p.title || '(untitled)')}</div>
            <div class="pf-item-meta">${esc(meta)}</div>
          </div>
          <div class="pf-item-flags">${featured}${draft}</div>
        </li>
      `;
    }).join('');
    wireListInteractions();
  }

  function wireListInteractions() {
    listEl.querySelectorAll('.pf-item').forEach((li) => {
      li.addEventListener('click', () => {
        const id = li.dataset.id;
        if (dirty && !confirm('You have unsaved changes. Discard them?')) return;
        selectedId = id;
        dirty = false;
        renderList();
        renderEditor(projects.find(p => p.id === id));
      });
      li.addEventListener('dragstart', (e) => {
        li.classList.add('dragging');
        e.dataTransfer.setData('text/plain', li.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      li.addEventListener('dragend', () => { li.classList.remove('dragging'); });
      li.addEventListener('dragover', (e) => { e.preventDefault(); li.classList.add('drag-over'); });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', async (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId  = li.dataset.id;
        if (!draggedId || draggedId === targetId) return;
        const fromIdx = projects.findIndex(p => p.id === draggedId);
        const toIdx   = projects.findIndex(p => p.id === targetId);
        if (fromIdx < 0 || toIdx < 0) return;
        const [moved] = projects.splice(fromIdx, 1);
        projects.splice(toIdx, 0, moved);
        renderList();
        // Persist new order
        try {
          const resp = await fetch('/api/portfolio/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order: projects.map(p => p.id) }),
          });
          if (!resp.ok) throw new Error();
          toast('reorder saved', 'ok');
        } catch (_) { toast('reorder failed', 'err'); loadAll(); }
      });
    });
  }

  // ─── Editor form ────────────────────────────────────────────

  function blankProject() {
    return {
      id: '',
      theme: '',
      title: '',
      thumbnail: '',
      tags: [],
      collaborators: [],
      blurb: '',
      description: '',
      links: [],
      video: null,
      featured: false,
      published: true,
    };
  }

  function renderEditor(p) {
    const project = p || blankProject();
    const isNew   = !p;
    const themeOptions = ['<option value="">(unassigned)</option>'].concat(
      themes.map(t => `<option value="${esc(t.id)}" ${project.theme === t.id ? 'selected' : ''}>${esc(t.title)}</option>`)
    ).join('');
    editorEl.innerHTML = `
      <div class="pf-form" data-orig-id="${esc(project.id)}">
        <h2>${isNew ? 'New project' : 'Edit project'}</h2>

        <div class="pf-field">
          <label for="pf-title">Title</label>
          <input type="text" id="pf-title" value="${esc(project.title)}" placeholder="e.g. Piano of Life">
        </div>

        <div class="pf-field">
          <label for="pf-id">ID (URL slug) <span class="pf-hint">auto-derived from title; edit only if you know what you're doing</span></label>
          <input type="text" id="pf-id" value="${esc(project.id)}" placeholder="auto">
        </div>

        <div class="pf-field">
          <label for="pf-theme">Theme <span class="pf-hint">groups this project on the /projects/ page</span></label>
          <select id="pf-theme">${themeOptions}</select>
        </div>

        <div class="pf-field">
          <label>Thumbnail</label>
          <div class="pf-thumb-row">
            <div class="pf-thumb-preview" id="pf-thumb-preview">
              ${project.thumbnail
                ? `<img src="/${esc(project.thumbnail)}" alt="">`
                : 'no thumbnail'}
            </div>
            <div class="pf-thumb-actions">
              <input type="text" id="pf-thumb-path" value="${esc(project.thumbnail || '')}" placeholder="assets/projects/your-image.jpg">
              <label class="btn" style="cursor:pointer; text-align:center;">
                upload image
                <input type="file" id="pf-thumb-file" accept="image/*" style="display:none;">
              </label>
              <p class="pf-hint">Upload copies the file into <code>assets/projects/</code> and fills the path above.</p>
            </div>
          </div>
        </div>

        <div class="pf-field">
          <label for="pf-video-url">Video <span class="pf-hint">YouTube / Vimeo URL, or a local path like <code>assets/projects/foo.mp4</code>. Only shown on featured cards.</span></label>
          <input type="text" id="pf-video-url" value="${esc(project.video?.url || '')}" placeholder="https://www.youtube.com/watch?v=...">
          <input type="text" id="pf-video-poster" value="${esc(project.video?.poster || '')}" placeholder="optional poster path (local video only)" style="margin-top:6px;">
        </div>

        <div class="pf-field">
          <label for="pf-tags">Tags <span class="pf-hint">comma-separated</span></label>
          <input type="text" id="pf-tags" value="${esc((project.tags || []).join(', '))}" placeholder="scientific ML, music, mechatronics">
        </div>

        <div class="pf-field">
          <label for="pf-collabs">Contributors <span class="pf-hint">comma-separated, in display order</span></label>
          <input type="text" id="pf-collabs" value="${esc((project.collaborators || []).join(', '))}" placeholder="Collaborator A, Collaborator B">
        </div>

        <div class="pf-field">
          <label for="pf-blurb">Blurb <span class="pf-hint">one-sentence summary shown on compact cards</span></label>
          <textarea id="pf-blurb" rows="2">${esc(project.blurb || '')}</textarea>
        </div>

        <div class="pf-field">
          <label for="pf-description">Description <span class="pf-hint">longer prose, only shown on featured cards (falls back to the blurb if empty)</span></label>
          <textarea id="pf-description" rows="6">${esc(project.description || '')}</textarea>
        </div>

        <div class="pf-field">
          <label>Links <span class="pf-hint">type picks the icon: paper, github, video, demo, essay, site, dataset</span></label>
          <div class="pf-links" id="pf-links"></div>
          <button type="button" class="btn" id="pf-add-link" style="align-self:flex-start; margin-top:6px;">+ add link</button>
        </div>

        <div class="pf-flags-row">
          <label><input type="checkbox" id="pf-featured" ${project.featured ? 'checked' : ''}> featured</label>
          <label><input type="checkbox" id="pf-published" ${project.published !== false ? 'checked' : ''}> published</label>
        </div>

        <div class="pf-actions">
          <button type="button" class="btn btn--primary" id="pf-save">${isNew ? 'create project' : 'save changes'}</button>
          ${isNew ? '' : '<button type="button" class="btn" id="pf-delete" style="color:var(--red); border-color:var(--red)">delete</button>'}
          <span class="grow"></span>
          <span class="pf-feedback" id="pf-feedback"></span>
        </div>
      </div>
    `;
    renderLinks(project.links || []);
    wireForm(project, isNew);
  }

  function renderLinks(links) {
    const box = document.getElementById('pf-links');
    box.innerHTML = links.map((l, i) => {
      const opts = ['<option value="">(auto)</option>'].concat(
        LINK_TYPES.map(t => `<option value="${t}" ${l.type === t ? 'selected' : ''}>${t}</option>`)
      ).join('');
      return `
        <div class="pf-link-row" data-idx="${i}">
          <input type="text" class="pf-link-label" value="${esc(l.label || '')}" placeholder="label">
          <input type="text" class="pf-link-href"  value="${esc(l.href  || '')}" placeholder="https://... or articles/?slug=...">
          <select class="pf-link-type" title="link type (icon)">${opts}</select>
          <button type="button" class="pf-link-remove" title="remove">×</button>
        </div>
      `;
    }).join('');
    box.querySelectorAll('.pf-link-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        btn.closest('.pf-link-row').remove();
        dirty = true;
      });
    });
    // Any typing in a link row = dirty
    box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { dirty = true; }));
  }

  function wireForm(project, isNew) {
    const titleInp  = document.getElementById('pf-title');
    const idInp     = document.getElementById('pf-id');
    const thumbInp  = document.getElementById('pf-thumb-path');
    const thumbPrev = document.getElementById('pf-thumb-preview');
    const fileInp   = document.getElementById('pf-thumb-file');

    // Any input flags dirty
    editorEl.querySelectorAll('input, textarea').forEach(el =>
      el.addEventListener('input', () => { dirty = true; }));

    // Auto-derive ID slug from title until the user manually edits the id field
    let idManuallyEdited = !!project.id;
    idInp.addEventListener('input', () => { idManuallyEdited = true; });
    titleInp.addEventListener('input', () => {
      if (!idManuallyEdited) idInp.value = slugify(titleInp.value);
    });

    // Thumbnail path field -> preview
    function refreshThumbPreview() {
      const path = thumbInp.value.trim();
      thumbPrev.innerHTML = path ? `<img src="/${esc(path)}" alt="">` : 'no thumbnail';
    }
    thumbInp.addEventListener('input', refreshThumbPreview);

    // Upload
    fileInp.addEventListener('change', async () => {
      const f = fileInp.files?.[0];
      if (!f) return;
      const fd = new FormData();
      fd.append('file', f);
      try {
        const resp = await fetch('/api/portfolio/upload', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error((await resp.json()).error || 'upload failed');
        const data = await resp.json();
        thumbInp.value = data.path;
        refreshThumbPreview();
        dirty = true;
        toast('image uploaded', 'ok');
      } catch (e) {
        toast(e.message || 'upload failed', 'err');
      }
    });

    // Add link
    document.getElementById('pf-add-link').addEventListener('click', () => {
      const links = collectLinks();
      links.push({ label: '', href: '' });
      renderLinks(links);
      dirty = true;
    });

    // Save
    document.getElementById('pf-save').addEventListener('click', () => save(project, isNew));

    // Delete
    const delBtn = document.getElementById('pf-delete');
    if (delBtn) delBtn.addEventListener('click', () => del(project));

    // Cmd/Ctrl-S saves
    editorEl.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        save(project, isNew);
      }
    });
  }

  function collectLinks() {
    return Array.from(document.querySelectorAll('#pf-links .pf-link-row')).map(row => {
      const link = {
        label: row.querySelector('.pf-link-label').value.trim(),
        href:  row.querySelector('.pf-link-href').value.trim(),
      };
      const type = row.querySelector('.pf-link-type')?.value?.trim();
      if (type) link.type = type;
      return link;
    }).filter(l => l.label && l.href);
  }

  function collectForm() {
    const title      = document.getElementById('pf-title').value.trim();
    const id         = document.getElementById('pf-id').value.trim() || slugify(title);
    const videoUrl   = document.getElementById('pf-video-url').value.trim();
    const videoPost  = document.getElementById('pf-video-poster').value.trim();
    return {
      id, title,
      theme:         document.getElementById('pf-theme').value.trim(),
      thumbnail:     document.getElementById('pf-thumb-path').value.trim(),
      tags:          document.getElementById('pf-tags').value.split(',').map(s => s.trim()).filter(Boolean),
      collaborators: document.getElementById('pf-collabs').value.split(',').map(s => s.trim()).filter(Boolean),
      blurb:         document.getElementById('pf-blurb').value.trim(),
      description:   document.getElementById('pf-description').value.trim(),
      links:         collectLinks(),
      video:         videoUrl ? { url: videoUrl, poster: videoPost || undefined } : null,
      featured:      document.getElementById('pf-featured').checked,
      published:     document.getElementById('pf-published').checked,
    };
  }

  async function save(project, isNew) {
    const payload = collectForm();
    const feedback = document.getElementById('pf-feedback');
    if (!payload.title) {
      feedback.textContent = 'title is required'; feedback.className = 'pf-feedback err';
      return;
    }
    try {
      let resp;
      if (isNew) {
        resp = await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(`/api/portfolio/${encodeURIComponent(project.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!resp.ok) throw new Error((await resp.json()).error || 'save failed');
      const saved = await resp.json();
      selectedId = saved.id;
      dirty = false;
      feedback.textContent = 'saved'; feedback.className = 'pf-feedback ok';
      toast('saved to portfolio.json', 'ok');
      await loadAll();
    } catch (e) {
      feedback.textContent = e.message || 'save failed';
      feedback.className = 'pf-feedback err';
    }
  }

  async function del(project) {
    if (!confirm(`Delete "${project.title}"? This can't be undone from the UI.`)) return;
    try {
      const resp = await fetch(`/api/portfolio/${encodeURIComponent(project.id)}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error((await resp.json()).error || 'delete failed');
      selectedId = null;
      dirty = false;
      editorEl.innerHTML = '<div class="pf-empty">Project deleted. Select another on the left.</div>';
      toast('deleted', 'ok');
      await loadAll();
    } catch (e) {
      toast(e.message || 'delete failed', 'err');
    }
  }

  // ─── Init ────────────────────────────────────────────────────

  newBtn.addEventListener('click', () => {
    if (dirty && !confirm('Discard current unsaved changes?')) return;
    selectedId = null;
    dirty = false;
    renderList();
    renderEditor(null);
  });

  loadAll();
})();
