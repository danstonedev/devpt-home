/* Public website measurement. Product applications retain their own tracking.
 * The public-site stream ID is centralized here; application tags stay separate.
 * Disable enhanced history/form/search measurement in the GA stream: this file
 * owns page views and emits bounded metadata instead of free-text input. */
(function () {
  'use strict';
  const measurementId = 'G-61473CPT29';
  const enabled = ['devpt.app', 'www.devpt.app'].includes(location.hostname);
  const legacyEntry = location.hash.startsWith('#/') || ['#contact','#products','#flow','#student','#faculty','#labs','#references','#research-opportunities'].includes(location.hash);
  const productPaths = { '/simlab/': 'simlab', '/emrs/': 'emrs', '/3dpain/': 'painmap' };
  const productHosts = { 'lab.devpt.app': 'simlab', 'simemr.devpt.app': 'emrs', 'emr.devpt.app': 'emrs', 'www.3dpain.app': 'painmap', '3dpain.app': 'painmap' };
  const campaign = {};
  const entryParams = new URLSearchParams(location.search);
  for (const field of ['source','medium','name','id']) {
    const value = entryParams.get('utm_' + (field === 'name' ? 'campaign' : field));
    if (value && /^[a-zA-Z0-9][a-zA-Z0-9 _.:/-]{0,99}$/.test(value)) campaign['campaign_' + field] = value;
  }
  let started = false, lastPage = null, current = null, readyResource = null;
  function referrer(value) {
    try { return new URL(value).origin + '/'; } catch { return ''; }
  }
  function send() { window.gtag.apply(null, arguments); }
  function start(page) {
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    send('js', new Date());
    send('config', measurementId, {
      send_page_view: false, allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: page.canonical, page_title: page.title,
      page_referrer: referrer(document.referrer), ...campaign,
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.append(script);
  }
  const allowed = new Set(['resource_id', 'region_id', 'topic_id', 'product_id', 'placement', 'share_type', 'resource_count', 'result_count']);
  function track(name, values = {}) {
    if (!enabled || !current || !/^(resource_open|resource_ready|resource_save|resource_remove|resource_share|resources_save|library_search|product_link_click|inquiry_click)$/.test(name)) return;
    const params = { send_to: measurementId, site_area: 'devpt_public', content_group: current.content_group, page_type: current.page_type,
      page_location: current.canonical, page_title: current.title, page_referrer: current.referrer };
    for (const [key, value] of Object.entries(values)) {
      if (!allowed.has(key)) continue;
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) params[key] = Math.min(Math.floor(value), 100000);
      else if (typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,119}$/.test(value)) params[key] = value;
    }
    if (name === 'resource_ready') {
      if (!params.resource_id || readyResource === params.resource_id) return;
      readyResource = params.resource_id;
    }
    send('event', name, params);
  }
  function page(info) {
    if (!enabled || !info?.canonical || !info.title) return;
    const url = new URL(info.canonical);
    if (url.origin !== 'https://devpt.app' || url.search || url.hash) return;
    if (lastPage === info.canonical) return;
    const previous = current?.canonical || referrer(document.referrer);
    current = { ...info, referrer: previous };
    lastPage = info.canonical;
    readyResource = null;
    start(current);
    const defaults = { page_location: current.canonical, page_title: current.title, page_referrer: previous };
    send('set', defaults);
    send('event', 'page_view', { ...defaults, send_to: measurementId,
      site_area: 'devpt_public', content_group: current.content_group, page_type: current.page_type,
      ...(current.resource_id ? { resource_id: current.resource_id, region_id: current.region_id, topic_id: current.topic_id } : {}),
    });
    if (current.resource_id) track('resource_open', current);
  }
  window.DEVPT_ANALYTICS = Object.freeze({ page, track });
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!link || !current) return;
    const url = new URL(link.href, location.href);
    const product = url.origin === location.origin ? productPaths[url.pathname] : productHosts[url.hostname];
    if (product) track('product_link_click', { product_id: product, placement:
      link.closest('.product-strip') ? 'home_product_strip' : link.closest('.footer') ? 'footer' : link.closest('.topbar,.nav') ? 'navigation' : 'product_overview' });
    if (url.protocol === 'mailto:' && !url.search) track('inquiry_click');
  });
  function staticPage() {
    if (document.getElementById('app')) {
      // A generated page records its arrival even when the source catalog is
      // slow or unavailable. Legacy fragment links wait for route resolution.
      const data = document.getElementById('library-page-data');
      if (data && !legacyEntry) {
        try { const info = JSON.parse(data.textContent); if (new URL(info.canonical).pathname === location.pathname) page(info); } catch {}
      }
      return;
    }
    const path = location.pathname;
    page({ title: document.title, canonical: 'https://devpt.app' + path,
      content_group: productPaths[path] ? 'products' : 'information', page_type: productPaths[path] ? 'product_overview' : 'information' });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', staticPage, { once: true });
  else staticPage();
})();
