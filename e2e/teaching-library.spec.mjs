import { expect, test } from '@playwright/test';

const catalogUrl = 'https://lab.devpt.app/teaching/catalog.json';
// Protocol-only fixtures exercise discovery/sharing. Actual model/player
// rendering is verified in the source repository, never imitated here.
const activities = ['hip-anatomy', 'gait'].map((id, index) => ({
  id, nativeId: id, title: index ? 'Native walk' : 'Hip anatomy at rest',
  topic: index ? 'Gait' : 'Anatomy & movement', region: 'Hip',
  type: 'Interactive resource', minutes: 5, level: 'Foundational',
  media: index ? 'gait' : 'anatomy', symbol: 'layers',
  desc: 'Protocol fixture', outcome: 'Protocol fixture', source: 'Source-owned fixture',
}));
const catalog = { schemaVersion: 1, status: 'public-resources', source: 'simlab', activities };
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
  await expect(page.locator('.asset-card')).toHaveCount(2);
});

test('unpublished catalog data fails closed while product navigation works', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await routeCatalog(page, { ...catalog, status: 'local-development-only' });
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: 'Library unavailable' })).toBeVisible();
  await expect(page.locator('.asset-card')).toHaveCount(0);
  await nav(page, '#/products');
  await expect(page.locator('article[data-product]')).toHaveCount(3);
  expect(requests.some(url => /local-site-config|\/native\/|__local\/gait-physics/.test(url))).toBe(false);
});

test('selected resource IDs open in a clean browser without an account', async ({ page, browser }) => {
  await routeCatalog(page);
  await page.goto('/#/library');
  for (const activity of activities) await page.locator(`[data-add="${activity.id}"]`).click();
  await page.locator('.topbar a[href="#/saved"]').click();
  await page.locator('[data-share-saved]').click();
  const url = await page.getByRole('textbox', { name: 'Resource share link' }).inputValue();
  expect(new URL(url).hash).toBe('#/saved?ids=hip-anatomy,gait');
  await expect(page.getByText('Local build · recipients need access to this site.')).toHaveCount(0);
  const context = await browser.newContext();
  try {
    await routeCatalog(context);
    const recipient = await context.newPage();
    await recipient.goto(url);
    await expect(recipient.getByRole('heading', { name: 'Shared resources', exact: true })).toBeVisible();
    await expect(recipient.locator('.asset-card')).toHaveCount(2);
    expect(await recipient.evaluate(() => localStorage.getItem('devpt.saved-resources.v1'))).toBeNull();
  } finally { await context.close(); }
});

test('resource activation uses only its canonical player and validates the sender', async ({ page }) => {
  await routeCatalog(page);
  await page.route(url => url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/', route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><title>Protocol-only source fixture</title><p>Protocol-only source fixture</p>',
  }));
  await page.goto('/#/activity/hip-anatomy');
  await expect(page.getByRole('button', { name: 'Open resource', exact: true })).toBeVisible();
  await expect(page.locator('.native-frame')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open resource', exact: true }).click();
  await expect(page.locator('.native-frame')).toHaveAttribute('src', 'https://lab.devpt.app/teaching/?activity=hip-anatomy&embedded=1');
  await page.evaluate(() => dispatchEvent(new MessageEvent('message', {
    origin: 'https://lab.devpt.app', source: window,
    data: { type: 'devpt-teaching-ready', activity: 'hip-anatomy' },
  })));
  await expect(page.locator('.native-player')).not.toHaveAttribute('data-ready', 'true');
  const source = page.frames().find(frame => frame.url().startsWith('https://lab.devpt.app/teaching/'));
  await source.evaluate(parentOrigin => parent.postMessage({ type: 'devpt-teaching-ready', activity: 'hip-anatomy' }, parentOrigin), new URL(page.url()).origin);
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.native-status')).toHaveText('Ready');
  await nav(page, '#/topics');
  await expect(page.locator('.native-frame')).toHaveCount(0);
});
