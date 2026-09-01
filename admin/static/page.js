(function () {
  'use strict';

  const slug = document.querySelector('meta[name="page-slug"]')?.content;
  if (!slug) return;

  const API_URL  = `/api/page/${slug}`;
  const LIVE_URL = document.querySelector('meta[name="page-live-url"]')?.content || '/';

  const textarea = document.getElementById('page-html');
  const preview  = document.getElementById('preview');
  const saveBtn  = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const feedback = document.getElementById('feedback');
  const stampEl  = document.getElementById('last-saved');

  let savedValue = '';

  function flash(msg, cls) {
    feedback.textContent = msg;
    feedback.className = 'feedback ' + (cls || '');
    setTimeout(() => { feedback.textContent = ''; feedback.className = 'feedback'; }, 3500);
  }

  // Debounced preview update — cheaper for a long HTML body
  let previewT;
  function updatePreview() {
    clearTimeout(previewT);
    previewT = setTimeout(() => {
      preview.innerHTML = textarea.value;
    }, 120);
  }

  async function load() {
    try {
      const resp = await fetch(API_URL, { cache: 'no-store' });
      const data = await resp.json();
      savedValue = data.body_html || '';
      textarea.value = savedValue;
      stampEl.textContent = data.last_updated || 'never';
      preview.innerHTML = textarea.value;
    } catch (e) {
      flash('could not load', 'err');
    }
  }

  async function save() {
    const val = textarea.value.trim();
    if (!val) { flash('body cannot be empty', 'err'); return; }

    saveBtn.disabled = true;
    try {
      const resp = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_html: val }),
      });
      if (resp.ok) {
        const data = await resp.json();
        savedValue = data.body_html;
        stampEl.textContent = data.last_updated;
        flash(`saved and synced to ${LIVE_URL}`, 'ok');
      } else {
        const err = await resp.json().catch(() => ({}));
        flash(err.error || 'save failed', 'err');
      }
    } catch (e) {
      flash('network error', 'err');
    } finally {
      saveBtn.disabled = false;
    }
  }

  function reset() {
    textarea.value = savedValue;
    preview.innerHTML = textarea.value;
    flash('reverted to last saved');
  }

  textarea.addEventListener('input', updatePreview);
  saveBtn.addEventListener('click', save);
  resetBtn.addEventListener('click', reset);

  // Cmd/Ctrl-S saves; Tab inserts two spaces instead of moving focus
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end   = textarea.selectionEnd;
      textarea.value = textarea.value.slice(0, start) + '  ' + textarea.value.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      updatePreview();
    }
  });

  load();
})();
