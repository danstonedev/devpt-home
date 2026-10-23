import { expect, test } from '@playwright/test';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/public-catalog.json', import.meta.url), 'utf8'));
const output = resolve('.cache/public-test');
const catalogUrl = 'https://lab.devpt.app/teaching/catalog.json';

test('resource and region pages are readable without JavaScript; missing resources return 404', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(baseURL + '/resources/exam-special-lachman/');
    expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lachman test');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://devpt.app/resources/exam-special-lachman/');
    await expect(page.locator('iframe')).toHaveCount(0);
    await page.goto(baseURL + '/regions/knee/');
    await expect(page.getByRole('link',{name:'Lachman test',exact:true})).toBeVisible();
    const missing = await page.request.get(baseURL + '/resources/does-not-exist/');
    expect(missing.status()).toBe(404);
  } finally { await context.close(); }
});

test('homepage and resource navigation stay within the phone viewport', async ({ page }) => {
  await page.route(catalogUrl, route => route.fulfill({ json: catalog }));
  await page.route(/https:\/\/lab\.devpt\.app\/teaching\/\?/, route => route.fulfill({contentType:'text/html',body:'<title>Protocol fixture</title>'}));
  for (const path of ['/', '/regions/knee/', '/resources/exam-special-lachman/']) {
    await page.goto(path);
    await page.waitForFunction(() => window.DEVPT_CATALOG_STATE === 'ready');
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('public analytics measures homepage, resource use and product interest without raw inputs', async ({ browser }) => {
  const context = await browser.newContext();
  const attemptedTags = [];
  let releaseCatalog;
  const catalogGate = new Promise(resolve => { releaseCatalog = resolve; });
  const mime = {'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.href === catalogUrl) { await catalogGate; return route.fulfill({json:catalog}); }
    if (url.origin === 'https://lab.devpt.app' && url.pathname === '/teaching/') return route.fulfill({contentType:'text/html',body:`<title>Protocol fixture</title><script>parent.postMessage({type:'devpt-teaching-ready',activity:new URLSearchParams(location.search).get('activity')},'https://devpt.app')</script>`});
    if (url.hostname === 'www.googletagmanager.com') attemptedTags.push(url.href);
    if (url.origin !== 'https://devpt.app') return route.abort();
    let file = resolve(output, '.' + url.pathname);
    if (!file.startsWith(output + '/') && file !== output) return route.abort();
    if (existsSync(file) && statSync(file).isDirectory()) file += '/index.html';
    if (!existsSync(file)) return route.fulfill({status:404,body:'Missing'});
    return route.fulfill({contentType:mime[extname(file)]||'application/octet-stream',body:readFileSync(file)});
  });
  try {
    const page = await context.newPage();
    await page.goto('https://devpt.app/?utm_source=newsletter&utm_medium=email&q=private@example.com');
    const events = () => page.evaluate(() => [...(window.dataLayer||[])].map(args=>[...args]).filter(args=>args[0]==='event'));
    await expect.poll(async () => (await events()).filter(event=>event[1]==='page_view').length).toBe(1);
    await expect(page.locator('main h1')).toHaveText('Reference library');
    await expect(page.locator('#app')).toHaveAttribute('aria-busy','true');
    releaseCatalog();
    await page.waitForFunction(() => window.DEVPT_CATALOG_STATE === 'ready');
    expect((await events()).filter(event=>event[1]==='page_view')).toHaveLength(1);
    await page.getByRole('link',{name:'Knee, 3 resources'}).click();
    await page.getByRole('link',{name:'Lachman test',exact:true}).click();
    await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');
    await page.locator('[data-add="exam-special-lachman"]').click();
    await page.locator('[data-add="exam-special-lachman"]').click();
    const data = await events();
    expect(data.filter(event=>event[1]==='page_view')).toHaveLength(3);
    expect(data.filter(event=>event[1]==='resource_open')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_ready')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_save')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_remove')).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('private@example.com');
    expect(attemptedTags).toHaveLength(1);
    await page.locator('footer a[href="/emrs/"]').evaluate(link=>link.addEventListener('click',event=>event.preventDefault()));
    await page.locator('footer a[href="/emrs/"]').click();
    await expect.poll(async () => (await events()).filter(event=>event[1]==='product_link_click').length).toBe(1);
  } finally { await context.close(); }
});
