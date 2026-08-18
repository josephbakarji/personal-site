(function () {
  'use strict';

  const container = document.getElementById('team-content');
  if (!container) return;

  function hostLabel(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('linkedin')) return 'linkedin';
      if (u.hostname.includes('github'))   return 'github';
      if (u.hostname.includes('scholar'))  return 'scholar';
      if (u.hostname.includes('substack')) return 'substack';
      if (u.hostname.includes('arxiv'))    return 'arxiv';
      return u.hostname.replace(/^www\./, '');
    } catch (e) { return 'link'; }
  }

  function linksHtml(links, email) {
    const parts = [];
    if (email) parts.push(`<a href="mailto:${email}">email</a>`);
    for (const l of links || []) {
      if (!l || !l.href) continue;
      const external = l.href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
      const label = l.label || hostLabel(l.href);
      parts.push(`<a href="${l.href}"${external}>${label}</a>`);
    }
    if (!parts.length) return '';
    return `<span class="team-row-links">${parts.join('<span class="team-row-sep"> · </span>')}</span>`;
  }

  function labAliases(memberLabs, labs) {
    return (memberLabs || []).map(slug => {
      const l = labs.find(x => x.slug === slug);
      return l ? (l.alias || l.name) : slug;
    }).join(', ');
  }

  function memberRow(m, labs) {
    const roleBits = [];
    if (m.role) roleBits.push(m.role);
    const labStr = labAliases(m.labs, labs);
    if (labStr) roleBits.push(labStr);
    if (m.co_supervisor) roleBits.push(`co-supervised with ${m.co_supervisor}`);
    const roleLine = roleBits.join(' &middot; ');

    return `
      <li class="team-row">
        <div class="team-row-header">
          <span class="team-row-name">${m.name}</span>
          ${linksHtml(m.links, m.email)}
        </div>
        <div class="team-row-role">${roleLine}</div>
        ${m.topic ? `<p class="team-row-topic">${m.topic}</p>` : ''}
      </li>
    `;
  }

  function collaboratorRow(c) {
    const linksInline = c.link
      ? `<span class="team-row-links"><a href="${c.link}" target="_blank" rel="noopener">${hostLabel(c.link)}</a></span>`
      : '';
    return `
      <li class="team-row">
        <div class="team-row-header">
          <span class="team-row-name">${c.name}</span>
          ${linksInline}
        </div>
        <div class="team-row-role">${c.affiliation || ''}</div>
        ${c.topic ? `<p class="team-row-topic">${c.topic}</p>` : ''}
      </li>
    `;
  }

  function funderRow(f) {
    const link = f.url
      ? `<span class="team-row-links"><a href="${f.url}" target="_blank" rel="noopener">website</a></span>`
      : '';
    return `
      <li class="team-row">
        <div class="team-row-header">
          <span class="team-row-name">${f.name}</span>
          ${link}
        </div>
        <div class="team-row-role">${f.alias || ''}</div>
      </li>
    `;
  }

  function sectionBlock(title, rows) {
    return `
      <section class="team-block">
        <div class="team-block-head">
          <span class="team-block-title">${title}</span>
        </div>
        <ul class="team-list">${rows}</ul>
      </section>
    `;
  }

  function render(data) {
    const labs = data.labs || [];
    let html = '';

    if (data.director) {
      html += sectionBlock('Director', memberRow(data.director, labs));
    }
    if (data.current && data.current.length) {
      html += sectionBlock('Current students and researchers',
        data.current.map(m => memberRow(m, labs)).join(''));
    }
    if (data.previous && data.previous.length) {
      html += sectionBlock('Previous students and researchers',
        data.previous.map(m => memberRow(m, labs)).join(''));
    }
    if (data.collaborators && data.collaborators.length) {
      html += sectionBlock('Collaborators and mentors',
        data.collaborators.map(collaboratorRow).join(''));
    }
    if (data.conversations && data.conversations.text) {
      html += `<p class="team-conversations">${data.conversations.text}</p>`;
    }
    if (data.funders && data.funders.length) {
      html += sectionBlock('Funders and partners',
        data.funders.map(funderRow).join(''));
    }
    if (data.notes) {
      html += `<div class="team-note">${data.notes}</div>`;
    }

    container.innerHTML = html;
  }

  fetch('../data/team.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(render)
    .catch(err => {
      console.warn('team.json load failed', err);
      container.innerHTML = '<p style="color: var(--text-muted);">could not load team.</p>';
    });
})();
