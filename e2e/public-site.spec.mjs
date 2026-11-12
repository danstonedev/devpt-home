import { expect, test } from '@playwright/test';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, extname } from 'node:path';

const catalog = JSON.parse(readFileSync(new URL('./fixtures/public-catalog.json', import.meta.url), 'utf8'));
const output = resolve('.cache/public-test');
const catalogUrl = 'https://lab.devpt.app/teaching/catalog.json';

test('Evidence flows and the named Posture Lab have independent direct pages and searchable entries', async ({browser,page,baseURL}) => {
  const ids=['evidence-diagnostic-results','evidence-test-clusters','posture-assessment-standing','evidence-test-decisions'];
  const staticContext=await browser.newContext({javaScriptEnabled:false});
  try{
    const direct=await staticContext.newPage();
    for(const id of ids){
      const resource=catalog.activities.find(item=>item.id===id);
      const response=await direct.goto(baseURL+'/resources/'+id+'/',{waitUntil:'domcontentloaded'});
      expect(response.status()).toBe(200);
      await expect(direct.getByRole('heading',{level:1})).toHaveText(resource.title);
      await expect(direct.locator('iframe')).toHaveCount(0);
    }
  }finally{await staticContext.close();}
  await page.route(catalogUrl,route=>route.fulfill({json:catalog}));
  await page.route(url=>url.origin==='https://lab.devpt.app'&&/^\/teaching\/?$/u.test(url.pathname),route=>route.fulfill({contentType:'text/html',body:'<title>Source launch protocol fixture</title>'}));
  for(const id of ids){
    await page.goto('/resources/'+id+'/',{waitUntil:'domcontentloaded'});
    const frame=page.locator('.native-frame');await expect(frame).toHaveCount(1);
    const source=new URL(await frame.getAttribute('src'));
    expect(source.origin).toBe('https://lab.devpt.app');expect(source.searchParams.get('activity')).toBe(id);
  }
  for(const [query,expected] of [['Sankey',[ids[0],ids[1],ids[3]]],['prevalence',['evidence-test-decisions']],['PPV NPV',['evidence-test-decisions']],['postural assessment',['posture-assessment-standing']]]){
    await page.goto('/search/?q='+encodeURIComponent(query),{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.DEVPT_CATALOG_STATE==='ready');
    for(const id of expected)await expect(page.locator('a[href="/resources/'+id+'/"]').first()).toBeVisible();
  }
});

async function isolatedPublicSite(browser, value, projectUse) {
  const context = await browser.newContext({ viewport: projectUse.viewport, isMobile: projectUse.isMobile, hasTouch: projectUse.hasTouch });
  const tags = [];
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.href === catalogUrl) return route.fulfill({ json: value });
    if (url.hostname === 'www.googletagmanager.com') { tags.push(url.href); return route.fulfill({ contentType: 'text/javascript', body: '' }); }
    if (url.origin !== 'https://devpt.app') return route.abort();
    let file = resolve(output, '.' + url.pathname);
    if (!file.startsWith(output + '/') && file !== output) return route.abort();
    if (existsSync(file) && statSync(file).isDirectory()) file += '/index.html';
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'Missing' });
    return route.fulfill({ contentType: mime[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
  });
  return { context, tags };
}

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
    expect(data.find(event=>event[1]==='page_view'&&event[2].page_type==='region')[2]).toMatchObject({ region_id:'knee' });
    expect(data.find(event=>event[1]==='page_view'&&event[2].page_type==='resource')[2]).toMatchObject({ resource_id:'exam-special-lachman', region_id:'knee', topic_id:'special-tests' });
    expect(JSON.stringify(data)).not.toContain('private@example.com');
    expect(attemptedTags).toEqual(['https://www.googletagmanager.com/gtag/js?id=G-61473CPT29']);
    expect(data.every(event=>event[2].send_to==='G-61473CPT29')).toBe(true);
    expect(JSON.stringify(data)).not.toContain('G-VTLNJW0KKX');
    await page.locator('footer a[href="/emrs/"]').evaluate(link=>link.addEventListener('click',event=>event.preventDefault()));
    await page.locator('footer a[href="/emrs/"]').click();
    await expect.poll(async () => (await events()).filter(event=>event[1]==='product_link_click').length).toBe(1);
  } finally { await context.close(); }
});

test('unknown legacy routes and sensitive static paths never initialize analytics', async ({ browser }, testInfo) => {
  const { context, tags } = await isolatedPublicSite(browser, catalog, testInfo.project.use);
  try {
    const page = await context.newPage();
    const sentinel = 'private-test-patient-do-not-collect';
    await page.goto('https://devpt.app/#/' + sentinel);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    const metadata = await page.evaluate(() => window.DEVPT_PAGE);
    expect(metadata).toMatchObject({ canonical: 'https://devpt.app/404.html', page_type: 'unavailable', noindex: true });
    expect(JSON.stringify(metadata)).not.toContain(sentinel);
    expect(await page.evaluate(() => [...(window.dataLayer || [])])).toEqual([]);
    expect(tags).toEqual([]);

    // Exercise the static-page guard even if a future host accidentally serves
    // this shared tag on a private document. This is a synthetic sentinel only.
    await context.route('https://devpt.app/patients/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>' + sentinel + '</title><script src="/site-analytics.js"></script>' }));
    await page.goto('https://devpt.app/patients/' + sentinel);
    expect(await page.evaluate(() => typeof window.DEVPT_ANALYTICS?.page)).toBe('function');
    expect(await page.evaluate(() => [...(window.dataLayer || [])])).toEqual([]);
    expect(tags).toEqual([]);
  } finally { await context.close(); }
});

test('a parked source becomes ready silently and reports readiness once when resumed', async ({ browser }, testInfo) => {
  const id = 'posture-assessment-standing';
  const source = { ...catalog.activities.find(item => !item.aliasOf), id, nativeId: id, title: 'Standing posture', regionId: 'whole-body', region: 'Whole body', topicId: 'gait-balance', topic: 'Gait & balance', url: 'https://lab.devpt.app/teaching/?activity=' + id, launch: { kind: 'posture', example: 'standing-reference' } };
  const { context } = await isolatedPublicSite(browser, { ...catalog, activities: [...catalog.activities, source] }, testInfo.project.use);
  let loads = 0;
  await context.route('https://lab.devpt.app/teaching/?**', route => {
    loads++;
    return route.fulfill({ contentType: 'text/html', body: `<title>Readiness protocol fixture</title><script>
      const activity=new URLSearchParams(location.search).get('activity'),origin=new URL(document.referrer).origin;
      window.finish=()=>parent.postMessage({type:'devpt-teaching-ready',activity,patientId:'private-test-patient',notes:'private-test-note'},origin);
      </script>` });
  });
  try {
    const page = await context.newPage();
    const events = () => page.evaluate(() => [...(window.dataLayer || [])].map(args => [...args]).filter(args => args[0] === 'event'));
    await page.goto('https://devpt.app/#/activity/' + id);
    const player = page.locator('.native-player'), frame = page.locator('.native-frame');
    await expect(frame).toBeAttached();
    const retained = await frame.elementHandle();
    const native = page.frames().find(value => value.url().startsWith('https://lab.devpt.app/teaching/'));
    await page.evaluate(() => { location.hash = '#/library'; });
    await expect(page.getByRole('heading', { name: 'Search the library', exact: true })).toBeVisible();
    await native.evaluate(() => window.finish());
    await expect(player).toHaveAttribute('data-ready', 'true');
    expect((await events()).filter(event => event[1] === 'resource_ready')).toHaveLength(0);

    await page.locator('.ref-result a[href="/resources/' + id + '/"]').click();
    await expect(player).toBeVisible();
    await expect.poll(async () => (await events()).filter(event => event[1] === 'resource_ready').length).toBe(1);
    await native.evaluate(() => window.finish());
    expect((await events()).filter(event => event[1] === 'resource_ready')).toHaveLength(1);
    expect((await events()).filter(event => event[1] === 'resource_open' && event[2].resource_id === id)).toHaveLength(2);
    expect(JSON.stringify(await events())).not.toMatch(/private-test-(patient|note)/);
    expect(await retained.evaluate(element => element.isConnected && element === document.querySelector('.native-frame'))).toBe(true);
    expect(loads).toBe(1);
  } finally { await context.close(); }
});
