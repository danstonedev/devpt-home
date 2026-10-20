import { pathToFileURL } from 'node:url';
import { permitsDevPT } from './wait-for-showcases.mjs';

const origin = 'https://lab.devpt.app';
export async function probeTeachingCatalog(fetcher = fetch) {
  try {
    const response = await fetcher(origin + '/teaching/catalog.json', {
      redirect: 'manual', signal: AbortSignal.timeout(10000),
      headers: { 'cache-control': 'no-cache', 'user-agent': 'devpt-teaching-release-check' },
    });
    if (response.status !== 200) return `Teaching catalog: HTTP ${response.status}`;
    const cors = response.headers.get('access-control-allow-origin');
    if (cors !== '*' && cors !== 'https://devpt.app') return 'Teaching catalog does not permit DevPT discovery';
    const catalog = await response.json();
    if (catalog.schemaVersion !== 1 || catalog.status !== 'public-resources' || catalog.source !== 'simlab' ||
        !Array.isArray(catalog.activities) || !catalog.activities.length || !/^[a-f0-9]{40}$/.test(catalog.build || '')) return 'Published teaching catalog contract is unavailable';
    const ids = new Set();
    for (const activity of catalog.activities) {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(activity.id || '') || ids.has(activity.id)) return 'Published catalog has invalid resource IDs';
      ids.add(activity.id);
      const url = new URL(activity.url);
      if (url.origin !== origin || url.pathname !== '/teaching/' || url.searchParams.get('activity') !== (activity.nativeId || activity.id)) return 'Published resource escaped its source-owned teaching entry';
    }
    const entry = await fetcher(origin + '/teaching/?activity=' + encodeURIComponent(catalog.activities[0].nativeId || catalog.activities[0].id), {
      redirect: 'manual', signal: AbortSignal.timeout(10000), headers: { 'cache-control': 'no-cache' },
    });
    if (entry.status !== 200) return `Teaching entry: HTTP ${entry.status}`;
    if (!permitsDevPT(entry.headers.get('content-security-policy'))) return 'Teaching entry does not permit DevPT framing';
    if (!/devpt-teaching/i.test(await entry.text())) return 'Teaching entry is not the source-owned resource build';
    return null;
  } catch (error) { return `Teaching resource deployment unavailable: ${error.name}`; }
}
export async function waitForTeachingCatalog(timeoutSeconds = 0) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (true) {
    const issue = await probeTeachingCatalog();
    if (!issue) { console.log('Published teaching catalog and trusted source entry are deployed.'); return true; }
    console.log(issue);
    if (Date.now() >= deadline) return false;
    await new Promise(resolve => setTimeout(resolve, Math.min(15000, deadline - Date.now())));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const index = process.argv.indexOf('--timeout-seconds');
  const seconds = index < 0 ? 0 : Number(process.argv[index + 1]);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1800) throw new Error('Timeout must be 0–1800 seconds.');
  if (!(await waitForTeachingCatalog(seconds))) process.exitCode = 1;
}
