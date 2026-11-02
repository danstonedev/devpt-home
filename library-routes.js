/* Shared by the browser and the public-page exporter. */
(function () {
  'use strict';
  const sections = { home: '', regions: 'regions', topics: 'topics', library: 'search', saved: 'saved', products: 'products', contact: 'contact', faculty: 'faculty', about: 'faculty' };
  const families = { region: 'regions', topic: 'topics', activity: 'resources' };
  function href(route) {
    const [name, query = ''] = String(route).replace(/^#?\/?/, '').split('?');
    const [kind, id] = name.split('/');
    const path = families[kind] && /^[a-z0-9][a-z0-9-]*$/.test(id || '')
      ? '/' + families[kind] + '/' + id + '/'
      : Object.hasOwn(sections, kind) ? '/' + (sections[kind] ? sections[kind] + '/' : '') : null;
    return path === null ? null : path + (query ? '?' + query : '');
  }
  function fromPath(pathname) {
    const parts = pathname.replace(/^\/|\/$/g, '').split('/');
    if (parts.length === 1) {
      if (!parts[0] || parts[0] === 'index.html') return 'home';
      return Object.keys(sections).find(key => sections[key] === parts[0]) || null;
    }
    if (parts.length === 2 && /^[a-z0-9][a-z0-9-]*$/.test(parts[1])) {
      const kind = Object.keys(families).find(key => families[key] === parts[0]);
      return kind ? kind + '/' + parts[1] : null;
    }
    return null;
  }
  const routes = Object.freeze({ href, fromPath });
  if (typeof module !== 'undefined') module.exports = routes;
  if (typeof window !== 'undefined') window.DEVPT_ROUTES = routes;
})();
