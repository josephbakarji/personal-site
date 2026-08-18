/**
 * Projects page — dedicated project management
 */
(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  let allProjects = [];
  let knownCollaborators = [];
  let editingProject = null;
  let currentSort = 'priority';
  let currentCluster = 'all';
  let currentStatus = 'active';

  const TIER_CONFIG = [
    { label: 'Urgent', min: 10, max: 10, color: 'var(--red)', dot: '#c97a6e' },
    { label: 'High', min: 8, max: 9, color: 'var(--yellow)', dot: '#d4b06a' },
    { label: 'Medium', min: 5, max: 7, color: 'var(--blue)', dot: '#7a9ec4' },
    { label: 'Low', min: 1, max: 4, color: 'var(--text-muted)', dot: '#6b645c' },
    { label: 'Unset', min: null, max: null, color: 'var(--text-muted)', dot: '#3a3840' },
  ];

  async function init() {
    await loadProjects();
    bindEvents();
  }

  // --- Data loading ---

  async function loadProjects() {
    try {
      const resp = await fetch(`/api/dashboard/projects?sort=${currentSort}`);
      const data = await resp.json();
      allProjects = data.projects || [];
      // Load collaborators
      try {
        const cr = await fetch('/api/dashboard/collaborators');
        const cd = await cr.json();
        knownCollaborators = cd.collaborators || [];
      } catch (_) {}
      renderAll();
    } catch (e) {
      $('#project-groups').innerHTML = '<div class="empty">Failed to load projects</div>';
    }
  }

  // --- Rendering ---

  function renderAll() {
    renderStats();
    renderClusterFilters();
    renderProjects();
  }

  function renderStats() {
    const strip = $('#stats-strip');
    const active = allProjects.filter(p => p.status === 'active');
    const today = new Date().toISOString().slice(0, 10);
    const overdue = allProjects.filter(p => p.deadline && p.deadline < today && p.status === 'active');
    const soon = allProjects.filter(p => {
      if (!p.deadline || p.deadline < today) return false;
      return (new Date(p.deadline) - new Date(today)) / 86400000 <= 14;
    });
    const withPaper = allProjects.filter(p => p.has_paper);
    const collabs = new Set();
    allProjects.forEach(p => (p.collaborators || []).forEach(c => collabs.add(c)));

    strip.innerHTML = `
      <div class="stat-pill"><span class="stat-num accent">${active.length}</span> active</div>
      <div class="stat-pill"><span class="stat-num red">${overdue.length}</span> overdue</div>
      <div class="stat-pill"><span class="stat-num yellow">${soon.length}</span> due soon</div>
      <div class="stat-pill"><span class="stat-num green">${withPaper.length}</span> with paper</div>
      <div class="stat-pill"><span class="stat-num blue">${collabs.size}</span> collaborators</div>
    `;
  }

  function renderClusterFilters() {
    const container = $('#cluster-filters');
    const clusters = [...new Set(allProjects.map(p => p.cluster))].sort();
    container.innerHTML = `
      <button class="cluster-btn ${currentCluster === 'all' ? 'active' : ''}" data-cluster="all">All</button>
      ${clusters.map(c => `
        <button class="cluster-btn ${currentCluster === c ? 'active' : ''}" data-cluster="${esc(c)}">${esc(c)}</button>
      `).join('')}
    `;
    $$('.cluster-btn', container).forEach(btn => {
      btn.addEventListener('click', () => {
        currentCluster = btn.dataset.cluster;
        $$('.cluster-btn', container).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderProjects();
      });
    });
  }

  function getFiltered() {
    let filtered = allProjects;
    if (currentCluster !== 'all') {
      filtered = filtered.filter(p => p.cluster === currentCluster);
    }
    if (currentStatus !== 'all') {
      filtered = filtered.filter(p => (p.status || 'active') === currentStatus);
    }
    return filtered;
  }

  function renderProjects() {
    const container = $('#project-groups');
    const filtered = getFiltered();

    if (currentSort === 'priority') {
      // Group by priority tier
      container.innerHTML = TIER_CONFIG.map(tier => {
        const projects = filtered.filter(p => {
          const prio = p.priority || 0;
          if (tier.min === null) return prio === 0 || prio === null;
          return prio >= tier.min && prio <= tier.max;
        });
        if (projects.length === 0) return '';
        return `
          <div class="tier-group" data-tier="${tier.label}">
            <div class="tier-header">
              <div class="tier-dot" style="background:${tier.dot}"></div>
              <span class="tier-label">${tier.label}</span>
              <span class="tier-count">${projects.length}</span>
              <span class="tier-chevron">&#9662;</span>
            </div>
            <div class="tier-body">
              ${projects.map(p => renderCard(p)).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      // Flat list
      container.innerHTML = `
        <div class="tier-body">
          ${filtered.length > 0 ? filtered.map(p => renderCard(p)).join('') : '<div class="empty">No projects match filters</div>'}
        </div>
      `;
    }

    // Bind tier collapse
    $$('.tier-header', container).forEach(hdr => {
      hdr.addEventListener('click', () => {
        hdr.parentElement.classList.toggle('collapsed');
      });
    });

    // Bind card clicks
    $$('.proj-card', container).forEach(card => {
      card.addEventListener('click', () => openModal(card.dataset.relative));
    });
  }

  function renderCard(p) {
    const today = new Date().toISOString().slice(0, 10);
    const prio = p.priority || 0;
    const prioClass = prio >= 10 ? 'prio-urgent'
      : prio >= 8 ? 'prio-high'
      : prio >= 5 ? 'prio-mid'
      : prio >= 1 ? 'prio-low' : 'prio-none';

    let deadlineBadge = '';
    if (p.deadline) {
      let cls = 'future';
      if (p.deadline < today) cls = 'overdue';
      else {
        const diff = (new Date(p.deadline) - new Date(today)) / 86400000;
        if (diff <= 14) cls = 'soon';
      }
      deadlineBadge = `<span class="proj-deadline-badge ${cls}">${p.deadline}</span>`;
    }

    const collabs = (p.collaborators || []).map(c =>
      `<span class="proj-collab">${esc(c)}</span>`
    ).join('');

    const notes = p.notes || p.description || '';

    let tags = '';
    if (p.has_paper) tags += '<span class="proj-tag tag-paper">paper</span>';
    if (p.status && p.status !== 'active') {
      tags += `<span class="proj-tag tag-status tag-status-${p.status}">${p.status}</span>`;
    }

    return `
      <div class="proj-card" data-relative="${esc(p.relative)}">
        <div class="proj-prio ${prioClass}">${prio || '–'}</div>
        <div class="proj-main">
          <div class="proj-name-row">
            <span class="proj-name">${esc(p.name)}</span>
            <span class="proj-cluster">${esc(p.cluster)}</span>
            ${tags}
          </div>
          ${notes ? `<div class="proj-notes">${esc(notes)}</div>` : ''}
          <div class="proj-meta-row">
            ${collabs}
            ${deadlineBadge}
          </div>
        </div>
        <div class="proj-right">
          <span class="proj-modified">${p.modified || ''}</span>
        </div>
      </div>
    `;
  }

  // --- Modal ---

  function openModal(relative) {
    const p = allProjects.find(x => x.relative === relative);
    if (!p) return;
    editingProject = relative;
    $('#proj-modal-title').textContent = p.name;
    $('#proj-path').textContent = p.relative;
    $('#proj-priority').value = p.priority || '';
    $('#proj-deadline').value = p.deadline || '';
    $('#proj-status').value = p.status || 'active';
    $('#proj-notes').value = p.notes || '';
    $('#proj-modified').textContent = `Modified: ${p.modified || 'unknown'}`;
    $('#proj-desc').textContent = p.description ? `"${p.description.slice(0, 80)}"` : '';

    let badges = '';
    if (p.has_paper) badges += '<span class="link-badge link-badge-paper">paper</span> ';
    if (p.has_claude) badges += '<span class="link-badge link-badge-project">CLAUDE.md</span>';
    $('#proj-badges').innerHTML = badges;

    renderCollabs(p.collaborators || []);
    // Populate datalist
    const dl = $('#collab-datalist');
    dl.innerHTML = knownCollaborators.map(c => `<option value="${esc(c)}">`).join('');

    $('#proj-modal-overlay').classList.add('show');
  }

  function closeModal() {
    $('#proj-modal-overlay').classList.remove('show');
    editingProject = null;
  }

  function renderCollabs(collabs) {
    const container = $('#proj-collab-list');
    if (!collabs.length) {
      container.innerHTML = '<span style="font-size:11px;color:var(--text-muted)">No collaborators</span>';
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
          renderCollabs(getCollabs().filter(x => x !== btn.dataset.name));
        });
      });
    }
  }

  function getCollabs() {
    return $$('.collab-chip.editable', $('#proj-collab-list')).map(el => {
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
      collaborators: getCollabs(),
      notes: $('#proj-notes').value,
    };
    try {
      await fetch(`/api/dashboard/projects/${editingProject}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      closeModal();
      await loadProjects();
      toast('Project saved');
    } catch (e) {
      toast('Failed to save', true);
    }
  }

  // --- Events ---

  function bindEvents() {
    // Sort tabs
    $$('.sort-btn', $('#sort-tabs')).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.sort-btn', $('#sort-tabs')).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        loadProjects();
      });
    });

    // Status filter
    $('#status-select').addEventListener('change', (e) => {
      currentStatus = e.target.value;
      renderProjects();
    });

    // Expand all
    $('#btn-expand-all').addEventListener('click', () => {
      const groups = $$('.tier-group');
      const anyCollapsed = groups.some(g => g.classList.contains('collapsed'));
      groups.forEach(g => {
        if (anyCollapsed) g.classList.remove('collapsed');
        else g.classList.add('collapsed');
      });
      $('#btn-expand-all').textContent = anyCollapsed ? 'Collapse all' : 'Expand all';
    });

    // Modal events
    $('#proj-modal-close').addEventListener('click', closeModal);
    $('#proj-modal-save').addEventListener('click', saveProject);
    $('#proj-modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Add collaborator
    $('#btn-add-collab').addEventListener('click', () => {
      const input = $('#proj-collab-input');
      const name = input.value.trim();
      if (!name) return;
      const current = getCollabs();
      if (!current.includes(name)) {
        current.push(name);
        renderCollabs(current);
      }
      input.value = '';
    });
    $('#proj-collab-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); $('#btn-add-collab').click(); }
    });
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

  document.addEventListener('DOMContentLoaded', init);
})();
