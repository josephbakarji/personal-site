(function () {
  'use strict';

  const form      = document.getElementById('news-form');
  const editIdIn  = document.getElementById('edit-id');
  const dateIn    = document.getElementById('f-date');
  const kindIn    = document.getElementById('f-kind');
  const headIn    = document.getElementById('f-headline');
  const linkIn    = document.getElementById('f-link');
  const noteIn    = document.getElementById('f-note');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const feedback  = document.getElementById('feedback');
  const listEl    = document.getElementById('news-list-container');
  const countEl   = document.getElementById('count');

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function resetForm(defaults) {
    editIdIn.value = '';
    dateIn.value = (defaults && defaults.date) || todayISO();
    kindIn.value = (defaults && defaults.kind) || 'writing';
    headIn.value = '';
    linkIn.value = '';
    noteIn.value = '';
    submitBtn.textContent = 'add entry';
    cancelBtn.hidden = true;
  }

  function fillForm(item) {
    editIdIn.value = item.id || '';
    dateIn.value = item.date || '';
    kindIn.value = item.kind || 'writing';
    headIn.value = item.headline || '';
    linkIn.value = item.link || '';
    noteIn.value = item.note || '';
    submitBtn.textContent = 'save changes';
    cancelBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    headIn.focus();
  }

  function flash(msg, cls) {
    feedback.textContent = msg;
    feedback.className = 'feedback ' + (cls || '');
    setTimeout(() => { feedback.textContent = ''; feedback.className = 'feedback'; }, 3500);
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${M[m - 1]} ${d}, ${y}`;
  }

  function renderList(items) {
    countEl.textContent = `(${items.length})`;
    if (!items.length) {
      listEl.innerHTML = '<p class="hint">no entries yet.</p>';
      return;
    }
    const sorted = items.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    listEl.innerHTML = sorted.map(item => `
      <div class="entry" data-id="${item.id || ''}">
        <span class="entry-date">${fmtDate(item.date)}</span>
        <span class="entry-kind">${item.kind || ''}</span>
        <div class="entry-body">
          <div class="entry-headline">${escapeHtml(item.headline || '')}</div>
          ${item.note ? `<div class="entry-note">${escapeHtml(item.note)}</div>` : ''}
          ${item.link ? `<a class="entry-link" href="${item.link}" target="_blank" rel="noopener">${escapeHtml(item.link)}</a>` : ''}
        </div>
        <div class="entry-actions">
          <button class="btn edit-btn" type="button">edit</button>
          <button class="btn btn--danger delete-btn" type="button">delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.entry').dataset.id;
        const item = items.find(i => i.id === id);
        if (item) fillForm(item);
      });
    });
    listEl.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.entry').dataset.id;
        if (!confirm('Delete this news entry?')) return;
        const resp = await fetch(`/api/news/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (resp.ok) { load(); flash('deleted', 'ok'); }
        else         { flash('delete failed', 'err'); }
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  async function load() {
    try {
      const resp = await fetch('/api/news', { cache: 'no-store' });
      const data = await resp.json();
      renderList(data.items || []);
    } catch (e) {
      listEl.innerHTML = '<p class="hint">could not load news.</p>';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      date: dateIn.value,
      kind: kindIn.value,
      headline: headIn.value.trim(),
      link: linkIn.value.trim() || null,
      note: noteIn.value.trim() || null,
    };
    if (!body.headline) { flash('headline required', 'err'); return; }

    const editId = editIdIn.value;
    const url = editId ? `/api/news/${encodeURIComponent(editId)}` : '/api/news';
    const method = editId ? 'PUT' : 'POST';
    submitBtn.disabled = true;
    try {
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        flash(editId ? 'saved' : 'added', 'ok');
        resetForm();
        load();
      } else {
        const err = await resp.json().catch(() => ({}));
        flash(err.error || 'error', 'err');
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', () => {
    resetForm();
    flash('edit cancelled');
  });

  resetForm();
  load();
})();
