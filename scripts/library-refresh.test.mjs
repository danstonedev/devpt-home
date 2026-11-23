import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { digest, prepareRefresh, queueRefresh, refreshIsCurrent, refreshRequest, retryRequest, validateManifest, verifyRefresh } from './library-refresh.mjs';

const revision = 'a'.repeat(40), build = 'b'.repeat(40);
const body = JSON.stringify({ schemaVersion: 1, status: 'public-resources', source: 'simlab', build, activities: [{ id: 'posture-test', url: 'https://lab.devpt.app/teaching/?activity=posture-test' }] });
const page = '<html>exact menu, count and canonical resource</html>';
const manifest = { schemaVersion: 1, catalogSha256: digest(body), release: { schemaVersion: 1, site: 'devpt.app', revision, catalogBuild: build, resources: 1, indexedPages: 12 }, pages: [{ path: '/', sha256: digest(page) }, { path: '/resources/posture-test/', sha256: digest(page) }], redirects: [{ path: '/resources/old-posture/', location: '/resources/posture-test/' }] };
const versionedCatalog = `/library-snapshots/${manifest.catalogSha256}.json`;
const framing = { 'content-security-policy': "frame-ancestors 'self' https://devpt.app https://www.devpt.app" };
const source = (catalogBody = body) => async url => new URL(url).pathname === '/teaching/catalog.json' ? new Response(catalogBody, { headers: { 'access-control-allow-origin': '*' } }) : new Response('devpt-teaching', { headers: framing });
const published = async url => {
  assert.equal(new URL(url).origin, 'https://devpt.app');
  assert.ok(new URL(url).searchParams.has('release-check'));
  const path = new URL(url).pathname;
  if (path === '/release.json') return Response.json(manifest.release);
  if (path === '/library-catalog.json') return new Response(body);
  if (path === versionedCatalog) return new Response(body, { headers: { 'cache-control': 'public, max-age=31536000, immutable' } });
  if (path === '/resources/old-posture/') return new Response(null, { status: 301, headers: { location: '/resources/posture-test/?release-check=echoed-probe' } });
  return new Response(page);
};

test('notifications are bounded wake-up metadata, never branch or source URL selectors', () => {
  assert.deepEqual(refreshRequest(), { sourceBuild: '', sourceRunId: '', retry: 0 });
  assert.equal(refreshRequest({ sourceBuild: build, sourceRunId: '123' }).sourceBuild, build);
  for (const request of [{ sourceBuild: 'main' }, { sourceBuild: 'https://evil.example' }, { sourceRunId: '../private' }, { retry: '-1' }, { retry: '4' }, { retry: '1.5' }]) assert.throws(() => refreshRequest(request));
});

test('duplicate/out-of-order wake-ups all reconcile the current immutable snapshot', async () => {
  for (const hint of [build, 'c'.repeat(40), build, 'd'.repeat(40)]) {
    refreshRequest({ sourceBuild: hint });
    assert.equal(await refreshIsCurrent(manifest, { fetcher: source(), getMain: async () => revision }), true);
  }
  assert.equal(await refreshIsCurrent(manifest, { fetcher: source(body.replace(build, 'c'.repeat(40))), getMain: async () => revision }), false);
  assert.equal(await refreshIsCurrent(manifest, { fetcher: source(), getMain: async () => 'd'.repeat(40) }), false);
  // Even same-build bytes must not silently change after export.
  assert.equal(await refreshIsCurrent(manifest, { fetcher: source(body + '\n'), getMain: async () => revision }), false);
  await assert.rejects(refreshIsCurrent(manifest, { fetcher: source('{}'), getMain: async () => revision }));
});

test('live verification requires release identity/counts, every exact page, and canonical aliases', async () => {
  assert.deepEqual(await verifyRefresh(manifest, { fetcher: published, attempts: 1 }), { pages: 2, aliases: 1, resources: 1, catalogBuild: build, revision });
  for (const issue of ['release', 'snapshot', 'versioned snapshot', 'cache header', 'fallback', 'missing', 'alias']) {
    await assert.rejects(verifyRefresh(manifest, { attempts: 1, fetcher: async url => {
      const path = new URL(url).pathname;
      if (issue === 'release' && path === '/release.json') return Response.json({ ...manifest.release, resources: 2 });
      if (issue === 'snapshot' && path === '/library-catalog.json') return new Response(body.replace(build, 'c'.repeat(40)));
      if (issue === 'versioned snapshot' && path === versionedCatalog) return new Response('missing', { status: 404 });
      if (issue === 'cache header' && path === versionedCatalog) return new Response(body, { headers: { 'cache-control': 'no-cache' } });
      if (issue === 'fallback' && path === '/resources/posture-test/') return new Response('<html>generic homepage fallback</html>');
      if (issue === 'missing' && path === '/resources/posture-test/') return new Response('missing', { status: 404 });
      if (issue === 'alias' && path === '/resources/old-posture/') return new Response(null, { status: 301, headers: { location: 'https://evil.example/' } });
      return published(url);
    } }), /identity or counts|routes did not publish/);
  }
  await assert.rejects(verifyRefresh(manifest, { workers: 0, attempts: 1, fetcher: published }), /bounds/);
});

test('publication retries CDN convergence without accepting partial exports', async () => {
  let releaseCalls = 0, pageCalls = 0, waits = 0;
  await verifyRefresh(manifest, { attempts: 3, sleep: async () => { waits++; }, fetcher: async url => {
    if (new URL(url).pathname === '/release.json' && ++releaseCalls === 1) return Response.json({ ...manifest.release, catalogBuild: 'c'.repeat(40) });
    if (new URL(url).pathname === '/resources/posture-test/' && ++pageCalls === 1) return new Response('old');
    return published(url);
  } });
  assert.equal(waits, 2);
});

test('rapid releases requeue current reconciliation, failures have bounded automatic retries', async () => {
  assert.equal(retryRequest({ sourceBuild: build, retry: '3' }, 'superseded').retry, '0');
  assert.equal(retryRequest({ retry: '2' }, 'retry').retry, '3');
  assert.throws(() => retryRequest({ retry: '3' }, 'retry'), /exhausted/);
  let called = 0;
  const queued = await queueRefresh({ sourceBuild: build, sourceRunId: '42', retry: '1' }, 'retry', { repo: 'danstonedev/devpt-home', token: 'test-only', fetcher: async (url, options) => {
    called++;
    assert.equal(url, 'https://api.github.com/repos/danstonedev/devpt-home/actions/workflows/azure-static-web-apps-black-tree-0e898330f.yml/dispatches');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main', inputs: { source_build: build, source_run_id: '42', retry: '2' } });
    return new Response(null, { status: 204 });
  } });
  assert.equal(queued.retry, '2'); assert.equal(called, 1);
  let attempts = 0;
  await queueRefresh({}, 'retry', { repo: 'danstonedev/devpt-home', token: 'test-only', sleep: async () => {}, fetcher: async () => new Response(null, { status: ++attempts === 1 ? 503 : 204 }) });
  assert.equal(attempts, 2);
  await assert.rejects(queueRefresh({}, 'retry', { repo: 'other/repo', token: 'test-only' }), /this repository/);
});

test('one catalog snapshot generates the real menus, counts, complete route manifest and aliases', () => {
  const dir = mkdtempSync(join(tmpdir(), 'devpt-refresh-test-'));
  try {
    const catalog = JSON.parse(readFileSync(new URL('../e2e/fixtures/public-catalog.json', import.meta.url), 'utf8'));
    catalog.build = build;
    const output = join(dir, 'public'), manifestPath = join(dir, 'manifest.json');
    const result = prepareRefresh({ catalogBody: JSON.stringify(catalog), revision, output, manifestPath });
    const generated = validateManifest(JSON.parse(readFileSync(manifestPath, 'utf8')));
    assert.equal(generated.release.catalogBuild, build);
    assert.equal(generated.release.revision, revision);
    assert.equal(result.resources, generated.release.resources);
    assert.ok(generated.pages.some(item => item.path === '/topics/'));
    assert.ok(generated.pages.some(item => item.path === '/resources/exam-special-lachman/'));
    assert.ok(generated.redirects.some(item => item.path === '/resources/hip-anatomy/' && item.location === '/resources/anatomy-hip/'));
    const homepage = readFileSync(join(output, 'index.html'), 'utf8');
    assert.equal(generated.pages.find(item => item.path === '/').sha256, digest(homepage));
    assert.equal(readFileSync(join(output, 'library-catalog.json'), 'utf8'), JSON.stringify(catalog));
    const snapshotPath = `/library-snapshots/${generated.catalogSha256}.json`;
    assert.ok(homepage.includes(`href="${snapshotPath}"`));
    assert.equal(readFileSync(join(output, snapshotPath), 'utf8'), JSON.stringify(catalog));
    assert.throws(() => prepareRefresh({ catalogBody: '{}', revision, output, manifestPath }));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('workflow serializes pushes and notifications, pins snapshot bytes and requeues superseded uploads', () => {
  const workflow = readFileSync(new URL('../.github/workflows/azure-static-web-apps-black-tree-0e898330f.yml', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /group: devpt-publication\n  cancel-in-progress: false/);
  assert.match(workflow, /ref: main/);
  assert.match(workflow, /--output .cache\/teaching-catalog.json/);
  assert.ok(workflow.indexOf('library-refresh.mjs check-current') < workflow.indexOf('uses: Azure/static-web-apps-deploy@v1'));
  assert.match(workflow, /if: steps.freshness.outputs.current == 'true'/);
  assert.match(workflow, /library-refresh.mjs queue superseded/);
  assert.match(workflow, /if: failure\(\)\n        run: node scripts\/library-refresh.mjs queue retry/);
  assert.match(workflow, /scripts\/wait-for-showcases.mjs --timeout-seconds 1800/);
  assert.doesNotMatch(workflow, /pull_request_target/);
});
