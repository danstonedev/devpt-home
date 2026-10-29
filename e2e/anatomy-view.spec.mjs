import { expect, test } from '@playwright/test';

// Protocol fixtures only: the source repository verifies actual scenes, layers and motion.
const sourceOrigin = 'https://lab.devpt.app';
const workspace = 'lower-extremity-explorer';
const regions = [{ id: 'hip', label: 'Hip' }, { id: 'knee', label: 'Knee' }, { id: 'ankle-foot', label: 'Ankle & foot' }, { id: 'shoulder', label: 'Shoulder' }];
const topics = [{ id: 'anatomy', label: 'Anatomy' }, { id: 'muscle-function', label: 'Muscle function' }, { id: 'manual-therapy', label: 'Manual therapy' }];
const item = (id, title, launch, regionId = 'hip', topicId = 'anatomy') => ({
  id, nativeId: id, title, launch, regionId, region: regions.find(region => region.id === regionId).label,
  topicId, topic: topics.find(topic => topic.id === topicId).label, minutes: 0, level: 'Reference', media: 'anatomy',
  type: 'Anatomy teaching model', context: 'Protocol fixture', symbol: 'layers', desc: 'Protocol-only fixture', outcome: 'Protocol-only fixture', source: 'Source-owned fixture',
});
const catalog = { schemaVersion: 1, status: 'public-resources', source: 'simlab', regions, topics, activities: [
  item('anatomy-explorer', 'Anatomy explorer · BETA', { kind: 'joint', initial: 'shoulder:flexion', rest: true, mode: 'full-range', workspace: 'whole-body', workspaceRegions: ['hip', 'ankle', 'shoulder', 'elbow', 'wrist', 'cervical'] }, 'shoulder'),
  item(workspace, 'Lower extremity anatomy explorer · BETA', { kind: 'joint', initial: 'hip:flexion', rest: true, mode: 'full-range', workspace: 'lower-extremity' }),
  item('anatomy-hip', 'Hip anatomy at rest', { kind: 'joint', initial: 'hip:flexion', rest: true }),
  item('anatomy-knee', 'Knee anatomy at rest', { kind: 'joint', initial: 'knee:flexion', rest: true }, 'knee'),
  item('learning-hip-gluteal-layers', 'Explore the gluteal layers', { kind: 'joint', initial: 'hip:flexion', learningTask: 'hip-gluteal-layers', mode: 'full-range', rest: true }),
  item('learning-knee-quadriceps-group', 'Identify the quadriceps', { kind: 'joint', initial: 'knee:flexion', learningTask: 'knee-quadriceps-group', mode: 'full-range', rest: true }, 'knee'),
  item('anatomy-foot', 'Foot anatomy at rest', { kind: 'joint', initial: 'foot:subtalar-inversion', rest: true }, 'ankle-foot'),
  item('learning-ankle-mortise', 'Build the ankle mortise', { kind: 'joint', initial: 'ankle:dorsiflexion', learningTask: 'ankle-mortise' }, 'ankle-foot'),
  item('combined-ankle-dorsiflexion', 'Combined ankle dorsiflexion', { kind: 'joint', initial: 'ankle:dorsiflexion', mode: 'original-anatomy', ensemble: 'ankle-dorsiflexion' }, 'ankle-foot', 'muscle-function'),
  item('joint-ankle-posterior-glide', 'Posterior talar glide', { kind: 'joint', initial: 'ankle:posterior-glide' }, 'ankle-foot', 'manual-therapy'),
  item('archived-ankle-muscle', 'Archived ankle source study', { kind: 'joint', initial: 'ankle:dorsiflexion', muscle: 'tibialis-anterior', muscleSource: true }, 'ankle-foot', 'muscle-function'),
  { ...item('archived-source-alias', 'Earlier source bookmark', { kind: 'joint', initial: 'ankle:dorsiflexion' }, 'ankle-foot'), aliasOf: 'archived-ankle-muscle' },
  item('ankle-source-preview', 'Ankle source preview', { kind: 'joint', initial: 'ankle:dorsiflexion', mode: 'source-preview' }, 'ankle-foot', 'anatomy'),
  item('joint-shoulder-flexion', 'Shoulder flexion', { kind: 'joint', initial: 'shoulder:flexion' }, 'shoulder', 'anatomy'),
] };
const fixture = `<!doctype html><title>Protocol-only anatomy source</title><p>Protocol-only source, no model rendering.</p><script>
const parentOrigin = new URL(document.referrer).origin;
window.receivedSelections = [];
window.receivedMessages = [];
addEventListener('message', event => {
 if (event.origin === parentOrigin && event.source === parent) window.receivedMessages.push(event.data);
 if (event.origin === parentOrigin && event.source === parent && event.data?.type === 'devpt-teaching-select') {
  window.receivedSelections.push(event.data);
  parent.postMessage({type:'devpt-teaching-ready',activity:event.data.activity},parentOrigin);
 }
});
parent.postMessage({type:'devpt-teaching-ready',activity:new URLSearchParams(location.search).get('activity')},parentOrigin);
</script>`;

async function setup(page) {
  await page.route(sourceOrigin + '/teaching/catalog.json', route => route.fulfill({ json: catalog }));
  await page.route(url => url.origin === sourceOrigin && url.pathname === '/teaching/', route => route.fulfill({ contentType: 'text/html', body: fixture }));
  await page.addInitScript(() => {
    window.anatomyViewReceipts = 0;
    window.anatomyViewPops = 0;
    addEventListener('message', event => { if (event.data?.type === 'devpt-teaching-view') window.anatomyViewReceipts++; });
    addEventListener('popstate', () => window.anatomyViewPops++);
  });
}
async function open(page, testInfo, query = '', id = workspace) {
  const firstDocument = page.url() === 'about:blank';
  await page.goto('/#/activity/' + id + query);
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  if (testInfo.project.name === 'phone') {
    if (firstDocument) await expect(page.locator('.native-player')).toHaveClass(/\bfullscreen\b/);
    if (await page.locator('.native-player').evaluate(element => element.classList.contains('fullscreen'))) await page.goBack();
    await expect(page.locator('.native-player')).not.toHaveClass(/\bfullscreen\b/);
  }
  const frame = page.frames().find(frame => frame.url().startsWith(sourceOrigin + '/teaching/'));
  expect(frame).toBeTruthy();
  return frame;
}
async function tell(page, frame, data) {
  const before = await page.evaluate(() => window.anatomyViewReceipts);
  await frame.evaluate(({ data, origin }) => parent.postMessage(data, origin), { data, origin: new URL(page.url()).origin });
  await expect.poll(() => page.evaluate(() => window.anatomyViewReceipts)).toBe(before + 1);
}
const message = view => ({ type: 'devpt-teaching-view', activity: workspace, view });
const validView = { resource: 'joint-ankle-posterior-glide', side: 'L', cohort: 'female' };

test('individual anatomy bookmarks open their exact selection in the common workspace', async ({ page }, testInfo) => {
  await setup(page);
  await open(page, testInfo, '?side=L&cohort=female', 'joint-shoulder-flexion');
  await expect(page).toHaveURL(/#\/activity\/anatomy-explorer\?view=joint-shoulder-flexion&side=L&cohort=female$/);
  await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=anatomy-explorer&embedded=1&view=joint-shoulder-flexion&side=L&cohort=female');
  await expect(page.locator('.anatomy-workspace-band')).toHaveCount(1);
  await expect(page.locator('.page-band [data-add="joint-shoulder-flexion"]')).toHaveCount(1);
});

test('search and saved anatomy entries return to the common player with the resource identity intact', async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/#/library?q=Shoulder%20flexion');
  await page.locator('.ref-result a').filter({ hasText: 'Shoulder flexion' }).click();
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  if (testInfo.project.name === 'phone' && await page.locator('.native-player').evaluate(el => el.classList.contains('fullscreen'))) await page.goBack();
  await expect(page).toHaveURL(/#\/activity\/anatomy-explorer\?view=joint-shoulder-flexion/);
  await page.locator('.page-band [data-add="joint-shoulder-flexion"]').click();
  await page.goto('/#/saved');
  await page.locator('.ref-result a').filter({ hasText: 'Shoulder flexion' }).click();
  await expect(page).toHaveURL(/#\/activity\/anatomy-explorer\?view=joint-shoulder-flexion/);
});

test('a legacy anatomy link changes the exact view in place without replacing the workspace iframe', async ({ page }, testInfo) => {
  await setup(page);
  const source = await open(page, testInfo, '?view=joint-shoulder-flexion', 'anatomy-explorer');
  await page.locator('.native-frame').evaluate(el => { el.dataset.routeRetention = 'keep'; });
  await page.evaluate(() => { location.hash = '#/activity/anatomy-hip?side=L&cohort=female'; });
  await expect(page).toHaveURL(/#\/activity\/anatomy-explorer\?view=anatomy-hip&side=L&cohort=female$/);
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-frame')).toHaveAttribute('data-route-retention', 'keep');
  await expect.poll(() => source.evaluate(() => window.receivedSelections.at(-1)?.view)).toEqual({ resource: 'anatomy-hip', side: 'L', cohort: 'female' });
});

for (const type of ['devpt-teaching-view', 'devpt-teaching-selected']) test(`a queued ${type} cannot undo leaving the player`, async ({ page }, testInfo) => {
  await setup(page);
  await open(page, testInfo, '?view=joint-shoulder-flexion', 'anatomy-explorer');
  await page.evaluate(({ origin, type }) => {
    const source = document.querySelector('.native-frame').contentWindow;
    location.hash = '#/saved';
    // Reproduce a legitimate already-queued frame message arriving before the
    // hashchange handler tears down the old iframe. Keep exact origin/source.
    window.dispatchEvent(new MessageEvent('message', { origin, source, data: type === 'devpt-teaching-view'
      ? { type, activity: 'anatomy-explorer', view: { resource: 'anatomy-hip', side: 'R', cohort: 'male' } }
      : { type, activity: 'anatomy-hip' } }));
  }, { origin: sourceOrigin, type });
  await expect(page).toHaveURL(/#\/saved$/);
  await expect(page.getByRole('heading', { name: 'Saved resources', exact: true })).toBeVisible();
  await expect(page.locator('.native-frame')).toHaveCount(0);
});

test('independent historical source studies keep their own qualified launch', async ({ page }, testInfo) => {
  await setup(page);
  for (const id of ['archived-ankle-muscle', 'ankle-source-preview']) {
    await open(page, testInfo, '', id);
    await expect(page).toHaveURL(new RegExp('#/activity/' + id + '$'));
    await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + id + '&embedded=1');
  }
});

test('a retained alias owns its canonical native player and receives readiness', async ({ page }) => {
  await setup(page);
  await page.goto('/#/activity/archived-source-alias');
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=archived-ankle-muscle&embedded=1');
  await expect(page).toHaveURL(/#\/activity\/archived-source-alias$/);
});

test('the whole-body workspace uses the source scope for upper-limb views and retains the trusted player while sharing', async ({ page }, testInfo) => {
  await setup(page);
  const id = 'anatomy-explorer';
  const source = await open(page, testInfo, '?view=joint-shoulder-flexion&side=L&cohort=female&practice=match', id);
  const frame = page.locator('.native-frame');
  await expect(frame).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + id + '&embedded=1&view=joint-shoulder-flexion&side=L&cohort=female&practice=match');
  await expect(page.getByRole('navigation', { name: 'Breadcrumb', exact: true })).toContainText('Anatomy workspace');
  await expect(page.locator('.anatomy-workspace-band .breadcrumb select[data-switch]')).toHaveCount(1);
  await expect(page.locator('.anatomy-workspace-band .actions select[data-switch]')).toHaveCount(0);
  await expect(page.locator('.anatomy-workspace-band h1')).toHaveClass('sr-only');
  await expect(page.locator('.anatomy-workspace-band [data-current-view]')).toHaveClass('sr-only');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await frame.evaluate(element => { element.dataset.retentionProbe = 'whole-body'; });
  await tell(page, source, { type: 'devpt-teaching-view', activity: id, view: { resource: 'anatomy-hip', side: 'R', cohort: 'male' } });
  await expect(page).toHaveURL(/#\/activity\/anatomy-explorer\?view=anatomy-hip&side=R&cohort=male$/);
  await expect(frame).toHaveAttribute('data-retention-probe', 'whole-body');
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  expect(new URL(await page.getByRole('textbox', { name: 'Resource share link', exact: true }).inputValue()).hash).toBe('#/activity/' + id + '?view=anatomy-hip&side=R&cohort=male');
  const before = page.url();
  for (const resource of ['archived-ankle-muscle', 'ankle-source-preview', workspace, id]) {
    await tell(page, source, { type: 'devpt-teaching-view', activity: id, view: { resource, side: 'R', cohort: 'male' } });
    expect(page.url()).toBe(before);
  }
});

test('an explorer view link opens its exact native view with generic context and related resources below the player', async ({ page }, testInfo) => {
  await setup(page);
  await open(page, testInfo, '?view=combined-ankle-dorsiflexion&side=L&cohort=female&practice=match');
  const frame = page.locator('.native-frame');
  await expect(frame).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + workspace + '&embedded=1&view=combined-ankle-dorsiflexion&side=L&cohort=female&practice=match');
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Combined ankle dorsiflexion · Match anatomy');
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb', exact: true });
  await expect(breadcrumb).toContainText('Regions'); await expect(breadcrumb).toContainText('Lower extremity workspace');
  await expect(breadcrumb.locator('.workspace-crumb')).not.toContainText('Hip');
  // Related resources are a menu in the page header, not a panel below the player.
  const related = page.locator('select[data-switch]');
  await expect(related).toHaveCount(1);
  expect(await related.evaluate(element => !!element.closest('.page-band'))).toBe(true);
  await expect(related.locator('option', { hasText: 'Hip anatomy at rest' })).toHaveCount(1);
});

test('only the loaded trusted source can update the current view and Share preserves it without remounting', async ({ page }, testInfo) => {
  await setup(page);
  const source = await open(page, testInfo);
  await page.locator('.native-frame').evaluate(frame => { frame.dataset.retentionProbe = 'same-frame'; });
  await source.evaluate(() => { window.retentionProbe = 'same-window'; });
  const originalSrc = await page.locator('.native-frame').getAttribute('src');
  await tell(page, source, message(validView));
  await expect(page).toHaveURL(/#\/activity\/lower-extremity-explorer\?view=joint-ankle-posterior-glide&side=L&cohort=female$/);
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Posterior talar glide');
  await expect(page.locator('.native-frame')).toHaveAttribute('src', originalSrc);
  await expect(page.locator('.native-frame')).toHaveAttribute('data-retention-probe', 'same-frame');
  expect(await source.evaluate(() => window.retentionProbe)).toBe('same-window');
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  const share = page.getByRole('textbox', { name: 'Resource share link', exact: true });
  expect(new URL(await share.inputValue()).hash).toBe('#/activity/' + workspace + '?view=joint-ankle-posterior-glide&side=L&cohort=female');
  await page.getByRole('button', { name: 'Use explorer start link instead', exact: true }).click();
  expect(new URL(await share.inputValue()).hash).toBe('#/activity/' + workspace);
  await expect(page.locator('.native-frame')).toHaveAttribute('data-retention-probe', 'same-frame');
  expect(await source.evaluate(() => window.retentionProbe)).toBe('same-window');
});

test('view messages reject wrong origin, wrong window, wrong activity and ineligible source identities', async ({ page }, testInfo) => {
  await setup(page); const source = await open(page, testInfo);
  await tell(page, source, message(validView));
  const before = page.url(), caption = await page.locator('[data-current-view]').innerText();
  for (const attack of [
    { origin: 'https://untrusted.example', useFrame: true },
    { origin: sourceOrigin, useFrame: false },
  ]) {
    await page.evaluate(({ attack, data }) => dispatchEvent(new MessageEvent('message', {
      origin: attack.origin, source: attack.useFrame ? document.querySelector('.native-frame').contentWindow : window, data,
    })), { attack, data: message({ resource: 'anatomy-hip', side: 'R', cohort: 'male' }) });
    expect(page.url()).toBe(before);
  }
  const badViews = [
    { ...validView, resource: 'unknown-resource' }, { ...validView, resource: workspace },
    { ...validView, resource: 'archived-ankle-muscle' }, { ...validView, resource: 'ankle-source-preview' }, { ...validView, resource: 'learning-ankle-mortise' },
    { ...validView, resource: 'joint-shoulder-flexion' }, { ...validView, side: 'left' }, { ...validView, side: '' },
    { ...validView, cohort: 'unknown' }, { ...validView, cohort: '' }, { ...validView, practice: 'unsupported-task' },
    { ...validView, camera: 'invented-field' },
  ];
  for (const view of badViews) {
    await tell(page, source, message(view));
    expect(page.url()).toBe(before); await expect(page.locator('[data-current-view]')).toHaveText(caption);
  }
  await tell(page, source, { ...message({ resource: 'anatomy-hip', side: 'R', cohort: 'male' }), activity: 'anatomy-hip' });
  expect(page.url()).toBe(before);
});

test('Hip and ankle matching are preserved explicit views', async ({ page }, testInfo) => {
  await setup(page); const source = await open(page, testInfo);
  await tell(page, source, message({ resource: 'combined-ankle-dorsiflexion', side: 'R', cohort: 'male', practice: 'match' }));
  await expect(page).toHaveURL(/practice=match$/);
  await expect(page.locator('[data-current-view]')).toHaveText('Right · Combined ankle dorsiflexion · Match anatomy');
  await tell(page, source, message({ resource: 'anatomy-hip', side: 'L', cohort: 'female', practice: 'match' }));
  await expect(page).toHaveURL(/\?view=anatomy-hip&side=L&cohort=female&practice=match$/);
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Hip anatomy at rest · Match anatomy');
});

test('invalid explorer view query falls back cleanly while retained archives remain directly available', async ({ page }, testInfo) => {
  await setup(page);
  for (const resource of [workspace, 'archived-ankle-muscle', 'ankle-source-preview', 'joint-shoulder-flexion', 'unknown-resource']) {
    await open(page, testInfo, '?view=' + resource + '&side=L&cohort=female');
    await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + workspace + '&embedded=1');
    await expect(page.locator('[data-current-view]')).not.toContainText('Left ·');
  }
  for (const query of ['?view=combined-ankle-dorsiflexion&side=&cohort=female', '?view=combined-ankle-dorsiflexion&side=L&cohort=']) {
    await open(page, testInfo, query);
    await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + workspace + '&embedded=1');
    await expect(page.locator('[data-current-view]')).not.toContainText('Left ·');
  }
  for (const id of ['archived-ankle-muscle', 'ankle-source-preview']) {
    await open(page, testInfo, '?view=combined-ankle-dorsiflexion&side=L&cohort=female', id);
    await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + id + '&embedded=1');
    await expect(page.locator('[data-player-asset]')).toHaveAttribute('data-player-asset', id);
  }
});

for (const exit of ['browser Back', 'native Exit']) test(`${exit} leaves fullscreen with the current anatomy view and the same source window`, async ({ page }, testInfo) => {
  await setup(page);
  await page.goto('/#/activity/' + workspace + '?view=anatomy-hip&side=R&cohort=male');
  const player = page.locator('.native-player'), frame = page.locator('.native-frame');
  await expect(player).toHaveAttribute('data-ready', 'true');
  const source = page.frames().find(frame => frame.url().startsWith(sourceOrigin + '/teaching/'));
  expect(source).toBeTruthy();
  // Phone launch enters fullscreen automatically. Desktop uses the same native request protocol.
  if (testInfo.project.name !== 'phone') await source.evaluate(origin => parent.postMessage({ type: 'devpt-teaching-fullscreen', on: true }, origin), new URL(page.url()).origin);
  await expect(player).toHaveClass(/\bfullscreen\b/);
  await frame.evaluate(frame => { frame.dataset.retentionProbe = 'fullscreen-frame'; });
  await source.evaluate(() => { window.retentionProbe = 'fullscreen-window'; });
  const originalSrc = await frame.getAttribute('src');
  const current = { resource: 'combined-ankle-dorsiflexion', side: 'L', cohort: 'female', practice: 'match' };
  await tell(page, source, message(current));
  const currentHash = '#/activity/' + workspace + '?view=combined-ankle-dorsiflexion&side=L&cohort=female&practice=match';
  expect(new URL(page.url()).hash).toBe(currentHash);
  expect(await source.evaluate(() => window.receivedSelections)).toEqual([]);
  const pops = await page.evaluate(() => window.anatomyViewPops);
  if (exit === 'browser Back') await page.goBack();
  else await source.evaluate(origin => parent.postMessage({ type: 'devpt-teaching-fullscreen', on: false }, origin), new URL(page.url()).origin);
  await expect.poll(() => page.evaluate(() => window.anatomyViewPops)).toBe(pops + 1);
  await expect(player).not.toHaveClass(/\bfullscreen\b/);
  // Wait through the message turn: an accidental source reselect must not hide behind a URL-only assertion.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(new URL(page.url()).hash).toBe(currentHash);
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Combined ankle dorsiflexion · Match anatomy');
  await expect(frame).toHaveAttribute('src', originalSrc);
  await expect(frame).toHaveAttribute('data-retention-probe', 'fullscreen-frame');
  expect(await source.evaluate(() => window.retentionProbe)).toBe('fullscreen-window');
  expect(await source.evaluate(() => window.receivedMessages.filter(message => message.type === 'devpt-teaching-select'))).toEqual([]);
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  expect(new URL(await page.getByRole('textbox', { name: 'Resource share link', exact: true }).inputValue()).hash).toBe(currentHash);
});

test('a published guided lesson roundtrips through launch, trusted current-view state and Share without answers or progress', async ({ page }, testInfo) => {
  await setup(page);
  const source = await open(page, testInfo, '?view=combined-ankle-dorsiflexion&side=L&cohort=female&practice=ankle-mortise');
  const frame = page.locator('.native-frame');
  await expect(frame).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + workspace + '&embedded=1&view=combined-ankle-dorsiflexion&side=L&cohort=female&practice=ankle-mortise');
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Combined ankle dorsiflexion · Build the ankle mortise');
  await frame.evaluate(element => { element.dataset.retentionProbe = 'guided-frame'; });
  await tell(page, source, message({ resource: 'combined-ankle-dorsiflexion', side: 'R', cohort: 'female', practice: 'ankle-mortise' }));
  await expect(page.locator('[data-current-view]')).toHaveText('Right · Combined ankle dorsiflexion · Build the ankle mortise');
  await expect(frame).toHaveAttribute('data-retention-probe', 'guided-frame');
  await page.getByRole('button', { name: 'Share current view', exact: true }).click();
  const shared = new URL(await page.getByRole('textbox', { name: 'Resource share link', exact: true }).inputValue());
  const params = new URLSearchParams(shared.hash.split('?')[1]);
  expect(Object.fromEntries(params)).toEqual({ view: 'combined-ankle-dorsiflexion', side: 'R', cohort: 'female', practice: 'ankle-mortise' });
  expect([...params.keys()]).toEqual(['view', 'side', 'cohort', 'practice']);
});

test('guided practice must be source-published and belong to the selected region', async ({ page }, testInfo) => {
  await setup(page);
  const source = await open(page, testInfo, '?view=anatomy-foot&side=L&cohort=female&practice=ankle-mortise');
  await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + '/teaching/?activity=' + workspace + '&embedded=1&view=anatomy-foot&side=L&cohort=female');
  await expect(page.locator('[data-current-view]')).toHaveText('Left · Foot anatomy at rest');
  await tell(page, source, message({ resource: 'combined-ankle-dorsiflexion', side: 'L', cohort: 'female', practice: 'ankle-mortise' }));
  await expect(page).toHaveURL(/practice=ankle-mortise$/);
  const validUrl = page.url();
  for (const extra of [{ practice: 'ankle-mortise-invented' }, { answers: ['a-source-answer'] }, { progress: 2 }]) {
    await tell(page, source, message({ resource: 'combined-ankle-dorsiflexion', side: 'L', cohort: 'female', practice: 'ankle-mortise', ...extra }));
    expect(page.url()).toBe(validUrl);
  }
  await tell(page, source, message({ resource: 'anatomy-foot', side: 'R', cohort: 'male', practice: 'ankle-mortise' }));
  await expect(page).toHaveURL(/\?view=anatomy-foot&side=R&cohort=male$/);
  await expect(page.locator('[data-current-view]')).toHaveText('Right · Foot anatomy at rest');
});

for (const [region, lesson] of [['hip', 'hip-gluteal-layers'], ['knee', 'knee-quadriceps-group']]) test(`published ${region} practice survives trusted workspace state and sharing`, async ({ page }, testInfo) => {
  await setup(page);
    const resource = 'anatomy-' + region;
    const source = await open(page, testInfo, `?view=${resource}&side=L&cohort=female&practice=${lesson}`);
    await expect(page.locator('.native-frame')).toHaveAttribute('src', sourceOrigin + `/teaching/?activity=${workspace}&embedded=1&view=${resource}&side=L&cohort=female&practice=${lesson}`);
    await tell(page, source, message({ resource, side: 'R', cohort: 'female', practice: lesson }));
    await expect(page).toHaveURL(new RegExp(`practice=${lesson}$`));
    await page.getByRole('button', { name: 'Share current view', exact: true }).click();
    expect(new URL(await page.getByRole('textbox', { name: 'Resource share link', exact: true }).inputValue()).hash).toContain(`practice=${lesson}`);
});
