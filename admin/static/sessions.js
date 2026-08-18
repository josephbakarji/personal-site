/**
 * Sessions page — Claude Code session viewer
 */
(function () {
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  async function init() {
    try {
      const resp = await fetch('/api/dashboard/sessions?limit=50');
      const data = await resp.json();
      const sessions = data.sessions || [];
      $('#session-total').textContent = `${sessions.length} sessions`;

      if (sessions.length === 0) {
        $('#session-list').innerHTML = '<div class="empty">No sessions found</div>';
        return;
      }

      $('#session-list').innerHTML = sessions.map(s => {
        const cmd = `claude --dangerously-skip-permissions --resume ${s.id}`;
        const msgs = (s.messages || []).slice(1);
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
                <button class="btn-copy-session" data-cmd="${esc(cmd)}"
                        title="Copy resume command">copy</button>
              </div>
            </div>
            ${hasDetail ? `
              <div class="session-detail" style="display:none">
                ${s.summary ? `<div class="session-summary">${esc(s.summary.slice(0, 400))}${s.summary.length > 400 ? '...' : ''}</div>` : ''}
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
      $$('.session-card.expandable').forEach(card => {
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
      $$('.btn-copy-session').forEach(btn => {
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

  document.addEventListener('DOMContentLoaded', init);
})();
