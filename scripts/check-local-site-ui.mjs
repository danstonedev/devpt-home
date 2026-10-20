import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Read-only browser smoke checks for the local resource-library rebuild.
// Native-frame requests are intercepted: this checks host navigation/launch
// contracts, not the source applications' rendering or clinical content.
const base = process.env.DEVPT_LOCAL_BASE_URL || 'http://127.0.0.1:8110';
const output = '/workspace/scratch/devpt-site-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const checks = [];
const check = (name, condition, detail) => {
  checks.push({ name, pass: Boolean(condition), ...(detail === undefined ? {} : { detail }) });
  assert.ok(condition, `${name}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
  console.log(`PASS ${name}`);
};
const noOverflow = async (page, name) => {
  const value = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth }));
  check(name, value.page <= value.viewport, value);
};
async function openRoute(page, hash) {
  await page.goto(`${base}/${hash}`);
  await page.locator('#main').waitFor();
}
async function hashRoute(page, hash) {
  await page.evaluate(value => {
    if (location.hash === value) return;
    return new Promise(resolve => {
      document.addEventListener('devpt:render', resolve, { once: true });
      location.hash = value;
    });
  }, hash);
  await page.waitForFunction(value => location.hash === value, hash);
  await page.locator('#main').waitFor();
}
async function context(options) {
  // Keep this host-only check from automatically allocating a native product.
  const ctx = await browser.newContext({ reducedMotion: 'reduce', ...options });
  await ctx.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.isNavigationRequest() && url.pathname.endsWith('/teaching/')) {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Host-frame contract check</title><p>Native renderer intentionally not loaded by this host UI check.</p>' });
    }
    return route.continue();
  });
  return ctx;
}

try {
  const desktop = await context({ viewport: { width: 1440, height: 1000 } });
  const page = await desktop.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await openRoute(page, '#/home');
  check('home resource catalog is available', await page.locator('.browse-collection').count() > 0);
  check('home keeps three product links', await page.locator('.product-strip a').count() === 3);
  check('no lesson-building navigation', await page.locator('[data-student-preview],[data-template],[data-lesson-count]').count() === 0);
  await noOverflow(page, 'desktop home fits viewport');
  await page.screenshot({ path: `${output}/desktop-home.png`, fullPage: true });

  await page.locator('.nav a[href="#/regions"]').click();
  check('region browsing opens', (await page.locator('h1').innerText()).includes('region'));
  await page.locator('a[href="#/collection/all-hip"]').first().click();
  check('hip collection opens', (await page.locator('h1').innerText()) === 'All Things Hip');
  const hipCount = await page.locator('.asset-card').count();
  check('hip collection contains related resources', hipCount >= 3, hipCount);
  await page.locator('[data-share-collection]').click();
  const collectionLink = await page.locator('#share-url').inputValue();
  check('collection share preserves its identity', new URL(collectionLink).hash === '#/collection/all-hip');
  await page.keyboard.press('Escape');
  check('share Escape closes and restores focus', await page.locator('[data-share-collection]').evaluate(element => !document.querySelector('#modal').open && document.activeElement === element));
  await page.locator('details.collection-more > summary').click();
  await page.locator('[data-save-collection]').click();
  const savedCount = Number(await page.locator('[data-saved-count]').innerText());
  check('save collection saves all unique resources', savedCount === hipCount, { savedCount, hipCount });

  await page.locator('.nav a[href="#/topics"]').click();
  check('topic browsing opens', (await page.locator('h1').innerText()).includes('topic'));
  await page.locator('a[href="#/collection/eyes-vestibular"]').first().click();
  check('vestibular collection opens', (await page.locator('h1').innerText()) === 'Eyes & Vestibular');
  await page.locator('.nav a[href="#/library"]').click();
  const allCount = await page.locator('.asset-card').count();
  check('all resources has multiple topics', allCount > hipCount);
  await page.locator('#library-search').fill('hip');
  const hipSearchCount = await page.locator('.asset-card').count();
  check('hip search narrows catalog', hipSearchCount > 0 && hipSearchCount < allCount, { allCount, hipSearchCount });
  check('hip search excludes vestibular substring false positives', await page.locator('a[href="#/activity/canal-mechanics"]').count() === 0);
  await page.locator('#topic-select').selectOption('Vestibular');
  check('search and topic filters intersect', await page.locator('.asset-card').count() === 0);
  await page.locator('[data-clear-filters]').click();
  check('clear filters restores resources', await page.locator('.asset-card').count() === allCount);
  await page.locator('#region-select').selectOption('Hip');
  check('region filter produces a subset', await page.locator('.asset-card').count() > 0 && await page.locator('.asset-card').count() < allCount);
  await page.locator('#library-search').fill('noresourcewiththisword');
  check('empty search has recovery action', await page.getByRole('heading', { name: 'No matching resources' }).isVisible());
  await page.locator('[data-clear-filters]').click();
  await page.screenshot({ path: `${output}/desktop-library.png`, fullPage: true });
  await noOverflow(page, 'desktop library fits viewport');

  const assetIds = await page.locator('.asset-card [data-add]').evaluateAll(nodes => nodes.map(node => node.dataset.add));
  for (const id of assetIds) {
    await hashRoute(page, `#/activity/${id}`);
    await page.locator(`[data-player-asset="${id}"]`).waitFor();
    const launch = page.locator(`[data-launch-native="${id}"]`);
    if (await launch.count()) {
      await launch.click();
      const src = await page.locator('iframe.native-frame').getAttribute('src');
      const url = new URL(src);
      check(`canonical frame route ${id}`, url.pathname.endsWith('/teaching/') && url.searchParams.get('activity') === id && url.searchParams.get('embedded') === '1', { origin: url.origin, path: url.pathname, activity: url.searchParams.get('activity') });
    } else {
      check(`truthful native availability ${id}`, await page.locator('.native-unavailable').isVisible());
    }
  }

  await hashRoute(page, '#/saved');
  await page.locator('[data-share-saved]').click();
  const sharedLink = await page.locator('#share-url').inputValue();
  const ids = new URLSearchParams(new URL(sharedLink).hash.split('?')[1]).get('ids').split(',');
  check('mass share contains resource IDs only', ids.length === hipCount && new Set(ids).size === hipCount && !sharedLink.includes('data='));
  await page.keyboard.press('Tab');
  check('share dialog keeps keyboard focus inside', await page.locator('#modal').evaluate(element => element.contains(document.activeElement)));
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  const fresh = await context({ viewport: { width: 1440, height: 1000 } });
  const recipient = await fresh.newPage();
  await recipient.goto(sharedLink);
  await recipient.getByRole('heading', { name: 'Shared resources', exact: true }).waitFor();
  check('mass share works in a clean browser', await recipient.locator('.asset-card').count() === hipCount);
  check('share does not secretly modify recipient saves', await recipient.locator('[data-saved-count]').innerText() === '0');

  await hashRoute(page, '#/products');
  check('product directory retains all products', await page.locator('.site-products article').count() === 3);
  await page.locator('[data-workspace-expand]').first().waitFor({ state: 'visible' });
  check('product previews retain nine native poster links', await page.locator('.site-products [data-workspace-launch] img').count() === 9);
  check('product previews expose nine Expand controls', await page.locator('.site-products [data-workspace-expand]:visible').count() === 9);
  check('host-only product check allocates no native frame', await page.locator('[data-workspace-frame]').count() === 0);
  for (const path of ['/simlab/', '/emrs/', '/3dpain/']) {
    check(`canonical product link ${path}`, await page.locator(`.site-products a[href="${path}"]`).count() >= 1);
    const response = await desktop.request.get(`${base}${path}`);
    check(`product page served ${path}`, response.ok(), response.status());
  }
  await hashRoute(page, '#/contact');
  check('contact action retained', (await page.locator('.contact-card a.button').getAttribute('href')).startsWith('mailto:daniel.j.stone@und.edu'));
  check('desktop has no script errors', errors.length === 0, errors);

  const phone = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mobile = await phone.newPage();
  const mobileErrors = [];
  mobile.on('pageerror', error => mobileErrors.push(error.message));
  for (const route of ['#/home', '#/regions', '#/topics', '#/collection/all-hip', '#/library', '#/saved', '#/products', '#/contact']) {
    await openRoute(mobile, route);
    await noOverflow(mobile, `phone ${route} fits viewport`);
  }
  await openRoute(mobile, '#/home');
  await mobile.locator('[data-menu]').click();
  check('phone navigation expands', await mobile.locator('.nav').isVisible());
  await mobile.locator('.nav a[href="#/library"]').click();
  await mobile.locator('#library-search').fill('vestibular');
  check('phone search works', await mobile.locator('.asset-card').count() > 0);
  await mobile.locator('.asset-card [data-add]').first().click();
  check('phone save updates count', await mobile.locator('[data-saved-count]').innerText() === '1');
  await mobile.locator('.resource-tray [data-share-saved]').click();
  await noOverflow(mobile, 'phone share dialog fits viewport');
  await mobile.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await mobile.screenshot({ path: `${output}/phone-library.png`, fullPage: true });
  check('phone has no script errors', mobileErrors.length === 0, mobileErrors);
} catch (error) {
  checks.push({ name: 'run completed', pass: false, error: error.stack || String(error) });
  throw error;
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(checks, null, 2) + '\n');
  await browser.close();
}
