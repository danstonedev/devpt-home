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
    await page.goto(baseURL + '/regions/hip/');
    await expect(page.getByRole('heading',{level:1})).toHaveText('Hip');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://devpt.app/regions/hip/');
    const missing = await page.request.get(baseURL + '/resources/does-not-exist/');
    expect(missing.status()).toBe(404);
  } finally { await context.close(); }
});

test('single-resource category URLs stay canonical while cards and legacy links keep direct opening', async ({ page }) => {
  await page.route(catalogUrl, route => route.fulfill({json:catalog}));
  await page.route(url=>url.origin==='https://lab.devpt.app'&&url.pathname==='/teaching/',route=>route.fulfill({contentType:'text/html',body:'<title>Protocol fixture</title>'}));
  for(const path of ['/regions/hip/','/topics/gait-balance/']){
    await page.goto(path);
    await page.waitForFunction(()=>window.DEVPT_CATALOG_STATE==='ready');
    await expect(page).toHaveURL(new RegExp(path+'$'));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://devpt.app'+path);
    await expect(page.locator('.native-frame')).toHaveCount(0);
  }
  await page.goto('/regions/');
  await page.waitForFunction(()=>window.DEVPT_CATALOG_STATE==='ready');
  await expect(page.getByRole('link',{name:'Hip, 1 resources',exact:true})).toHaveAttribute('href','/resources/anatomy-hip/');
  for(const path of ['/#/region/hip','/#/collection/all-hip']){
    let releaseCatalog;
    const gate=new Promise(resolve=>{releaseCatalog=resolve;});
    await page.unroute(catalogUrl);
    await page.route(catalogUrl,async route=>{await gate;await route.fulfill({json:catalog});});
    await page.goto(path);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Loading resources…');
    releaseCatalog();
    await expect(page).toHaveURL(/\/resources\/anatomy-hip\/$/);
  }
});

test('catalog failure settles legacy and real category routes into visible recovery', async ({ page }) => {
  await page.route(catalogUrl,route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  for(const path of ['/#/region/hip','/#/collection/all-hip','/regions/hip/']){
    await page.goto(path);
    await expect(page.getByRole('heading',{level:1})).toHaveText('Library unavailable');
    await expect(page.getByRole('button',{name:'Reload',exact:true})).toBeVisible();
    await expect(page.locator('#app')).not.toHaveAttribute('aria-busy','true');
    expect(await page.evaluate(()=>window.DEVPT_CATALOG_STATE)).toBe('unavailable');
  }
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

test('public analytics measures homepage, resource use and product interest without raw inputs', async ({ browser }, testInfo) => {
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
    if(testInfo.project.name==='phone'){
      await page.goBack();
      await expect(page.locator('.native-player')).not.toHaveClass(/fullscreen/);
    }
    await page.locator('[data-add="exam-special-lachman"]').click();
    await page.locator('[data-add="exam-special-lachman"]').click();
    const data = await events();
    expect(data.filter(event=>event[1]==='page_view')).toHaveLength(3);
    expect(data.filter(event=>event[1]==='resource_open')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_ready')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_save')).toHaveLength(1);
    expect(data.filter(event=>event[1]==='resource_remove')).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('private@example.com');
    expect(attemptedTags).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-61473CPT29']);
    expect(data.every(event=>event[2].send_to==='G-61473CPT29')).toBe(true);
    expect(JSON.stringify(data)).not.toContain('G-VTLNJW0KKX');
    await page.locator('footer a[href="/emrs/"]').evaluate(link=>link.addEventListener('click',event=>event.preventDefault()));
    await page.locator('footer a[href="/emrs/"]').click();
    await expect.poll(async () => (await events()).filter(event=>event[1]==='product_link_click').length).toBe(1);
  } finally { await context.close(); }
});
