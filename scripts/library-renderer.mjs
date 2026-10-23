import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createContext, Script } from 'node:vm';

// Use the actual website templates with the source's public projection.
export function libraryRenderer(root, catalog) {
  if (catalog?.schemaVersion !== 1 || catalog.status !== 'public-resources' || catalog.source !== 'simlab' || !/^[a-f0-9]{40}$/.test(catalog.build || '')) throw new Error('Expected a revisioned, source-owned public teaching catalog.');
  const mount = { innerHTML: '' }, modal = { addEventListener() {} };
  const context = createContext({
    window: { DEVPT_STATIC_RENDER: true, DEVPT_CATALOG_STATE: 'ready', DEVPT_TEACHING_CATALOG: catalog, addEventListener() {} },
    document: { querySelector: selector => selector === '#app' ? mount : selector === '#modal' ? modal : null, querySelectorAll: () => [], addEventListener() {}, dispatchEvent() {} },
    location: new URL('https://devpt.app/'),
    history: { state: null, replaceState(_state, _title, href) { context.location = new URL(href, 'https://devpt.app'); } },
    localStorage: { getItem: () => null }, URL, URLSearchParams, Event, clearTimeout, setTimeout,
  });
  for (const file of ['library-routes.js', 'site-media.js', 'teaching-library.js']) new Script(readFileSync(join(root, file), 'utf8'), { filename: file }).runInContext(context, { timeout: 3000 });
  if (!new Script('catalogValid').runInContext(context)) throw new Error('Published resource metadata failed website validation.');
  for (const item of catalog.activities) {
    const url = new URL(item.url);
    if (url.origin !== 'https://lab.devpt.app' || url.pathname !== '/teaching/' || url.searchParams.get('activity') !== (item.nativeId || item.id)) throw new Error('Resource escaped its source-owned public player: ' + item.id);
  }
  const summary = new Script('({activities:LISTED,regions:REGIONS,topics:TOPICS})').runInContext(context);
  const render = new Script('render(); window.DEVPT_PAGE', { filename: 'render-public-page' });
  return { ...JSON.parse(JSON.stringify(summary)), render(path) {
    context.location = new URL(path, 'https://devpt.app');
    const metadata = render.runInContext(context, { timeout: 3000 });
    return { html: mount.innerHTML, metadata: JSON.parse(JSON.stringify(metadata)) };
  } };
}
