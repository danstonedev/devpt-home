/* Discovery consumes the owning product's published catalog. No copied model,
 * clinical metadata catalog, simulator or local service is deployed here. */
(function () {
  'use strict';
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const local = loopback && location.port === '8110';
  window.DEVPT_LOCAL_PREVIEW = local;
  window.DEVPT_CATALOG_STATE = 'loading';
  function script(path) {
    return new Promise((resolve, reject) => {
      const element = document.createElement('script');
      element.src = path;
      element.onload = resolve;
      element.onerror = () => reject(new Error('Could not load ' + path));
      document.head.append(element);
    });
  }
  function announceCatalog(catalog) {
    window.DEVPT_TEACHING_CATALOG = catalog;
    window.DEVPT_CATALOG_STATE = catalog ? 'ready' : 'unavailable';
    document.dispatchEvent(new Event('devpt:catalog-ready'));
  }
  function loadPublishedCatalog() {
    return fetch('https://lab.devpt.app/teaching/catalog.json', {
      // Matches the <link rel="preload"> in index.html so the early request is reused.
      // The catalog is served with Cache-Control: no-cache, so it is still revalidated.
      mode: 'cors', credentials: 'same-origin',
      signal: AbortSignal.timeout(10000),
    }).then(response => {
      if (!response.ok) throw new Error('Teaching catalog unavailable');
      return response.json();
    }).then(catalog => {
      if (catalog?.schemaVersion !== 1 || catalog.status !== 'public-resources' ||
          !Array.isArray(catalog.activities)) throw new Error('Unexpected teaching catalog');
      announceCatalog(catalog);
    }).catch(() => announceCatalog(null));
  }
  function legacyBookmark() {
    const section = location.hash.slice(1);
    if (['contact','products'].includes(section)) {
      const url = new URL('/' + section + '/', location.origin);
      url.search = location.search;
      location.replace(url.href);
      return true;
    }
    if (!['flow', 'student', 'faculty', 'labs', 'references', 'research-opportunities'].includes(section)) return false;
    const url = new URL('/simlab/', location.origin);
    url.hash = section;
    if (loopback) {
      const source = new URLSearchParams(location.search).get('simlab');
      if (source) url.searchParams.set('simlab', source);
    }
    location.replace(url.href);
    return true;
  }
  if (legacyBookmark()) return;
  window.addEventListener('hashchange', legacyBookmark);
  async function start() {
    if (local) {
      try {
        await script('/local-site-config.js');
        window.DEVPT_CATALOG_STATE = 'ready';
      } catch (_) { window.DEVPT_CATALOG_STATE = 'unavailable'; }
    } else {
      // Product and contact routes render immediately, independently of this
      // request. The renderer refreshes resource views when it completes.
      void loadPublishedCatalog();
    }
    await script('/teaching-library.js');
    await script('/feature-workspaces.js');
  }
  start().catch(() => {
    const app = document.getElementById('app');
    if (app && !app.childElementCount) app.innerHTML = '<main class="main wrap" id="main"><h1>DevPT</h1><p>The page could not finish loading. Please reload.</p><p><a href="/simlab/">simLAB</a> · <a href="/emrs/">EMRs</a> · <a href="/3dpain/">3Dpain.app</a> · <a href="mailto:daniel.j.stone@und.edu">Contact</a></p></main>';
  });
})();
