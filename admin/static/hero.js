(function () {
  'use strict';

  const textarea = document.getElementById('intro-html');
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

  function updatePreview() {
    // Directly inject the HTML into a paragraph so the preview matches
    // how the landing renders it.
    preview.innerHTML = textarea.value;
  }

  async function load() {
    try {
      const resp = await fetch('/api/hero', { cache: 'no-store' });
      const data = await resp.json();
      savedValue = data.intro_html || '';
      textarea.value = savedValue;
      stampEl.textContent = data.last_updated || 'never';
      updatePreview();
    } catch (e) {
      flash('could not load', 'err');
    }
  }

  async function save() {
    const val = textarea.value.trim();
    if (!val) { flash('intro cannot be empty', 'err'); return; }

    saveBtn.disabled = true;
    try {
      const resp = await fetch('/api/hero', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intro_html: val }),
      });
      if (resp.ok) {
        const data = await resp.json();
        savedValue = data.intro_html;
        stampEl.textContent = data.last_updated;
        flash('saved and synced to index.html', 'ok');
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
    updatePreview();
    flash('reverted to last saved');
  }

  textarea.addEventListener('input', updatePreview);
  saveBtn.addEventListener('click', save);
  resetBtn.addEventListener('click', reset);

  // Cmd/Ctrl-S saves
  textarea.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      save();
    }
  });

  load();
})();
