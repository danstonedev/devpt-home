import assert from 'node:assert/strict';
import test from 'node:test';
import { probeTeachingCatalog } from './wait-for-teaching-catalog.mjs';

const data = { schemaVersion: 1, status: 'public-resources', source: 'simlab', build: 'a'.repeat(40), activities: [{ id: 'hip-anatomy', url: 'https://lab.devpt.app/teaching/?activity=hip-anatomy' }] };
function source({ catalog = data, cors = '*', csp = "frame-ancestors 'self' https://devpt.app https://www.devpt.app", marker = '<meta name="devpt-teaching" content="simlab-teaching:v1">' } = {}) {
  return async url => url.endsWith('/catalog.json')
    ? new Response(JSON.stringify(catalog), { headers: { 'access-control-allow-origin': cors } })
    : new Response(marker, { headers: { 'content-security-policy': csp } });
}
test('only a deployed published source catalog and trusted teaching entry release the hub', async () => {
  assert.equal(await probeTeachingCatalog(source()), null);
  for (const changes of [
    { catalog: { ...data, status: 'local-development-only' } },
    { catalog: { ...data, activities: [] } },
    { catalog: { ...data, build: 'unknown' } },
    { catalog: { ...data, activities: [{ ...data.activities[0], url: 'https://other.example/teaching/?activity=hip-anatomy' }] } },
    { cors: 'https://other.example' },
    { csp: "frame-ancestors 'self' https://devpt.app" },
    { marker: '<title>Authentication required</title>' },
  ]) assert.notEqual(await probeTeachingCatalog(source(changes)), null);
});
