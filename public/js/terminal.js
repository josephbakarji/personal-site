/**
 * Terminal typing animation for the tagline.
 */
(function () {
  const TYPING_SPEED = 55;   // ms per character
  const START_DELAY = 500;   // ms before typing begins

  function typeText(element, text, callback) {
    let i = 0;
    element.textContent = '';

    function tick() {
      if (i < text.length) {
        element.textContent += text[i];
        i++;
        setTimeout(tick, TYPING_SPEED);
      } else if (callback) {
        callback();
      }
    }

    setTimeout(tick, START_DELAY);
  }

  function init() {
    const el = document.getElementById('tagline-typed');
    if (!el) return;

    const text = el.getAttribute('data-text') || el.textContent;
    el.textContent = '';
    typeText(el, text);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
