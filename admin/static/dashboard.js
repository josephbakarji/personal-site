/**
 * Dashboard — client-side logic
 */
(function () {
  const STAGES = ['raw', 'exploring', 'prototype', 'draft', 'submittable', 'published', 'parked'];
  let ideas = [];
  let editingId = null;

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  // --- Init ---

  let sessions = [];
  let allProjects = [];
  let knownCollaborators = [];
  let projectSort = 'priority';
  let projectFilter = 'all';

  async function init() {
    await Promise.all([
      loadStats(),
      loadIdeas(),
      loadSessions(),
      loadVoiceMemos(),
      loadProjects(),
      loadPapers(),
    ]);
    bindEvents();
  }

  // --- Stats ---

  async function loadStats() {
    try {
      const resp = await fetch('/api/dashboard/stats');
      const data = await resp.json();
      const bar = $('#stats-bar');
      const stages = data.ideas_by_stage || {};
      bar.innerHTML = `
        <div class="stat"><span class="stat-num">${data.ideas}</span><span class="stat-label">ideas</span></div>
        <div class="stat"><span class="stat-num">${stages.draft || 0}</span><span class="stat-label">drafts</span></div>
        <div class="stat"><span class="stat-num">${stages.prototype || 0}</span><span class="stat-label">prototypes</span></div>
        <div class="stat"><span class="stat-num">${data.articles_local || 0}</span><span class="stat-label">articles</span></div>
        <div class="stat"><span class="stat-num">${data.articles}</span><span class="stat-label">total posts</span></div>
      `;
    } catch (e) {
      $('#stats-bar').innerHTML = '<div class="empty">Failed to load stats</div>';
    }
  }

  // --- Ideas Pipeline ---

  async function loadIdeas() {
    try {
      const resp = await fetch('/api/dashboard/ideas');
      const data = await resp.json();
      ideas = data.ideas || [];
      renderPipeline();
    } catch (e) {
      $('#pipeline').innerHTML = '<div class="empty">Failed to load ideas</div>';
    }
  }

  function renderPipeline() {
    const pipeline = $('#pipeline');
    const activeStages = STAGES.filter(s => s !== 'parked');
    const parked = ideas.filter(i => i.stage === 'parked');

    pipeline.innerHTML = activeStages.map(stage => {
      const stageIdeas = ideas.filter(i => i.stage === stage);
      return `
        <div class="pipeline-col">
          <div class="pipeline-col-header">
            <span>${stage}</span>
            <span class="col-count">${stageIdeas.length}</span>
          </div>
          <div class="pipeline-col-body">
            ${stageIdeas.length === 0 ? '' : stageIdeas.map(i => renderIdeaCard(i)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add parked column if any
    if (parked.length > 0) {
      pipeline.innerHTML += `
        <div class="pipeline-col" style="opacity:0.5">
          <div class="pipeline-col-header">
            <span>parked</span>
            <span class="col-count">${parked.length}</span>
          </div>
          <div class="pipeline-col-body">
            ${parked.map(i => renderIdeaCard(i)).join('')}
          </div>
        </div>
      `;
    }

    // Bind card clicks
    $$('.idea-card', pipeline).forEach(card => {
      card.addEventListener('click', () => openIdeaModal(card.dataset.id));
    });
  }

  function renderIdeaCard(idea) {
    const tags = (idea.tags || []).slice(0, 3).map(t =>
      `<span class="idea-card-tag">${t}</span>`
    ).join('');

    let badges = '';
    if (idea.linked_paper) badges += '<span class="link-badge link-badge-paper">paper</span>';
    if (idea.linked_article) badges += '<span class="link-badge link-badge-article">article</span>';
    if (idea.linked_project) badges += '<span class="link-badge link-badge-project">project</span>';

    return `
      <div class="idea-card" data-id="${idea.id}">
        <div class="idea-card-title">${esc(idea.title)}</div>
        <div class="idea-card-meta">
          <span>${idea.date}</span>
          ${tags}
        </div>
        ${badges ? `<div class="link-badges">${badges}</div>` : ''}
      </div>
    `;
  }

  // --- Voice Memos ---

  async function loadVoiceMemos() {
    try {
      const resp = await fetch('/api/dashboard/voice-memos?count=10');
      const data = await resp.json();
      const list = $('#memo-list');
      const memos = data.memos || [];
      if (memos.length === 0) {
        list.innerHTML = '<div class="empty">No recent voice memos</div>';
        return;
      }
      list.innerHTML = memos.map(m => `
        <div class="memo-card">
          <div class="memo-icon">${m.transcribed ? 'T' : 'o'}</div>
          <div class="memo-info">
            <div class="memo-title">${esc(m.title)}</div>
            <div class="memo-meta">${m.date} &middot; ${m.duration_min.toFixed(1)} min</div>
          </div>
          <div class="memo-actions">
            <button class="btn btn-sm btn-green btn-idea-from-memo"
                    data-memo-id="${m.id}" data-memo-title="${esc(m.title)}">+ idea</button>
          </div>
        </div>
      `).join('');

      // Bind "+ idea" buttons
      $$('.btn-idea-from-memo', list).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openNewIdeaFromMemo(btn.dataset.memoId, btn.dataset.memoTitle);
        });
      });
    } catch (e) {
      $('#memo-list').innerHTML = '<div class="empty">Failed to load voice memos</div>';
    }
  }

  // --- Projects ---

  async function loadProjects() {
    try {
      const resp = await fetch(`/api/dashboard/projects?sort=${projectSort}`);
      const data = await resp.json();
      allProjects = data.projects || [];
      // Also load collaborators for datalist
      try {
        const cr = await fetch('/api/dashboard/collaborators');
        const cd = await cr.json();
        knownCollaborators = cd.collaborators || [];
      } catch (_) {}
      renderProjects();
    } catch (e) {
      $('#project-list').innerHTML = '<div class="empty">Failed to load projects</div>';
    }
  }

  function renderProjects() {
    const list = $('#project-list');
    let filtered = allProjects;
    if (projectFilter === 'active') {
      filtered = filtered.filter(p => p.status === 'active');
    } else if (projectFilter === 'paused') {
      filtered = filtered.filter(p => p.status === 'paused');
    } else if (projectFilter === 'has-deadline') {
      filtered = filtered.filter(p => p.deadline);
    }
    if (filtered.length === 0) {
      list.innerHTML = '<div class="empty">No projects match filter</div>';
      return;
    }
    list.innerHTML = filtered.map(p => renderProjectCard(p)).join('');
    // Bind clicks
    $$('.project-card', list).forEach(card => {
      card.addEventListener('click', () => openProjectModal(card.dataset.relative));
    });
  }

  function renderProjectCard(p) {
    const today = new Date().toISOString().slice(0, 10);
    let deadlineClass = '';
    let deadlineStr = '';
    if (p.deadline) {
      deadlineStr = p.deadline;
      if (p.deadline < today) deadlineClass = 'deadline-overdue';
      else {
        const diff = (new Date(p.deadline) - new Date(today)) / 86400000;
        if (diff <= 7) deadlineClass = 'deadline-soon';
      }
    }
    const prioClass = !p.priority ? 'prio-none'
      : p.priority >= 8 ? 'prio-high'
      : p.priority >= 5 ? 'prio-mid' : 'prio-low';

    const collabs = (p.collaborators || []).map(c =>
      `<span class="collab-chip">${esc(c)}</span>`
    ).join('');

    const desc = p.description ? `<div class="project-desc">${esc(p.description)}</div>` : '';

    return `
      <div class="project-card" data-relative="${esc(p.relative)}">
        <div class="project-left">
          ${p.priority ? `<span class="prio-badge ${prioClass}">${p.priority}</span>` : '<span class="prio-badge prio-none">-</span>'}
          <div>
            <div class="project-name">${esc(p.name)}
              <span class="project-cluster">${esc(p.cluster || '')}</span>
            </div>
            ${desc}
            <div class="project-meta">
              ${collabs ? collabs : ''}
            </div>
          </div>
        </div>
        <div class="project-right">
          ${p.has_paper ? '<span class="link-badge link-badge-paper">paper</span>' : ''}
          ${p.has_claude ? '<span class="link-badge link-badge-project">CLAUDE.md</span>' : ''}
          ${p.status !== 'active' ? `<span class="status-badge status-${p.status}">${p.status}</span>` : ''}
          ${deadlineStr ? `<span class="deadline-badge ${deadlineClass}">${deadlineStr}</span>` : ''}
          <span class="project-modified">${p.modified}</span>
        </div>
      </div>
    `;
  }

  // --- Sessions ---

  async function loadSessions() {
    try {
      const resp = await fetch('/api/dashboard/sessions?limit=20');
      const data = await resp.json();
      sessions = data.sessions || [];
      const list = $('#session-list');
      if (sessions.length === 0) {
        list.innerHTML = '<div class="empty">No sessions found</div>';
        return;
      }
      list.innerHTML = sessions.map(s => {
        const cmd = `claude --dangerously-skip-permissions --resume ${s.id}`;
        const msgs = (s.messages || []).slice(1);  // skip first (already shown as topic)
        const hasDetail = msgs.length > 0 || s.summary;
        return `
          <div class="session-card${hasDetail ? ' expandable' : ''}" data-sid="${s.id}">
            <div class="session-main">
              <div class="session-info">
                <div class="session-topic">${esc(s.topic)}</div>
                <div class="session-meta">
                  ${s.date} ${s.time} &middot; ${s.size_mb}MB &middot;
                  <span class="session-project">${esc(s.project_dir)}</span>
                  ${hasDetail ? '<span class="session-expand-hint">&#9662;</span>' : ''}
                </div>
              </div>
              <div class="session-actions">
                <button class="btn btn-sm btn-copy-session" data-cmd="${esc(cmd)}"
                        title="Copy resume command">copy</button>
              </div>
            </div>
            ${hasDetail ? `
              <div class="session-detail" style="display:none">
                ${s.summary ? `<div class="session-summary">${esc(s.summary.slice(0, 300))}${s.summary.length > 300 ? '...' : ''}</div>` : ''}
                ${msgs.length > 0 ? `
                  <div class="session-messages">
                    ${msgs.map(m => `<div class="session-msg">${esc(m)}</div>`).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // Bind expand/collapse
      $$('.session-card.expandable', list).forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-copy-session')) return;
          const detail = card.querySelector('.session-detail');
          const hint = card.querySelector('.session-expand-hint');
          if (detail) {
            const open = detail.style.display !== 'none';
            detail.style.display = open ? 'none' : 'block';
            if (hint) hint.innerHTML = open ? '&#9662;' : '&#9652;';
          }
        });
      });

      // Bind copy buttons
      $$('.btn-copy-session', list).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
            btn.textContent = 'copied!';
            setTimeout(() => btn.textContent = 'copy', 1500);
          });
        });
      });
    } catch (e) {
      $('#session-list').innerHTML = '<div class="empty">Failed to load sessions</div>';
    }
  }

  // --- Papers ---

  async function loadPapers() {
    try {
      const resp = await fetch('/api/dashboard/papers');
      const data = await resp.json();
      const list = $('#paper-list');
      const items = data.items || [];
      if (items.length === 0) {
        list.innerHTML = '<div class="empty">No papers registered</div>';
        return;
      }
      list.innerHTML = items.map(p => `
        <div class="paper-card">
          <div class="paper-title">${esc(p.name)}</div>
          <div class="paper-meta">
            ${p.status || 'unknown'} &middot; ${p.venue || ''} &middot; ${p.created || ''}
          </div>
        </div>
      `).join('');
    } catch (e) {
      $('#paper-list').innerHTML = '<div class="empty">Failed to load papers</div>';
    }
  }

  // --- Idea Modal ---

  function openIdeaModal(id) {
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    editingId = id;
    $('#modal-title').textContent = 'Edit Idea';
    $('#idea-title').value = idea.title || '';
    $('#idea-stage').value = idea.stage || 'raw';
    $('#idea-tags').value = (idea.tags || []).join(', ');
    $('#idea-origin').value = idea.origin || '';
    $('#idea-project').value = idea.linked_project || '';
    $('#idea-article').value = idea.linked_article || '';
    $('#idea-notes').value = idea.notes || '';
    renderIdeaSessions(idea.sessions || []);
    $('#modal-delete').style.display = 'block';
    $('#modal-overlay').classList.add('show');
  }

  function openNewIdeaModal() {
    editingId = null;
    $('#modal-title').textContent = 'New Idea';
    $('#idea-title').value = '';
    $('#idea-stage').value = 'raw';
    $('#idea-tags').value = '';
    $('#idea-origin').value = '';
    $('#idea-project').value = '';
    $('#idea-article').value = '';
    $('#idea-notes').value = '';
    renderIdeaSessions([]);
    $('#modal-delete').style.display = 'none';
    $('#modal-overlay').classList.add('show');
  }

  function openNewIdeaFromMemo(memoId, memoTitle) {
    openNewIdeaModal();
    $('#idea-title').value = memoTitle;
    $('#idea-origin').value = `voice-memo:${memoId}`;
  }

  function renderIdeaSessions(ideaSessions) {
    const container = $('#idea-sessions-list');
    if (!ideaSessions.length) {
      container.innerHTML = '<span class="session-empty">No sessions linked</span>';
    } else {
      container.innerHTML = ideaSessions.map(sid => {
        const cmd = `claude --dangerously-skip-permissions --resume ${sid}`;
        const s = sessions.find(x => x.id === sid);
        const label = s ? `${s.date} — ${s.topic.slice(0, 50)}` : sid.slice(0, 12) + '...';
        return `
          <div class="idea-session-chip">
            <span class="idea-session-label" title="${sid}">${esc(label)}</span>
            <button class="btn-copy-inline" data-cmd="${esc(cmd)}" title="Copy resume command">cp</button>
            <button class="btn-remove-session" data-sid="${sid}" title="Remove">&times;</button>
          </div>
        `;
      }).join('');

      $$('.btn-copy-inline', container).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
            btn.textContent = 'ok';
            setTimeout(() => btn.textContent = 'cp', 1200);
          });
        });
      });
      $$('.btn-remove-session', container).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const current = getIdeaSessionIds();
          renderIdeaSessions(current.filter(x => x !== btn.dataset.sid));
        });
      });
    }
  }

  function getIdeaSessionIds() {
    return $$('.idea-session-chip [data-sid]', $('#idea-sessions-list')).map(b => b.dataset.sid);
  }

  function closeModal() {
    $('#modal-overlay').classList.remove('show');
    editingId = null;
  }

  async function saveIdea() {
    const tags = $('#idea-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    const body = {
      title: $('#idea-title').value,
      stage: $('#idea-stage').value,
      tags,
      origin: $('#idea-origin').value,
      linked_project: $('#idea-project').value || null,
      linked_article: $('#idea-article').value || null,
      notes: $('#idea-notes').value,
      sessions: getIdeaSessionIds(),
    };

    try {
      if (editingId) {
        await fetch(`/api/dashboard/ideas/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        await fetch('/api/dashboard/ideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      closeModal();
      await loadIdeas();
      await loadStats();
      toast('Idea saved');
    } catch (e) {
      toast('Failed to save idea', true);
    }
  }

  async function deleteIdea() {
    if (!editingId) return;
    if (!confirm('Delete this idea?')) return;
    try {
      await fetch(`/api/dashboard/ideas/${editingId}`, { method: 'DELETE' });
      closeModal();
      await loadIdeas();
      await loadStats();
      toast('Idea deleted');
    } catch (e) {
      toast('Failed to delete', true);
    }
  }

  // --- Project Modal ---

  let editingProject = null;

  function openProjectModal(relative) {
    const p = allProjects.find(x => x.relative === relative);
    if (!p) return;
    editingProject = relative;
    $('#proj-modal-title').textContent = p.name;
    $('#proj-path').textContent = p.relative;
    $('#proj-priority').value = p.priority || '';
    $('#proj-deadline').value = p.deadline || '';
    $('#proj-status').value = p.status || 'active';
    $('#proj-notes').value = p.notes || '';
    $('#proj-modified').textContent = `Modified: ${p.modified}`;
    let badges = '';
    if (p.has_paper) badges += '<span class="link-badge link-badge-paper">paper</span> ';
    if (p.has_claude) badges += '<span class="link-badge link-badge-project">CLAUDE.md</span>';
    $('#proj-badges').innerHTML = badges;

    renderProjCollabs(p.collaborators || []);
    // Populate datalist
    const dl = $('#collab-datalist');
    dl.innerHTML = knownCollaborators.map(c => `<option value="${esc(c)}">`).join('');

    $('#proj-modal-overlay').classList.add('show');
  }

  function closeProjModal() {
    $('#proj-modal-overlay').classList.remove('show');
    editingProject = null;
  }

  function renderProjCollabs(collabs) {
    const container = $('#proj-collab-list');
    if (!collabs.length) {
      container.innerHTML = '<span class="session-empty">No collaborators</span>';
    } else {
      container.innerHTML = collabs.map(c => `
        <span class="collab-chip editable">
          ${esc(c)}
          <button class="btn-remove-collab" data-name="${esc(c)}">&times;</button>
        </span>
      `).join('');
      $$('.btn-remove-collab', container).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const current = getProjCollabs();
          renderProjCollabs(current.filter(x => x !== btn.dataset.name));
        });
      });
    }
  }

  function getProjCollabs() {
    return $$('.collab-chip.editable', $('#proj-collab-list')).map(el => {
      // Get text content minus the x button
      return el.childNodes[0].textContent.trim();
    });
  }

  async function saveProject() {
    if (!editingProject) return;
    const prio = $('#proj-priority').value;
    const body = {
      priority: prio ? parseInt(prio) : null,
      deadline: $('#proj-deadline').value || null,
      status: $('#proj-status').value,
      collaborators: getProjCollabs(),
      notes: $('#proj-notes').value,
    };
    try {
      await fetch(`/api/dashboard/projects/${editingProject}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      closeProjModal();
      await loadProjects();
      toast('Project saved');
    } catch (e) {
      toast('Failed to save project', true);
    }
  }

  // --- Events ---

  function bindEvents() {
    $('#btn-new-idea').addEventListener('click', openNewIdeaModal);
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-save').addEventListener('click', saveIdea);
    $('#modal-delete').addEventListener('click', deleteIdea);
    $('#modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { closeModal(); closeProjModal(); }
    });

    // Project modal
    $('#proj-modal-close').addEventListener('click', closeProjModal);
    $('#proj-modal-save').addEventListener('click', saveProject);
    $('#proj-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeProjModal();
    });
    // Add collaborator
    $('#btn-add-collab').addEventListener('click', () => {
      const input = $('#proj-collab-input');
      const name = input.value.trim();
      if (!name) return;
      const current = getProjCollabs();
      if (!current.includes(name)) {
        current.push(name);
        renderProjCollabs(current);
      }
      input.value = '';
    });
    $('#proj-collab-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('#btn-add-collab').click(); }
    });

    // Project filter tabs
    $$('.filter-tab', $('#project-filter')).forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.filter-tab', $('#project-filter')).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        projectFilter = tab.dataset.filter;
        renderProjects();
      });
    });

    // Project sort tabs
    $$('.sort-tab', $('#project-sort')).forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.sort-tab', $('#project-sort')).forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        projectSort = tab.dataset.sort;
        loadProjects();
      });
    });

    // Link session to idea
    $('#btn-link-session').addEventListener('click', () => {
      const sel = $('#idea-session-select');
      const sid = sel.value;
      if (!sid) return;
      const current = getIdeaSessionIds();
      if (!current.includes(sid)) {
        current.push(sid);
        renderIdeaSessions(current);
      }
      sel.value = '';
    });

    // Search
    $('#btn-search').addEventListener('click', doSearch);
    $('#search-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSearch();
      if (e.key === 'Escape') {
        $('#search-results').style.display = 'none';
        $('#search-input').blur();
      }
    });
    // Bind copy buttons inside search results (delegated)
    $('#search-results').addEventListener('click', (e) => {
      const btn = e.target.closest('.search-copy');
      if (btn) {
        e.stopPropagation();
        navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
          btn.textContent = 'copied!';
          setTimeout(() => btn.textContent = 'copy', 1500);
        });
      }
    });

    // Populate session dropdown when modal opens
    const observer = new MutationObserver(() => {
      if ($('#modal-overlay').classList.contains('show')) {
        const sel = $('#idea-session-select');
        sel.innerHTML = '<option value="">-- select session --</option>' +
          sessions.map(s =>
            `<option value="${s.id}">${s.date} — ${esc(s.topic.slice(0, 60))}</option>`
          ).join('');
      }
    });
    observer.observe($('#modal-overlay'), { attributes: true, attributeFilter: ['class'] });
  }

  // --- Search ---

  async function doSearch() {
    const q = $('#search-input').value.trim();
    if (q.length < 2) return;
    const results = $('#search-results');
    results.style.display = 'block';
    results.innerHTML = '<div class="empty">Searching...</div>';

    try {
      const resp = await fetch(`/api/dashboard/search?q=${encodeURIComponent(q)}&limit=30`);
      const data = await resp.json();
      const items = data.results || [];
      if (items.length === 0) {
        results.innerHTML = '<div class="empty">No results</div>';
        return;
      }
      results.innerHTML = `
        <div class="search-header">
          <span>${data.count} result${data.count !== 1 ? 's' : ''} for "${esc(q)}"</span>
          <button class="btn btn-sm" id="btn-close-search">&times;</button>
        </div>
        ${items.map(r => renderSearchResult(r, q)).join('')}
      `;
      $('#btn-close-search').addEventListener('click', () => {
        results.style.display = 'none';
        results.innerHTML = '';
      });
    } catch (e) {
      results.innerHTML = '<div class="empty">Search failed</div>';
    }
  }

  function renderSearchResult(r, q) {
    const typeColors = { memo: '#c678dd', session: '#61afef', project: '#98c379' };
    const typeLabel = { memo: 'voice memo', session: 'session', project: 'project' };
    const color = typeColors[r.type] || '#5a6178';
    const snippet = highlightMatch(esc(r.snippet), q);
    let extra = '';
    if (r.type === 'session' && r.project_dir) extra = ` &middot; ${esc(r.project_dir)}`;
    if (r.type === 'memo' && r.duration_min) extra = ` &middot; ${r.duration_min} min`;
    if (r.type === 'session' && r.id) {
      const cmd = `claude --dangerously-skip-permissions --resume ${r.id}`;
      extra += ` <button class="btn-copy-inline search-copy" data-cmd="${esc(cmd)}">copy</button>`;
    }

    return `
      <div class="search-result">
        <div class="search-result-header">
          <span class="search-result-type" style="color:${color}">${typeLabel[r.type]}</span>
          <span class="search-result-title">${esc(r.title)}</span>
          <span class="search-result-date">${r.date}${extra}</span>
        </div>
        <div class="search-result-snippet">${snippet}</div>
        ${(r.extra_snippets || []).map(s =>
          `<div class="search-result-snippet extra">${highlightMatch(esc(s), q)}</div>`
        ).join('')}
      </div>
    `;
  }

  function highlightMatch(html, q) {
    if (!q) return html;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return html.replace(regex, '<mark>$1</mark>');
  }

  // --- Utilities ---

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function toast(msg, isError) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => t.className = 'toast', 2500);
  }

  // --- Boot ---
  document.addEventListener('DOMContentLoaded', init);
})();
