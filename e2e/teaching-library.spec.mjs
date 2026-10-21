import { expect, test } from '@playwright/test';

const catalogUrl = 'https://lab.devpt.app/teaching/catalog.json';
// Protocol-only fixtures exercise discovery/sharing. Actual model/player
// rendering is verified in the source repository, never imitated here.
const fields = { minutes: 0, level: 'Reference', media: 'anatomy', symbol: 'layers', desc: 'Protocol fixture', outcome: 'Protocol fixture', source: 'Source-owned fixture' };
const regions = [{ id: 'hip', label: 'Hip' }, { id: 'knee', label: 'Knee' }, { id: 'whole-body', label: 'Whole body' }];
const topics = [{ id: 'anatomy', label: 'Anatomy' }, { id: 'special-tests', label: 'Special tests' }, { id: 'gait-balance', label: 'Gait & balance' }];
const item = (id, title, regionId, topicId, extra = {}) => ({
  id, nativeId: id, title, regionId, region: regions.find(region => region.id === regionId).label,
  topicId, topic: topics.find(topic => topic.id === topicId).label, type: 'Interactive resource', context: 'Fixture lab', ...fields, ...extra,
});
const activities = [
  item('hip-anatomy', 'Hip anatomy at rest', 'hip', 'anatomy', { aliasOf: 'anatomy-hip' }),
  item('gait', 'Native walk', 'whole-body', 'gait-balance', { media: 'gait' }),
  item('anatomy-hip', 'Hip anatomy at rest', 'hip', 'anatomy', { launch: { kind: 'joint', initial: 'hip:flexion', rest: true } }),
  item('exam-special-lachman', 'Lachman test', 'knee', 'special-tests', { keywords: ['ACL'], launch: { kind: 'movement', entry: 'exam:special:lachman' } }),
  item('exam-special-mcmurray', 'McMurray test', 'knee', 'special-tests', { launch: { kind: 'movement', entry: 'exam:special:mcmurray' } }),
  item('demo-mcmurray-medial', 'Positive McMurray (medial)', 'knee', 'special-tests', { group: 'Example findings', launch: { kind: 'movement', preset: 'mcmurray-medial' } }),
];
const catalog = { schemaVersion: 1, status: 'public-resources', source: 'simlab', regions, topics, activities };
async function nav(page, href) {
  const link=page.locator('.topbar a[href="'+href+'"]');
  if (!(await link.isVisible())) await page.getByRole('button', { name: 'Toggle navigation' }).click();
  await link.click();
}
async function routeCatalog(context, value = catalog) {
  await context.route(catalogUrl, route => route.fulfill({ json: value }));
}

test('a delayed catalog cannot block or remount the product route', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(catalogUrl, async route => { await gate; await route.fulfill({ json: catalog }); });
  await page.goto('/#/products');
  await expect(page.locator('main h1')).toHaveText('DevPT products');
  await page.locator('[data-product="emrs"]').evaluate(element => { element.dataset.retainedProbe = 'yes'; });
  release();
  await page.waitForFunction(() => window.DEVPT_CATALOG_STATE === 'ready');
  await expect(page.locator('[data-product="emrs"]')).toHaveAttribute('data-retained-probe', 'yes');
  await nav(page, '#/library');
  // The curated hip activity is listed once, as the reference item it aliases.
  await expect(page.locator('.ref-result')).toHaveCount(5);
});

test('unpublished catalog data fails closed while product navigation works', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await routeCatalog(page, { ...catalog, status: 'local-development-only' });
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: 'Library unavailable' })).toBeVisible();
  await expect(page.locator('.ref-result')).toHaveCount(0);
  await nav(page, '#/products');
  await expect(page.locator('article[data-product]')).toHaveCount(3);
  expect(requests.some(url => /local-site-config|\/native\/|__local\/gait-physics/.test(url))).toBe(false);
});

test('regions and topics file every resource, and search finds an item by name or common term', async ({ page }) => {
  await routeCatalog(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Reference library', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Knee, 3 resources' }).click();
  await expect(page).toHaveURL(/#\/region\/knee$/);
  const tests = page.locator('#part-special-tests');
  await expect(tests.getByRole('heading', { name: /Special tests/ })).toBeVisible();
  await expect(tests.locator('.ref-group h3')).toHaveText(['Example findings']);
  await expect(tests.locator('li a')).toHaveText(['Lachman test', 'McMurray test', 'Positive McMurray (medial)']);
  await page.getByRole('searchbox', { name: 'Filter Knee resources' }).fill('lach');
  await expect(tests.locator('li:visible a')).toHaveText(['Lachman test']);
  await page.getByRole('searchbox', { name: 'Filter Knee resources' }).fill('acl');
  await expect(tests.locator('li:visible a')).toHaveText(['Lachman test']);
  await page.getByRole('searchbox', { name: 'Filter Knee resources' }).fill('shoulder');
  await expect(page.getByText('No knee resources match.')).toBeVisible();
  await page.goto('/#/topic/special-tests');
  await expect(page.locator('.ref-section h2 a')).toHaveText(['Knee']);
  await page.goto('/');
  await page.getByRole('searchbox', { name: /Search, for example/ }).fill('lachman');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/#\/library\?q=lachman$/);
  await expect(page.locator('.ref-result')).toHaveCount(1);
  await expect(page.locator('.ref-result a span')).toHaveText('Knee › Special tests');
  await page.locator('.ref-result a').click();
  await expect(page.getByRole('heading', { name: 'Lachman test', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/Knee\s*Special tests/);
  await expect(page.locator('.ref-related li a')).toHaveText(['McMurray test', 'Positive McMurray (medial)']);
});

test('earlier activity and collection links open their place in the reference', async ({ page }) => {
  await routeCatalog(page);
  await page.goto('/#/activity/hip-anatomy');
  await expect(page.getByRole('heading', { name: 'Hip anatomy at rest', level: 1 })).toBeVisible();
  await expect(page.locator('[data-player-asset]')).toHaveAttribute('data-player-asset', 'anatomy-hip');
  await page.goto('/#/collection/all-hip');
  await expect(page).toHaveURL(/#\/region\/hip$/);
  await page.goto('/#/collection/eyes-vestibular');
  await expect(page.getByRole('heading', { name: 'Topic unavailable' })).toBeVisible();
});

test('an earlier catalog without regions, topics or ids still renders by its labels', async ({ page }) => {
  const legacy = activities.filter(activity => !activity.launch).map(({ regionId, topicId, aliasOf, context, ...rest }) => rest);
  await routeCatalog(page, { schemaVersion: 1, status: 'public-resources', source: 'simlab', activities: legacy });
  await page.goto('/#/regions');
  await expect(page.locator('.ref-card strong')).toHaveText(['Hip', 'Whole body']);
  await page.goto('/#/collection/all-hip');
  await expect(page.locator('.ref-section li a')).toHaveText(['Hip anatomy at rest']);
});

test('selected resource IDs open in a clean browser without an account', async ({ page, browser }) => {
  await routeCatalog(page);
  await page.goto('/#/library');
  for (const id of ['anatomy-hip', 'gait']) await page.locator(`[data-add="${id}"]`).click();
  await page.locator('.topbar a[href="#/saved"]').click();
  await page.locator('[data-share-saved]').click();
  const url = await page.getByRole('textbox', { name: 'Resource share link' }).inputValue();
  expect(new URL(url).hash).toBe('#/saved?ids=anatomy-hip,gait');
  await expect(page.getByText('Local build · recipients need access to this site.')).toHaveCount(0);
  const context = await browser.newContext();
  try {
    await routeCatalog(context);
    const recipient = await context.newPage();
    await recipient.goto(url);
    await expect(recipient.getByRole('heading', { name: 'Shared resources', exact: true })).toBeVisible();
    await expect(recipient.locator('.ref-result')).toHaveCount(2);
    expect(await recipient.evaluate(() => localStorage.getItem('devpt.saved-resources.v1'))).toBeNull();
  } finally { await context.close(); }
});

test('resource activation uses only its canonical player and validates the sender', async ({ page }) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Protocol-only source fixture</title><p>Protocol-only source fixture</p>',
  }));
  await page.goto('/#/activity/exam-special-lachman');
  await expect(page.getByRole('button', { name: 'Open resource', exact: true })).toBeVisible();
  await expect(page.locator('.native-frame')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open resource', exact: true }).click();
  await expect(page.locator('.native-frame')).toHaveAttribute('src', 'https://lab.devpt.app/teaching/?activity=exam-special-lachman&embedded=1');
  await page.evaluate(() => dispatchEvent(new MessageEvent('message', {
    origin: 'https://lab.devpt.app', source: window,
    data: { type: 'devpt-teaching-ready', activity: 'exam-special-lachman' },
  })));
  await expect(page.locator('.native-player')).not.toHaveAttribute('data-ready', 'true');
  const source = page.frames().find(frame => frame.url().startsWith('https://lab.devpt.app/teaching/'));
  await source.evaluate(parentOrigin => parent.postMessage({ type: 'devpt-teaching-ready', activity: 'exam-special-lachman' }, parentOrigin), new URL(page.url()).origin);
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-status')).toHaveText('Ready');
  await nav(page, '#/topics');
  await expect(page.locator('.native-frame')).toHaveCount(0);
});

test('the home hero renders before the catalog and region turntables load only on hover', async ({ page }, testInfo) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const videos = [];
  page.on('request', request => /\/assets\/library\/.*\.(webm|mp4)$/.test(request.url()) && videos.push(request.url()));
  await page.route(catalogUrl, async route => { await gate; await route.fulfill({ json: catalog }); });
  await page.goto('/');
  await expect(page.locator('.devpt-hero h1')).toHaveText('Reference library');
  await expect(page.locator('.ref-grid.regions .ref-card-shell')).toHaveCount(9);
  release();
  await expect(page.locator('.region-card')).toHaveCount(3);
  await expect(page.locator('.region-card').first().locator('img')).toHaveAttribute('src', '/assets/library/region-hip.webp');
  await expect(page.locator('.topic-card .ref-card-glyph')).toHaveCount(3);
  expect(videos).toEqual([]);
  if (testInfo.project.name === 'phone') return;
  await page.locator('.region-card').first().hover();
  await expect(page.locator('.region-card').first().locator('video')).toHaveAttribute('src', /\/assets\/library\/region-hip\.(webm|mp4)$/);
  expect(videos).toHaveLength(1);
});

test('report an issue names the resource and builds a report with its page details', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await routeCatalog(page);
  await page.goto('/#/activity/exam-special-lachman');
  await expect(page.locator('.beta-tag')).toHaveText('Beta');
  await page.locator('[data-report="exam-special-lachman"]').click();
  const dialog = page.locator('[data-report-form]');
  await expect(dialog.locator('.report-about strong')).toHaveText('Lachman test — Knee › Special tests');
  await dialog.getByRole('radio', { name: 'Animation or 3D model looks wrong' }).check();
  await dialog.locator('textarea[name="details"]').fill('The tibia translates backward.');
  await dialog.locator('[data-copy-report]').click();
  const report = await page.evaluate(() => navigator.clipboard.readText());
  expect(report).toContain('[Reference library]');
  expect(report).toContain('Lachman test');
  expect(report).toContain('The tibia translates backward.');
  expect(report).toContain('Animation or 3D model looks wrong');
  expect(report).toContain('#/activity/exam-special-lachman');
});
