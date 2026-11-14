import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { permitsDevPT } from './wait-for-showcases.mjs';

const origin = 'https://lab.devpt.app';
export async function fetchTeachingCatalog(fetcher = fetch, { expectedBuild, nonce = Date.now() } = {}) {
    if (expectedBuild !== undefined && !/^[a-f0-9]{40}$/.test(expectedBuild)) throw new Error('Expected a full source build SHA.');
    const response = await fetcher(origin + '/teaching/catalog.json?release-check=' + encodeURIComponent(nonce), {
      redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { 'cache-control': 'no-cache', 'user-agent': 'devpt-teaching-release-check' },
    });
    if (response.status !== 200) throw new Error(`Teaching catalog: HTTP ${response.status}`);
    const cors = response.headers.get('access-control-allow-origin');
    if (cors !== '*' && cors !== 'https://devpt.app') throw new Error('Teaching catalog does not permit DevPT discovery');
    const body = await response.text();
    const catalog = JSON.parse(body);
    if (catalog.schemaVersion !== 1 || catalog.status !== 'public-resources' || catalog.source !== 'simlab' ||
        !Array.isArray(catalog.activities) || !catalog.activities.length || !/^[a-f0-9]{40}$/.test(catalog.build || '')) throw new Error('Published teaching catalog contract is unavailable');
    if (expectedBuild !== undefined && catalog.build !== expectedBuild) throw new Error('Teaching catalog is not the expected deployed build: ' + catalog.build);
    const ids = new Set();
    for (const activity of catalog.activities) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(activity.id || '') || ids.has(activity.id)) throw new Error('Published catalog has invalid resource IDs');
      ids.add(activity.id);
      const url = new URL(activity.url);
      if (url.origin !== origin || url.pathname !== '/teaching/' || url.searchParams.get('activity') !== (activity.nativeId || activity.id)) throw new Error('Published resource escaped its source-owned teaching entry');
    }
    const entry = await fetcher(origin + '/teaching/?activity=' + encodeURIComponent(catalog.activities[0].nativeId || catalog.activities[0].id), {
      redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'cache-control': 'no-cache' },
    });
    if (entry.status !== 200) throw new Error(`Teaching entry: HTTP ${entry.status}`);
    if (!permitsDevPT(entry.headers.get('content-security-policy'))) throw new Error('Teaching entry does not permit DevPT framing');
    if (!/devpt-teaching/i.test(await entry.text())) throw new Error('Teaching entry is not the source-owned resource build');
    return { catalog, body };
}
export async function probeTeachingCatalog(fetcher = fetch, options = {}) {
  try { await fetchTeachingCatalog(fetcher, options); return null; }
  catch (error) { return `Teaching resource deployment unavailable: ${error.message}`; }
}
export async function waitForTeachingCatalog(timeoutSeconds = 0, { expectedBuild, output, fetcher = fetch, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const deadline = now() + timeoutSeconds * 1000;
  while (true) {
    try {
      const snapshot = await fetchTeachingCatalog(fetcher, { expectedBuild, nonce: now() });
      if (output) { mkdirSync(dirname(resolve(output)), { recursive: true }); writeFileSync(output, snapshot.body); }
      console.log('Published teaching catalog and trusted source entry are deployed: ' + snapshot.catalog.build);
      return true;
    } catch (error) { console.log(error.message); }
    if (now() >= deadline) return false;
    await sleep(Math.min(15000, deadline - now()));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--timeout-seconds');
  const seconds = index < 0 ? 0 : Number(process.argv[index + 1]);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1800) throw new Error('Timeout must be 0–1800 seconds.');
  const argument = name => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
  if (!(await waitForTeachingCatalog(seconds, { expectedBuild: argument('--build'), output: argument('--output') }))) process.exitCode = 1;
}
