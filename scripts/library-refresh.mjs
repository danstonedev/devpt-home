import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildPublicSite, catalogSnapshotPath } from './build-public-site.mjs';
import { fetchTeachingCatalog } from './wait-for-teaching-catalog.mjs';

const repository = 'danstonedev/devpt-home';
const workflow = 'azure-static-web-apps-black-tree-0e898330f.yml';
const siteOrigin = 'https://devpt.app';
const sha = /^[a-f0-9]{40}$/;
export const digest = text => createHash('sha256').update(text).digest('hex');
const fresh = url => url + (url.includes('?') ? '&' : '?') + 'release-check=' + Date.now();
const requestOptions = () => ({ redirect: 'manual', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache', 'user-agent': 'devpt-library-refresh' } });

// Notifications only wake reconciliation. Their SHA never selects code, a URL,
// or an older catalog; delayed and duplicate notifications read the live source.
export function refreshRequest({ sourceBuild = '', sourceRunId = '', retry = '0' } = {}) {
  if (sourceBuild !== '' && !sha.test(sourceBuild)) throw new Error('Source build must be a full SHA.');
  if (sourceRunId !== '' && !/^[1-9][0-9]*$/.test(sourceRunId)) throw new Error('Source run ID must be positive.');
  if (!/^[0-3]$/.test(String(retry))) throw new Error('Refresh retry must be 0–3.');
  return { sourceBuild, sourceRunId, retry: Number(retry) };
}

export function prepareRefresh({ catalogBody, revision, output = resolve('.cache/public-site'), manifestPath = resolve('.cache/library-refresh.json') }) {
  if (!sha.test(revision || '')) throw new Error('Export revision must be the checked-out main SHA.');
  const catalog = JSON.parse(catalogBody);
  const previous = process.env.GITHUB_SHA;
  let summary;
  try { process.env.GITHUB_SHA = revision; summary = buildPublicSite({ catalog, catalogBody, output }); }
  finally { if (previous === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = previous; }
  const pages = [];
  function visit(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.name === 'index.html') {
        const html = readFileSync(file, 'utf8');
        if (!html.includes('id="library-page-data"')) continue;
        const path = '/' + relative(output, file).replaceAll('\\', '/').replace(/index\.html$/, '');
        pages.push({ path, sha256: digest(html) });
      }
    }
  }
  visit(output);
  pages.sort((a, b) => a.path.localeCompare(b.path));
  const config = JSON.parse(readFileSync(join(output, 'staticwebapp.config.json'), 'utf8'));
  const redirects = config.routes.filter(item => item.route?.startsWith('/resources/') && item.statusCode === 301)
    .map(item => ({ path: item.route, location: item.redirect }));
  const release = JSON.parse(readFileSync(join(output, 'release.json'), 'utf8'));
  const identities = new Map(catalog.activities.map(item => [item.id, item]));
  const canonical = catalog.activities.filter(item => !(item.aliasOf && identities.has(item.aliasOf)));
  const resourcePaths = pages.filter(page => page.path.startsWith('/resources/')).map(page => page.path).sort();
  const expectedPaths = canonical.map(item => '/resources/' + item.id + '/').sort();
  if (release.resources !== canonical.length || JSON.stringify(resourcePaths) !== JSON.stringify(expectedPaths)) throw new Error('The export omitted or changed a canonical source resource route.');
  for (const item of catalog.activities.filter(item => item.aliasOf && identities.has(item.aliasOf))) {
    let target = item, seen = new Set([item.id]);
    while (target.aliasOf && identities.has(target.aliasOf)) {
      if (seen.has(target.aliasOf)) throw new Error('Cyclic source alias.');
      seen.add(target.aliasOf); target = identities.get(target.aliasOf);
    }
    if (!redirects.some(rule => rule.path === '/resources/' + item.id + '/' && rule.location === '/resources/' + target.id + '/')) throw new Error('The export omitted a canonical source alias redirect: ' + item.id);
  }
  const manifest = { schemaVersion: 1, catalogSha256: digest(catalogBody), release, pages, redirects };
  validateManifest(manifest);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { ...summary, sourceBuild: catalog.build, revision, pages: pages.length, aliases: redirects.length };
}

export function validateManifest(manifest) {
  const route = value => typeof value === 'string' && /^\/(?:[a-z0-9-]+\/)*$/.test(value);
  if (manifest?.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(manifest.catalogSha256 || '') ||
      !sha.test(manifest.release?.revision || '') || !sha.test(manifest.release?.catalogBuild || '') ||
      manifest.release.site !== 'devpt.app' || !Number.isSafeInteger(manifest.release.resources) || manifest.release.resources < 1 ||
      !Number.isSafeInteger(manifest.release.indexedPages) || manifest.release.indexedPages < 1 ||
      !Array.isArray(manifest.pages) || !manifest.pages.some(page => page.path === '/') ||
      !manifest.pages.every(page => route(page.path) && /^[a-f0-9]{64}$/.test(page.sha256 || '')) ||
      new Set(manifest.pages.map(page => page.path)).size !== manifest.pages.length ||
      !Array.isArray(manifest.redirects) || !manifest.redirects.every(item => route(item.path) && route(item.location))) {
    throw new Error('Invalid Library publication manifest.');
  }
  return manifest;
}

async function currentMain(fetcher = fetch, token = process.env.GITHUB_TOKEN) {
  if (!token) throw new Error('A repository token is required to check current Home main.');
  const response = await fetcher('https://api.github.com/repos/' + repository + '/commits/main', {
    ...requestOptions(), headers: { ...requestOptions().headers, authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
  });
  if (response.status !== 200) throw new Error('Cannot check current Home main: HTTP ' + response.status);
  const main = (await response.json()).sha;
  if (!sha.test(main || '')) throw new Error('Invalid current Home main revision.');
  return main;
}

export async function refreshIsCurrent(manifest, { fetcher = fetch, getMain = () => currentMain(fetcher) } = {}) {
  validateManifest(manifest);
  const [{ catalog, body }, main] = await Promise.all([fetchTeachingCatalog(fetcher), getMain()]);
  return catalog.build === manifest.release.catalogBuild && digest(body) === manifest.catalogSha256 && main === manifest.release.revision;
}

// Compare every source-rendered page, not just HTTP status: a SPA fallback,
// stale menu/count, omitted direct route, or old resource HTML cannot pass.
export async function verifyRefresh(manifest, { fetcher = fetch, workers = 12, attempts = 8, timeoutSeconds = 600, now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  validateManifest(manifest);
  if (!Number.isSafeInteger(workers) || workers < 1 || workers > 32 || !Number.isSafeInteger(attempts) || attempts < 1 || attempts > 20) throw new Error('Invalid publication verification bounds.');
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 600) throw new Error('Invalid publication verification timeout.');
  const deadline = now() + timeoutSeconds * 1000;
  let releaseReady = false;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const releaseResponse = await fetcher(fresh(siteOrigin + '/release.json'), requestOptions());
      releaseReady = releaseResponse.status === 200 && JSON.stringify(await releaseResponse.json()) === JSON.stringify(manifest.release);
    } catch { releaseReady = false; }
    if (releaseReady) break;
    if (now() >= deadline) break;
    if (attempt + 1 < attempts) await sleep(Math.min(15000, deadline - now()));
  }
  if (!releaseReady) throw new Error('Library release identity or counts do not match the export.');
  let pending = [
    { path: '/library-catalog.json', sha256: manifest.catalogSha256, kind: 'page' },
    { path: catalogSnapshotPath(manifest.catalogSha256), sha256: manifest.catalogSha256, kind: 'catalog' },
    ...manifest.pages.map(page => ({ ...page, kind: 'page' })),
    ...manifest.redirects.map(item => ({ ...item, kind: 'redirect' })),
  ];
  for (let attempt = 0; pending.length && attempt < attempts; attempt++) {
    const failures = [];
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(workers, pending.length) }, async () => {
      while (cursor < pending.length) {
        const item = pending[cursor++];
        try {
          if (now() >= deadline) throw new Error('Publication verification deadline reached.');
          const response = await fetcher(fresh(siteOrigin + item.path), requestOptions());
          if (item.kind === 'redirect') {
            const target = new URL(response.headers.get('location') || '', siteOrigin);
            // Azure may preserve the probe's cache-busting query on redirects.
            target.searchParams.delete('release-check');
            if (response.status !== 301 || target.href !== siteOrigin + item.location) throw new Error('Alias did not retain its canonical redirect.');
          } else {
            if (response.status !== 200 || digest(await response.text()) !== item.sha256) throw new Error('Exported file is missing or stale.');
            if (item.kind === 'catalog' && !/\bimmutable\b/i.test(response.headers.get('cache-control') || '')) throw new Error('Versioned catalog cannot be cached as immutable.');
          }
        } catch (error) { failures.push({ ...item, issue: error.message }); }
      }
    }));
    pending = failures;
    if (now() >= deadline) break;
    if (pending.length && attempt + 1 < attempts) await sleep(Math.min(15000, deadline - now()));
  }
  if (pending.length) throw new Error(`${pending.length} Library routes did not publish: ${pending.slice(0, 5).map(item => item.path + ' (' + item.issue + ')').join(', ')}`);
  return { pages: manifest.pages.length, aliases: manifest.redirects.length, resources: manifest.release.resources, catalogBuild: manifest.release.catalogBuild, revision: manifest.release.revision };
}

export function retryRequest(request, reason) {
  const parsed = refreshRequest(request);
  if (!['superseded', 'retry'].includes(reason)) throw new Error('Unknown reconciliation reason.');
  if (reason === 'retry' && parsed.retry === 3) throw new Error('Library refresh exhausted three automatic retries; inspect this failed run before retrying manually.');
  return { source_build: parsed.sourceBuild, source_run_id: parsed.sourceRunId, retry: String(reason === 'superseded' ? 0 : parsed.retry + 1) };
}

export async function queueRefresh(request, reason, { fetcher = fetch, token = process.env.GITHUB_TOKEN, repo = process.env.GITHUB_REPOSITORY, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (repo !== repository || !token) throw new Error('Refresh dispatch requires this repository and its Actions token.');
  const inputs = retryRequest(request, reason);
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetcher(`https://api.github.com/repos/${repository}/actions/workflows/${workflow}/dispatches`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'x-github-api-version': '2022-11-28' },
        body: JSON.stringify({ ref: 'main', inputs }),
      });
      if (response.status === 204) return inputs;
      if (response.status !== 429 && response.status < 500) throw new Error('Cannot queue Library refresh: HTTP ' + response.status);
    } catch (error) { if (response || attempt === 2) throw error; }
    if (attempt === 2) throw new Error('Cannot queue Library refresh after three attempts: HTTP ' + response.status);
    await sleep(2000 * (attempt + 1));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  const request = refreshRequest({ sourceBuild: process.env.SOURCE_BUILD || '', sourceRunId: process.env.SOURCE_RUN_ID || '', retry: process.env.REFRESH_RETRY || '0' });
  const manifestPath = resolve('.cache/library-refresh.json');
  const output = (key, value) => { console.log(key + '=' + value); if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, key + '=' + value + '\n'); };
  if (mode === 'prepare') {
    console.log('Reconcile current published catalog; notification hint:', request);
    console.log(prepareRefresh({ catalogBody: readFileSync('.cache/teaching-catalog.json', 'utf8'), revision: process.env.HOME_REVISION, manifestPath }));
  } else if (mode === 'check-current') {
    output('current', await refreshIsCurrent(JSON.parse(readFileSync(manifestPath, 'utf8'))));
  } else if (mode === 'verify') {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const result = await verifyRefresh(manifest);
    const current = await refreshIsCurrent(manifest);
    const receipt = { ...result, checkedAt: new Date().toISOString(), verified: true, current };
    writeFileSync('.cache/library-publication-verification.json', JSON.stringify(receipt, null, 2) + '\n');
    console.log(receipt);
    output('current', current);
  } else if (mode === 'queue') {
    console.log('Queued current-main reconciliation:', await queueRefresh(request, process.argv[3]));
  } else throw new Error('Use prepare, check-current, verify or queue.');
}
