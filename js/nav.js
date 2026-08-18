/**
 * Nav enhancer: injects a hamburger toggle so on mobile the nav
 * links collapse into a dropdown. Desktop layout is unchanged.
 * Included once on every page (no per-page HTML edits needed).
 */
(function () {
  'use strict';
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const links = nav.querySelector('.nav-links');
  if (!links) return;

  const btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'nav-links');
  btn.setAttribute('aria-label', 'toggle menu');
  btn.innerHTML = '<span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span><span class="nav-toggle-bar"></span>';
  nav.appendChild(btn);

  if (!links.id) links.id = 'nav-links';

  btn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });

  // Close the dropdown when a link is tapped
  links.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on outside click or Escape
  document.addEventListener('click', (e) => {
    if (!nav.classList.contains('open')) return;
    if (!nav.contains(e.target)) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('open')) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
