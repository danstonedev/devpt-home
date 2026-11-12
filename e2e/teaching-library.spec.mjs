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
/** On a phone a resource opens full screen, its player covering the page; Back gives the page back, as on a phone. */
async function pageBack(page, testInfo) {
  if (testInfo.project.name !== 'phone') return;
  await expect(page.locator('.native-player')).toHaveClass(/\bfullscreen\b/);
  await page.goBack();
  await expect(page.locator('.native-player')).not.toHaveClass(/\bfullscreen\b/);
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

test('regions and topics file every resource, and search finds an item by name or common term', async ({ page }, testInfo) => {
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
  await expect(page.locator('.ref-result .result-copy > span')).toHaveText('Knee › Special tests');
  await page.locator('.ref-result a').click();
  await pageBack(page, testInfo);
  await expect(page.getByRole('heading', { name: 'Lachman test', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/Knee\s*Special tests/);
  await expect(page.getByRole('combobox', { name: 'Switch Knee › Special tests resource' }).locator('option')).toHaveText(['Lachman test', 'McMurray test', 'Positive McMurray (medial)']);
});

// The source's sections (simLAB's five shelves, in course order) with the topics filed under them. A section with no
// listed topic is left out; a topic under no section stays listed and linked, off the shelves.
const sections = [{ id: 'structure-function', label: 'Structure & function' }, { id: 'examination', label: 'Examination' }, { id: 'clinical-reasoning', label: 'Clinical reasoning' }, { id: 'intervention', label: 'Intervention' }];
const shelvedTopics = [
  { id: 'anatomy', label: 'Anatomy', sectionId: 'structure-function' }, { id: 'special-tests', label: 'Special tests', sectionId: 'examination' },
  { id: 'gait-balance', label: 'Gait & balance', sectionId: 'examination' }, { id: 'clinical-cases', label: 'Clinical cases', sectionId: 'clinical-reasoning' },
  { id: 'manual-therapy', label: 'Manual therapy', sectionId: 'intervention' }, { id: 'source-previews', label: 'Native motion previews' },
];
const shelved = (id, title, regionId, topicId) => ({ ...item(id, title, regionId, 'anatomy'), topicId, topic: shelvedTopics.find(topic => topic.id === topicId).label });
const sectioned = { ...catalog, sections, topics: shelvedTopics, activities: [...activities,
  shelved('anatomy-knee', 'Knee anatomy at rest', 'knee', 'anatomy'),
  shelved('joint-knee-posterior-glide', 'Tibial posterior glide', 'knee', 'manual-therapy'), shelved('joint-knee-anterior-glide', 'Tibial anterior glide', 'knee', 'manual-therapy'),
  shelved('native-walk-f', 'Walk F source take', 'whole-body', 'source-previews'), shelved('native-idle-m', 'Idle M source take', 'whole-body', 'source-previews'),
] };

test('sections shelve the topics in course order on every page, and an unshelved topic stays linked off the shelves', async ({ page }) => {
  await routeCatalog(page, sectioned);
  await page.goto('/');
  // Home: one row per section that has topics, in the source's order, then the topic filed under no section.
  const byTopic = page.getByRole('region', { name: 'By topic' });
  await expect(byTopic.getByRole('heading', { level: 3 })).toHaveText([/^Structure & function/, /^Examination/, /^Intervention/]);
  await expect(byTopic.getByRole('listitem').filter({ has: page.getByRole('heading', { name: /^Examination/ }) }).getByRole('link')).toHaveText(['Examination', /^Special tests/, /^Gait & balance/]);
  await expect(byTopic.getByText('Also in the library').locator('..').getByRole('link')).toHaveText([/^Native motion previews/]);
  await byTopic.getByRole('link', { name: 'Special tests, 3 resources' }).click();
  await expect(page).toHaveURL(/#\/topic\/special-tests$/);
  // A topic names its section on the way back up, and the section has its own page.
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toHaveText(/Topics\s*Examination\s*Special tests/);
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Examination' }).click();
  await expect(page).toHaveURL(/#\/section\/examination$/);
  await expect(page.getByRole('heading', { name: 'Examination', level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Examination · DevPT');
  await expect(page.locator('main').getByRole('link', { name: /, \d+ resources$/ })).toHaveText([/^Special tests/, /^Gait & balance/]);
  await page.goto('/#/section/clinical-reasoning');
  await expect(page.getByRole('heading', { name: 'Section unavailable' })).toBeVisible();
  // Topics: the same sections as headings over their topic cards.
  await page.goto('/#/topics');
  await expect(page.locator('main').getByRole('heading', { level: 2 })).toHaveText([/^Structure & function/, /^Examination/, /^Intervention/, 'Also in the library']);
  await expect(page.getByRole('region', { name: 'Also in the library' }).getByRole('link')).toHaveText([/^Native motion previews/]);
  // A region reads as a chapter: sections, then topics, then a topic's own headings, each one level down.
  await page.goto('/#/region/knee');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Structure & function', 'Examination', 'Intervention']);
  await expect(main.getByRole('heading', { level: 3 })).toHaveText([/^Anatomy/, /^Special tests/, /^Manual therapy/]);
  await expect(main.getByRole('heading', { level: 4 })).toHaveText(['Example findings']);
  await page.getByRole('searchbox', { name: 'Filter Knee resources' }).fill('glide');
  await expect(main.getByRole('heading', { level: 2 })).toHaveText(['Intervention']);
  await expect(main.locator('li:visible a')).toHaveText(['Tibial posterior glide', 'Tibial anterior glide']);
  await page.goto('/#/region/whole-body');
  await expect(page.locator('main').getByRole('heading', { level: 2 })).toHaveText(['Examination', 'Also in the library']);
  // Search offers the topics under the same sections.
  await page.goto('/#/library');
  expect(await page.getByRole('combobox', { name: 'Filter by topic' }).locator('optgroup').evaluateAll(groups => groups.map(group => [group.label, [...group.children].map(option => option.textContent)])))
    .toEqual([['Structure & function', ['Anatomy']], ['Examination', ['Special tests', 'Gait & balance']], ['Intervention', ['Manual therapy']], ['Also in the library', ['Native motion previews']]]);
  await page.getByRole('combobox', { name: 'Filter by topic' }).selectOption('source-previews');
  await expect(page.locator('.ref-result')).toHaveCount(2);
});

test('earlier activity and collection links open their place in the reference', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: playerFixture(false) }));
  await page.goto('/#/activity/hip-anatomy');
  await pageBack(page, testInfo);
  await expect(page.getByRole('heading', { name: 'Hip anatomy at rest', level: 1 })).toBeVisible();
  await expect(page.locator('[data-player-asset]')).toHaveAttribute('data-player-asset', 'anatomy-hip');
  // The fixture's hip region holds one resource, so its page opens that resource directly.
  await page.goto('/#/collection/all-hip');
  await expect(page).toHaveURL(/#\/activity\/anatomy-hip$/);
  await page.goto('/#/collection/eyes-vestibular');
  await expect(page.getByRole('heading', { name: 'Topic unavailable' })).toBeVisible();
});

test('an earlier catalog without regions, topics or ids still renders by its labels', async ({ page }, testInfo) => {
  const legacy = activities.filter(activity => !activity.launch).map(({ regionId, topicId, aliasOf, context, ...rest }) => rest);
  await routeCatalog(page, { schemaVersion: 1, status: 'public-resources', source: 'simlab', activities: legacy });
  await page.goto('/#/regions');
  await expect(page.locator('.ref-card strong')).toHaveText(['Hip', 'Whole body']);
  await page.goto('/#/collection/all-hip');
  await expect(page).toHaveURL(/#\/activity\/hip-anatomy$/);
  await pageBack(page, testInfo);
  await expect(page.getByRole('heading', { name: 'Hip anatomy at rest', level: 1 })).toBeVisible();
});

test('selected resource IDs open in a clean browser without an account', async ({ page, browser }) => {
  await routeCatalog(page);
  await page.goto('/#/library');
  for (const id of ['anatomy-hip', 'gait']) await page.locator(`[data-add="${id}"]`).click();
  await page.locator('.topbar a[href="#/saved"]').click();
  await page.locator('[data-share-saved]').click();
  const url = await page.getByRole('textbox', { name: 'Resource share link' }).inputValue();
  expect(new URL(url).hash).toMatch(/^#\/saved\?set=[dj]1\./);
  // A list gets a QR code but no embed code: the player frames one resource.
  await expect(page.locator('[data-share-qr] svg[role="img"]')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Embed' })).toHaveCount(0);
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

test('resource activation uses only its canonical player and validates the sender', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Protocol-only source fixture</title><p>Protocol-only source fixture</p>',
  }));
  // Opening a resource page loads its player straight away, with no second click.
  await page.goto('/#/activity/exam-special-lachman');
  await expect(page.getByRole('button', { name: 'Open resource', exact: true })).toHaveCount(0);
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
  await pageBack(page, testInfo);
  await nav(page, '#/topics');
  await expect(page.locator('.native-frame')).toHaveCount(0);
});

test('the home hero renders before the catalog and region turntables load only on hover', async ({ page }, testInfo) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const videos = [];
  page.on('request', request => /\/assets\/library\/region-.*\.(webm|mp4)$/.test(request.url()) && videos.push(request.url()));
  await page.route(catalogUrl, async route => { await gate; await route.fulfill({ json: catalog }); });
  await page.goto('/');
  await expect(page.locator('.devpt-hero h1')).toHaveText('Reference library');
  await expect(page.locator('.hero-tile .tile-label')).toHaveText(['Anatomy', 'Movement', 'Vestibular', 'Imaging']);
  await expect(page.locator('.hero-tile').first()).toHaveAttribute('href', '#/topic/anatomy');
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

for (const reducedMotion of ['no-preference', 'reduce']) test(`hero tiles ${reducedMotion === 'reduce' ? 'stay still for reduced motion' : 'play their simLAB clips once the page has loaded'}`, async ({ page }) => {
  const clips = [];
  page.on('request', request => /\/assets\/library\/hero-.*\.(webm|mp4)$/.test(request.url()) && clips.push(request.url()));
  await page.emulateMedia({ reducedMotion });
  await routeCatalog(page);
  await page.goto('/', { waitUntil: 'load' });
  const first = page.locator('.hero-tile').first();
  await expect(first.locator('img')).toHaveAttribute('src', '/assets/library/hero-anatomy.webp');
  if (reducedMotion === 'reduce') {
    await page.waitForTimeout(500);
    expect(clips).toEqual([]);
    expect(await first.locator('video').getAttribute('src')).toBeNull();
  } else {
    await expect(first.locator('video')).toHaveAttribute('src', /\/assets\/library\/hero-anatomy\.(webm|mp4)$/);
    expect(clips.length).toBeGreaterThan(0);
  }
});

for (const reducedMotion of ['no-preference', 'reduce']) test(`region and topic headers ${reducedMotion === 'reduce' ? 'keep their posters still for reduced motion' : 'play their own clip and open the resource it shows'}`, async ({ page }) => {
  const clips = [];
  page.on('request', request => /\/assets\/library\/head-.*\.(webm|mp4)$/.test(request.url()) && clips.push(request.url()));
  await page.emulateMedia({ reducedMotion });
  await routeCatalog(page);
  await page.goto('/#/topic/special-tests', { waitUntil: 'load' });
  const tile = page.locator('.page-band .section-tile');
  await expect(tile.locator('img')).toHaveAttribute('src', '/assets/library/head-topic-special-tests.webp');
  await expect(tile).toHaveAttribute('href', '#/activity/exam-special-lachman');
  await expect(tile.locator('.tile-label')).toHaveText('Lachman');
  if (reducedMotion === 'reduce') {
    await page.waitForTimeout(500);
    expect(clips).toEqual([]);
  } else {
    await expect(tile.locator('video')).toHaveAttribute('src', /\/assets\/library\/head-topic-special-tests\.(webm|mp4)$/);
    // A header whose resource is not in the catalog still plays, without a link.
    await page.goto('/#/region/knee');
    await expect(page.locator('.page-band span.section-tile video')).toHaveAttribute('src', /\/assets\/library\/head-region-knee\.(webm|mp4)$/);
  }
});

test('report an issue names the resource and builds a report with its page details', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await routeCatalog(page);
  await page.goto('/#/activity/exam-special-lachman');
  await pageBack(page, testInfo);
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

const playerFixture = (answersSelect, selectDelay = 0) => `<!doctype html><title>Protocol-only player</title><script>
const parentOrigin = new URL(document.referrer).origin;
window.loads = (window.loads || 0) + 1;
const tell = activity => parent.postMessage({ type: 'devpt-teaching-ready', activity }, parentOrigin);
addEventListener('message', event => { if (${answersSelect} && event.data?.type === 'devpt-teaching-select') { window.switched = event.data.activity; setTimeout(() => tell(event.data.activity), ${selectDelay}); } });
tell(new URLSearchParams(location.search).get('activity'));
</script>`;

test('cold resource loading keeps a dark stage and a stable toolbar without recovery actions', async ({ page }, testInfo) => {
  await routeCatalog(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', async route => {
    await gate;
    await route.fulfill({ contentType: 'text/html', body: playerFixture(true) });
  });
  await page.goto('/#/activity/exam-special-lachman', { waitUntil: 'domcontentloaded' });
  const player = page.locator('.native-player'), stage = player.locator('.native-stage');
  let loadingBounds;
  try {
    await expect(player.locator('.native-loading')).toBeVisible();
    await expect(player.locator('.native-loading')).toHaveAttribute('role', 'status');
    await expect(player.locator('.native-recovery')).toBeHidden();
    await expect(stage).toHaveAttribute('aria-busy', 'true');
    await expect(stage).toHaveCSS('background-color', 'rgb(11, 19, 14)');
    await expect(player.locator('.native-frame')).toHaveCSS('background-color', 'rgb(11, 19, 14)');
    loadingBounds = await stage.boundingBox();
    if (testInfo.project.name === 'phone') {
      await expect(player).toHaveClass(/\bfullscreen\b/);
      const bounds = await player.boundingBox();
      expect(bounds.y).toBe(0); expect(bounds.height).toBe(page.viewportSize().height);
    }
    await page.screenshot({ path: testInfo.outputPath('cold-loading.png') });
  } finally { release(); }
  await expect(player).toHaveAttribute('data-ready', 'true');
  await expect(player.locator('.native-loading')).toBeHidden();
  await expect(player.locator('.native-recovery')).toBeHidden();
  await expect(stage).toHaveAttribute('aria-busy', 'false');
  const readyBounds = await stage.boundingBox();
  expect(readyBounds.y).toBe(loadingBounds.y); expect(readyBounds.height).toBe(loadingBounds.height);
});

test('resources in the same region and topic switch inside the loaded player', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: playerFixture(true) }));
  await page.goto('/#/activity/exam-special-lachman');
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await pageBack(page, testInfo);
  const switcher = page.locator('select[data-switch]');
  await expect(switcher.locator('option')).toHaveText(['Lachman test', 'McMurray test', 'Positive McMurray (medial)']);
  await expect(switcher).toHaveValue('exam-special-lachman');
  await page.locator('.native-frame').evaluate(frame => { frame.dataset.probe = 'kept'; });
  await switcher.selectOption('exam-special-mcmurray');
  await expect(page).toHaveURL(/#\/activity\/exam-special-mcmurray$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('McMurray test');
  await expect(switcher).toHaveValue('exam-special-mcmurray');
  // The menu stays focused, so a keyboard user can keep going.
  await expect(switcher).toBeFocused();
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-frame')).toHaveAttribute('data-probe', 'kept');
  const source = page.frames().find(frame => frame.url().startsWith('https://lab.devpt.app/teaching/'));
  expect(await source.evaluate(() => [window.loads, window.switched])).toEqual([1, 'exam-special-mcmurray']);
  await switcher.selectOption('demo-mcmurray-medial');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Positive McMurray (medial)');
  await expect(page.locator('.native-frame')).toHaveAttribute('data-probe', 'kept');
});

test('a legitimate source switch taking more than four seconds keeps its existing iframe', async ({ page }, testInfo) => {
  await page.clock.install();
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: playerFixture(true, 8000) }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player');
  await expect(player).toHaveAttribute('data-ready', 'true');
  await pageBack(page, testInfo);
  const frame = await page.locator('.native-frame').elementHandle();
  await page.locator('select[data-switch]').selectOption('exam-special-mcmurray');
  await expect(player).toHaveAttribute('data-loading', 'loading');
  await page.clock.fastForward(5000);
  expect(await frame.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
  await expect(player.locator('.native-recovery')).toBeHidden();
  await expect(player.locator('.native-loading')).toBeVisible();
  await page.clock.fastForward(4000);
  await expect(player).toHaveAttribute('data-ready', 'true');
  await expect(player.locator('.native-loading')).toBeHidden();
  expect(await frame.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
});

test('an unresponsive source keeps its iframe and offers explicit recovery after timeout', async ({ page }, testInfo) => {
  await page.clock.install();
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: playerFixture(false) }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player');
  await expect(player).toHaveAttribute('data-ready', 'true');
  await pageBack(page, testInfo);
  const frame = await page.locator('.native-frame').elementHandle();
  await page.locator('select[data-switch]').selectOption('exam-special-mcmurray');
  await expect(player).toHaveAttribute('data-loading', 'loading');
  await page.clock.fastForward(26000);
  await expect(player).toHaveAttribute('data-loading', 'failed');
  await expect(player.locator('.native-loading')).toBeHidden();
  await expect(player.locator('.native-recovery')).toBeVisible();
  await expect(player.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(player.getByRole('link', { name: 'Open full view', exact: true })).toHaveAttribute('href', 'https://lab.devpt.app/teaching/?activity=exam-special-mcmurray&embedded=1');
  expect(await frame.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
  await player.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.native-frame')).toHaveAttribute('src', 'https://lab.devpt.app/teaching/?activity=exam-special-mcmurray&embedded=1', { timeout: 8000 });
  await expect(player).toHaveAttribute('data-ready', 'true');
  await expect(player.locator('.native-recovery')).toBeHidden();
  expect(await frame.evaluate(element => element.isConnected)).toBe(false);
});

const gameFixture = `<!doctype html><title>Game player</title><button id="play">Play</button><button id="quit">Quit</button><script>
const parentOrigin = new URL(document.referrer).origin;
window.heard = [];
addEventListener('message', event => { if (event.data?.type === 'devpt-teaching-fullscreen') window.heard.push(event.data.on); });
parent.postMessage({ type: 'devpt-teaching-ready', activity: new URLSearchParams(location.search).get('activity') }, parentOrigin);
const screen = on => parent.postMessage({ type: 'devpt-teaching-fullscreen', on }, parentOrigin);
document.querySelector('#play').onclick = () => screen(true);
document.querySelector('#quit').onclick = () => screen(false);
</script>`;

test('the resource menu sits in the page header and no strip of resources follows it', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.goto('/#/activity/exam-special-lachman');
  await pageBack(page, testInfo);
  const menu = page.getByRole('combobox', { name: 'Switch Knee › Special tests resource' });
  await expect(menu).toBeVisible();
  expect(await menu.evaluate(element => !!element.closest('.page-band'))).toBe(true);
  await expect(page.locator('.switcher, .switcher-list')).toHaveCount(0);
  // A resource with no siblings has no menu.
  await page.goto('/#/activity/gait');
  await pageBack(page, testInfo);
  await expect(page.getByRole('heading', { name: 'Native walk', level: 1 })).toBeVisible();
  await expect(page.locator('select[data-switch]')).toHaveCount(0);
});

test('share gives the link with a QR code, and an embed code for Canvas or Blackboard for one resource', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.goto('/#/activity/exam-special-lachman');
  await pageBack(page, testInfo);
  await page.getByRole('button', { name: 'Share Lachman test', exact: true }).click();
  const dialog = page.locator('#modal');
  const link = dialog.getByRole('textbox', { name: 'Resource share link', exact: true });
  await expect(link).toHaveValue(/#\/activity\/exam-special-lachman$/);
  await expect(dialog.locator('[data-share-qr] svg[role="img"]')).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: 'Embed code', exact: true })).toBeHidden();
  await dialog.getByRole('radio', { name: 'Embed' }).check();
  const embed = dialog.getByRole('textbox', { name: 'Embed code', exact: true });
  await expect(embed).toBeVisible();
  await expect(link).toBeHidden();
  const code = await embed.inputValue();
  expect(code).toContain('<iframe src="https://lab.devpt.app/teaching/?activity=exam-special-lachman&amp;embedded=1"');
  expect(code).toContain('title="Lachman test · DevPT"');
  expect(code).toContain('allow="fullscreen"');
  await dialog.getByRole('button', { name: 'Copy embed code', exact: true }).click();
  await expect(page.locator('#announcer')).toHaveText('Copied');
  await dialog.getByRole('radio', { name: 'Link' }).check();
  await expect(link).toBeVisible();
});

test('a game played in the player takes the whole screen, and Back gives the page back', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player');
  await expect(player).toHaveAttribute('data-ready', 'true');
  await pageBack(page, testInfo);
  const game = page.frameLocator('.native-frame');

  // The game asks for the screen when play starts: the player covers the window.
  await game.locator('#play').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  const view = page.viewportSize();
  await expect.poll(async () => { const box = await player.boundingBox(); return [Math.round(box.width), Math.round(box.height)]; }).toEqual([view.width, view.height]);
  // Quit gives the page back.
  await game.locator('#quit').click();
  await expect(player).not.toHaveClass(/\bfullscreen\b/);

  // Back leaves full screen, not the page, and the game hears that it is back in the page.
  await game.locator('#play').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  await page.goBack();
  await expect(player).not.toHaveClass(/\bfullscreen\b/);
  await expect(page).toHaveURL(/#\/activity\/exam-special-lachman$/);
  const source = page.frames().find(frame => frame.url().startsWith('https://lab.devpt.app/teaching/'));
  // A phone's player also heard that it opened full screen, and that Back first gave the page back.
  await expect.poll(() => source.evaluate(() => window.heard)).toEqual(testInfo.project.name === 'phone' ? [true, false, false] : [false]);
});

test('on a phone a resource opens full screen; Back restores the compact page and the resource can ask for the screen again', async ({ page }, testInfo) => {
  await routeCatalog(page);
  await page.addInitScript(() => {
    window.browserFullscreenRequests = 0;
    const request = Element.prototype.requestFullscreen;
    Element.prototype.requestFullscreen = function (...args) { window.browserFullscreenRequests++; return request.apply(this, args); };
  });
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player');
  await expect(player).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.activity-heading .native-direct')).toHaveCount(0);
  const heard = () => page.frames().find(frame => frame.url().startsWith('https://lab.devpt.app/teaching/')).evaluate(() => window.heard);
  if (testInfo.project.name !== 'phone') {
    // A wide screen keeps the resource in the page until it asks for the screen.
    await expect(player).not.toHaveClass(/\bfullscreen\b/);
    expect(await heard()).toEqual([]);
    return;
  }
  await expect(player).toHaveClass(/\bfullscreen\b/);
  const view = page.viewportSize();
  await expect.poll(async () => { const box = await player.boundingBox(); return [Math.round(box.width), Math.round(box.height)]; }).toEqual([view.width, view.height]);
  await expect.poll(heard).toEqual([true]);
  // The page's own full view: a touch screen's browser full screen closes on a downward swipe, which is also a drag
  // that turns a model.
  expect(await page.evaluate(() => [window.browserFullscreenRequests, document.fullscreenElement])).toEqual([0, null]);
  // Back gives the page back with its title and resource actions.
  await page.goBack();
  await expect(player).not.toHaveClass(/\bfullscreen\b/);
  await expect(page).toHaveURL(/#\/activity\/exam-special-lachman$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lachman test');
  // The canonical resource's own fullscreen action still works with the host
  // control and the same frame; neither opens a second tab.
  await page.frameLocator('.native-frame').locator('#play').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  await expect.poll(async () => { const box = await player.boundingBox(); return [Math.round(box.width), Math.round(box.height)]; }).toEqual([view.width, view.height]);
  expect(page.context().pages()).toHaveLength(1);
  // The source already knows the state it requested: the host applies it
  // without echoing the fullscreen request back into the native player.
  await expect.poll(heard).toEqual([true, false]);
});

test('a case brief stays in the page, even on a phone', async ({ page }) => {
  const brief = item('case-hip-practice', 'Hip case practice', 'hip', 'anatomy', { launch: { kind: 'case', missionId: 'hip-ddx' } });
  await routeCatalog(page, { ...catalog, activities: [...activities, brief] });
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
  await page.goto('/#/activity/case-hip-practice');
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-player')).not.toHaveClass(/\bfullscreen\b/);
});

test('a playing resource retains its frame and fullscreen through catalog refresh and browser fullscreen loss', async ({ page }) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player');
  await expect(player).toHaveAttribute('data-ready', 'true');
  const game = page.frameLocator('.native-frame');
  await game.locator('#play').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  await game.locator('#play').evaluate(element => { element.dataset.gameProgress = 'kept'; });
  const frame = await page.locator('.native-frame').elementHandle();
  // A late catalog response must not destroy a game already in progress.
  await page.evaluate(() => document.dispatchEvent(new Event('devpt:catalog-ready')));
  await expect(player).toHaveClass(/\bfullscreen\b/);
  expect(await frame.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
  await expect(game.locator('#play')).toHaveAttribute('data-game-progress', 'kept');
  // OS/browser fullscreen is optional; its loss must not collapse the app's player.
  await page.evaluate(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else document.dispatchEvent(new Event('fullscreenchange'));
  });
  await expect(player).toHaveClass(/\bfullscreen\b/);
  await expect(game.locator('#play')).toHaveAttribute('data-game-progress', 'kept');
  await game.locator('#quit').click();
  await expect(player).not.toHaveClass(/\bfullscreen\b/);
});

for (const resource of ['exam-special-lachman', 'anatomy-hip', 'gait']) {
  test(`Library expansion preserves the ${resource} iframe, progress and return focus`, async ({ page }, testInfo) => {
    await routeCatalog(page);
    // The same host control must work when OS fullscreen is unavailable, as on iPad Safari.
    await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen unavailable in fixture')); });
    await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
    await page.goto('/#/activity/' + resource);
    const player = page.locator('.native-player'), toggle = player.locator('[data-player-screen]');
    await expect(player).toHaveAttribute('data-ready', 'true');
    await pageBack(page, testInfo);
    await expect(toggle).toHaveAccessibleName('Expand resource');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const frame = await page.locator('.native-frame').elementHandle();
    await page.frameLocator('.native-frame').locator('#play').evaluate(element => { element.dataset.progress = 'retained'; });
    await page.locator('.footer').evaluate(element => { element.inert = true; }); // Preserve another owner's prior state.
    await toggle.focus(); await page.keyboard.press('Enter');
    await expect(toggle).toHaveAccessibleName('Back to page');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(player).toHaveClass(/\bfullscreen\b/);
    await expect(player).toHaveAttribute('role', 'dialog');
    await expect(player).toHaveAttribute('aria-modal', 'true');
    expect(await page.locator('.topbar').evaluate(element => element.inert)).toBe(true);
    const viewport = page.viewportSize();
    await expect.poll(async () => { const box = await player.boundingBox(); return [Math.round(box.width), Math.round(box.height)]; }).toEqual([viewport.width, viewport.height]);
    const tools = await player.locator('.native-view-tools').boundingBox(), stage = await player.locator('.native-stage').boundingBox();
    expect(stage.y).toBeGreaterThanOrEqual(tools.y + tools.height - 1); // Return control never covers source controls.
    expect(stage.height).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(player).not.toHaveClass(/\bfullscreen\b/);
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(player).toHaveAttribute('role', 'region');
    await expect(player).not.toHaveAttribute('aria-modal');
    expect(await page.locator('.topbar').evaluate(element => element.inert)).toBe(false);
    expect(await page.locator('.footer').evaluate(element => element.inert)).toBe(true);
    await toggle.click(); await expect(player).toHaveClass(/\bfullscreen\b/);
    await toggle.click(); await expect(player).not.toHaveClass(/\bfullscreen\b/);
    expect(await frame.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
    await expect(page.frameLocator('.native-frame').locator('#play')).toHaveAttribute('data-progress', 'retained');
    expect(page.context().pages()).toHaveLength(1);
  });
}

test('leaving an expanded resource restores host accessibility without retaining stale focus', async ({ page }) => {
  await routeCatalog(page);
  await page.addInitScript(() => { Element.prototype.requestFullscreen = () => Promise.reject(new Error('Fullscreen unavailable in fixture')); });
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: gameFixture }));
  await page.goto('/#/activity/exam-special-lachman');
  const player = page.locator('.native-player'); await expect(player).toHaveAttribute('data-ready', 'true');
  if (!(await player.getAttribute('class')).includes('fullscreen')) await player.locator('[data-player-screen]').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  expect(await page.locator('#modal').evaluate(element => element.inert)).toBe(true);
  await page.evaluate(() => { location.hash = '#/topics'; });
  await expect(page.locator('.native-frame')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'By topic', exact: true })).toBeVisible();
  expect(await page.locator('#modal').evaluate(element => element.inert)).toBe(false);
  await expect(page.locator('#main')).toBeFocused();
});


const postureProtocolFixture = `<!doctype html><title>Posture protocol fixture</title>
<output id="position">Standing</output><output id="model">Patient</output>
<button id="sitting">Sitting</button><button id="basic">Basic male</button><button id="exit">Exit</button>
<script>
const parentOrigin = new URL(document.referrer).origin;
window.receivedSelections = [];
let activity = new URLSearchParams(location.search).get('activity');
const ready = () => parent.postMessage({type:'devpt-teaching-ready',activity}, parentOrigin);
const select = next => { activity=next; document.querySelector('#position').textContent=next.endsWith('sitting')?'Sitting':'Standing'; };
addEventListener('message',event=>{
 if(event.origin!==parentOrigin||event.source!==parent)return;
 if(event.data?.type==='devpt-teaching-select'){window.receivedSelections.push(event.data.activity);select(event.data.activity);ready();}
});
document.querySelector('#sitting').onclick=()=>{select('posture-assessment-sitting');parent.postMessage({type:'devpt-teaching-selected',activity},parentOrigin);ready();};
document.querySelector('#basic').onclick=()=>{document.querySelector('#model').textContent='Basic male';};
document.querySelector('#exit').onclick=()=>parent.postMessage({type:'devpt-teaching-fullscreen',on:false},parentOrigin);
ready();
</script>`;

for (const exit of ['host Back', 'browser Back', 'native Exit']) {
 test(`${exit} keeps the latest source-selected posture intent when collapsing`, async ({page},testInfo)=>{
  const standing=item('posture-assessment-standing','Standing posture','whole-body','gait-balance',{launch:{kind:'posture',example:'standing-reference'}});
  const sitting=item('posture-assessment-sitting','Sitting posture','whole-body','gait-balance',{launch:{kind:'posture',example:'sitting-reference'}});
  await routeCatalog(page,{...catalog,activities:[...activities,standing,sitting]});
  await page.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('OS fullscreen unavailable'));});
  await page.route(url=>url.origin==='https://lab.devpt.app'&&url.pathname==='/teaching/',route=>route.fulfill({contentType:'text/html',body:postureProtocolFixture}));
  await page.goto('/#/library');
  await page.locator('.ref-result a[href="#/activity/posture-assessment-standing"]').click();
  const player=page.locator('.native-player'),frame=page.locator('.native-frame');
  await expect(player).toHaveAttribute('data-ready','true');
  if(testInfo.project.name!=='phone')await player.locator('[data-player-screen]').click();
  await expect(player).toHaveClass(/\bfullscreen\b/);
  const retained=await frame.elementHandle(),originalSrc=await frame.getAttribute('src');
  const source=page.frameLocator('.native-frame');
  await source.locator('#sitting').click();await source.locator('#basic').click();
  await expect(page).toHaveURL(/#\/activity\/posture-assessment-sitting$/);
  await expect(player).toHaveAttribute('data-player-asset','posture-assessment-sitting');
  await expect(source.locator('#position')).toHaveText('Sitting');
  await expect(source.locator('#model')).toHaveText('Basic male');
  if(exit==='host Back')await player.locator('[data-player-screen]').click();
  else if(exit==='browser Back')await page.goBack();
  else await source.locator('#exit').click();
  await expect(player).not.toHaveClass(/\bfullscreen\b/);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page).toHaveURL(/#\/activity\/posture-assessment-sitting$/);
  await expect(source.locator('#position')).toHaveText('Sitting');
  await expect(source.locator('#model')).toHaveText('Basic male');
  expect(await retained.evaluate(element=>element.isConnected&&element===document.querySelector('.native-frame'))).toBe(true);
  await expect(frame).toHaveAttribute('src',originalSrc);
  const sourceFrame=page.frames().find(value=>value.url().startsWith('https://lab.devpt.app/teaching/'));
  expect(await sourceFrame.evaluate(()=>window.receivedSelections)).toEqual([]);
  await page.goForward();await expect(player).toHaveClass(/\bfullscreen\b/);
  await page.goBack();await expect(player).not.toHaveClass(/\bfullscreen\b/);
  await expect(page).toHaveURL(/#\/activity\/posture-assessment-sitting$/);
  await expect(source.locator('#position')).toHaveText('Sitting');
  await expect(source.locator('#model')).toHaveText('Basic male');
  expect(await sourceFrame.evaluate(()=>window.receivedSelections)).toEqual([]);
  await page.goBack();
  await expect(page).toHaveURL(/#\/library$/);
  await expect(frame).toHaveCount(1);
  await expect(frame).not.toBeVisible();
  await expect(page.getByRole('heading',{name:'Search the library',exact:true})).toBeVisible();
 });
}

test('browsing away pauses one clinical session and returning or changing clinical topics reuses its exact frame', async ({page}) => {
  const standing=item('posture-assessment-standing','Standing posture','whole-body','gait-balance',{launch:{kind:'posture',example:'standing-reference'}});
  const evidence=item('evidence-correlation','Correlation','whole-body','special-tests',{launch:{kind:'evidence',mode:'correlation'}});
  await routeCatalog(page,{...catalog,activities:[...activities,standing,evidence]});
  let loads=0;
  await page.route('https://lab.devpt.app/teaching/?**',route=>{loads++;return route.fulfill({contentType:'text/html',body:postureProtocolFixture});});
  await page.goto('/#/activity/posture-assessment-standing');
  const player=page.locator('.native-player'),frame=page.locator('.native-frame');
  await expect(player).toHaveAttribute('data-ready','true');
  const retained=await frame.elementHandle(),source=page.frames().find(frame=>frame.url().startsWith('https://lab.devpt.app/teaching/'));
  await source.evaluate(()=>{window.visibility=[];addEventListener('message',event=>{if(event.data?.type==='devpt-teaching-visibility')window.visibility.push(event.data.visible);});document.querySelector('#model').textContent='Chosen patient';});
  await page.evaluate(()=>{location.hash='#/library';});
  await expect(page.getByRole('heading',{name:'Search the library',exact:true})).toBeVisible();
  await expect(frame).not.toBeVisible();
  await expect.poll(()=>source.evaluate(()=>window.visibility.at(-1))).toBe(false);
  expect(await retained.evaluate(node=>node.isConnected&&node.closest('main').inert)).toBe(true);
  // A parked source cannot steal navigation/fullscreen, including after a host dialog closes.
  await source.evaluate(()=>{parent.postMessage({type:'devpt-teaching-selected',activity:'posture-assessment-sitting'},new URL(document.referrer).origin);parent.postMessage({type:'devpt-teaching-fullscreen',on:true},new URL(document.referrer).origin);});
  await expect(page).toHaveURL(/#\/library$/);
  await expect(page.locator('html')).not.toHaveClass(/player-fullscreen/);
  await page.locator('.ref-result a[href="#/activity/posture-assessment-standing"]').click();
  await expect(player).toHaveAttribute('data-ready','true');
  await expect.poll(()=>source.evaluate(()=>window.visibility.at(-1))).toBe(true);
  expect(await source.locator('#model').innerText()).toBe('Chosen patient');
  expect(await source.evaluate(()=>window.receivedSelections)).toEqual([]);
  await page.evaluate(()=>{location.hash='#/library';});
  await expect(frame).not.toBeVisible();
  await page.locator('.ref-result a[href="#/activity/evidence-correlation"]').click();
  await expect(player).toHaveAttribute('data-player-asset','evidence-correlation');
  await expect(player).toHaveAttribute('data-ready','true');
  expect(await source.evaluate(()=>window.receivedSelections)).toEqual(['evidence-correlation']);
  expect(await retained.evaluate(node=>node.isConnected&&node===document.querySelector('.native-frame'))).toBe(true);
  expect(loads).toBe(1);
  // A different native environment retires the retained patient workbench.
  await page.evaluate(()=>{location.hash='#/activity/exam-special-lachman';});
  await expect(player).toHaveAttribute('data-player-asset','exam-special-lachman');
  expect(await retained.evaluate(node=>node.isConnected)).toBe(false);
  await expect(frame).toHaveCount(1);
  expect(loads).toBe(2);
});


test('leaving during initial preparation queues the next clinical resource without replacing the source frame', async ({page}) => {
  const standing=item('posture-assessment-standing','Standing posture','whole-body','gait-balance',{launch:{kind:'posture',example:'standing-reference'}});
  const evidence=item('evidence-correlation','Correlation','whole-body','special-tests',{launch:{kind:'evidence',mode:'correlation'}});
  await routeCatalog(page,{...catalog,activities:[...activities,standing,evidence]});
  let loads=0;
  await page.route('https://lab.devpt.app/teaching/?**',route=>{loads++;return route.fulfill({contentType:'text/html',body:postureProtocolFixture.replace('\nready();\n</script>','\nsetTimeout(ready,1200);\n</script>')});});
  await page.goto('/#/activity/posture-assessment-standing');
  const frame=page.locator('.native-frame');await expect(frame).toBeAttached();
  const retained=await frame.elementHandle();
  await page.evaluate(()=>{location.hash='#/library';});
  await expect(page.getByRole('heading',{name:'Search the library',exact:true})).toBeVisible();
  await page.locator('.ref-result a[href="#/activity/evidence-correlation"]').click();
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');
  expect(await retained.evaluate(node=>node.isConnected&&node===document.querySelector('.native-frame'))).toBe(true);
  expect(loads).toBe(1);
});

test('native study chrome takes over only for the current trusted frame and preserves fullscreen state', async ({ page }) => {
  await routeCatalog(page);
  // Protocol fixture only; the source repository tests the real 3D players.
  await page.route('https://lab.devpt.app/teaching/?**', route => route.fulfill({contentType:'text/html',body:`<!doctype html><title>Study header protocol</title>
    <button id="expand">Expand</button><button id="exit">Exit full view</button><script>
    const origin=new URL(document.referrer).origin, activity=new URLSearchParams(location.search).get('activity');
    window.chrome=(message={})=>parent.postMessage({type:'devpt-teaching-chrome',activity,version:1,...message},origin);
    document.querySelector('#expand').onclick=()=>parent.postMessage({type:'devpt-teaching-fullscreen',on:true},origin);
    document.querySelector('#exit').onclick=()=>parent.postMessage({type:'devpt-teaching-fullscreen',on:false},origin);
    parent.postMessage({type:'devpt-teaching-ready',activity},origin);
    </script>`}));
  await page.goto('/#/activity/exam-special-lachman');
  const player=page.locator('.native-player'), frame=page.locator('.native-frame');
  await expect(player).toHaveAttribute('data-ready','true');
  await frame.evaluate(e=>e.dataset.retainedStudy='yes');
  const source=page.frames().find(frame=>frame.url().startsWith('https://lab.devpt.app/teaching/'));
  const tools=player.locator('.native-view-tools'); await expect(tools).toBeVisible();
  await source.evaluate(()=>window.chrome({activity:'exam-special-mcmurray'})); await expect(tools).toBeVisible();
  await source.evaluate(()=>window.chrome({version:true})); await expect(tools).toBeVisible();
  await source.evaluate(()=>window.chrome({extra:'not allowed'})); await expect(tools).toBeVisible();
  await page.evaluate(()=>window.postMessage({type:'devpt-teaching-chrome',activity:'exam-special-lachman',version:1},location.origin)); await expect(tools).toBeVisible();
  await source.evaluate(()=>window.chrome()); await expect(player).toHaveAttribute('data-native-chrome','study-v1'); await expect(tools).toBeHidden();
  await source.locator('#expand').click(); await expect(player).toHaveClass(/fullscreen/);
  await expect(page.locator('.native-frame[data-retained-study="yes"]')).toHaveCount(1);
  await source.locator('#exit').click(); await expect(player).not.toHaveClass(/fullscreen/);
  await expect(page.locator('.native-frame[data-retained-study="yes"]')).toHaveCount(1);
  await source.evaluate(()=>window.chrome({version:0})); await expect(tools).toBeVisible(); await expect(player).toHaveAttribute('data-ready','true');
});
