// Google Analytics 4. The measurement ID lives here so we can change it
// (or turn tracking off) with a one-file edit rather than editing every page.
(function () {
  const GA_ID = 'G-974L5Y7C76';

  // Don't ping GA from local dev / previews — keeps the production
  // stats clean while we iterate.
  const host = window.location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1') return;

  const loader = document.createElement('script');
  loader.async = true;
  loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(loader);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);
})();
