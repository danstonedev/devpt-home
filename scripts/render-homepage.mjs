import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import routes from '../library-routes.js';
import { runInNewContext } from 'node:vm';

// Exercise the actual product route without a simulator, browser or network.
// Shared by source integration checks, not a second website renderer.
export function renderProducts(root) {
  const mount = { innerHTML: '' };
  const modal = { addEventListener() {} };
  runInNewContext(readFileSync(join(root, 'teaching-library.js'), 'utf8'), {
    document: {
      querySelector: selector => selector === '#app' ? mount : selector === '#modal' ? modal : null,
      querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {},
    },
    window: { DEVPT_ROUTES: routes, DEVPT_STATIC_RENDER: true, addEventListener() {} },
    location: { hash: '', pathname: '/products/', search: '', href: 'http://127.0.0.1:8109/products/', protocol: 'http:' },
    localStorage: { getItem: () => null }, URL, URLSearchParams, Event, clearTimeout, setTimeout,
  }, { filename: 'teaching-library.js', timeout: 1000 });
  return mount.innerHTML;
}
