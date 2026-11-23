import {expect,test} from './fixtures/phone-open.mjs';
import {organizedCatalog} from './fixtures/organized-catalog.mjs';

// Discovery and navigation protocol coverage. Native model behavior remains
// tested in its source repository; this fixture does not simulate a patient.
test.beforeEach(async({page})=>{
  await page.route('https://lab.devpt.app/teaching/catalog.json',route=>route.fulfill({json:organizedCatalog}));
  await page.route(url=>url.origin==='https://lab.devpt.app'&&url.pathname==='/teaching/',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><title>Native protocol fixture</title><script>parent.postMessage({type:'devpt-teaching-ready',activity:new URL(location.href).searchParams.get('activity')},new URL(document.referrer).origin);</script>`}));
});

test('format and subject browsing cross-list games without a search term or duplicate result',async({page},testInfo)=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Games, 2 resources',exact:true}).click();
  await expect(page).toHaveURL(/\/search\/\?format=game$/);
  await expect(page.locator('.ref-result')).toHaveCount(2);
  await expect(page.getByLabel('Filter by format')).toHaveValue('game');
  await expect(page.getByLabel('Filter by topic').locator('option[value="games"]')).toHaveCount(0);
  await page.getByLabel('Filter by topic').selectOption('anatomy');
  await expect(page.locator('.ref-result')).toHaveCount(2);
  await page.getByLabel('Filter by topic').selectOption('imaging');
  await expect(page.locator('.ref-result')).toHaveCount(1);
  await expect(page.locator('.ref-result a')).toHaveAttribute('href','/resources/knee-imaging-game/');
  await expect(page.locator('.results-line')).toHaveText('1 resource');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('library-facets.png'),fullPage:true});
});

test('one study group exposes exact variants and returns to its filtered expanded chooser',async({page},testInfo)=>{
  await page.goto('/');
  await page.locator('.topic-chip[href="/topics/anatomy/"]').click();
  const family=page.locator('[data-study-family="muscle-rectus-femoris"]');
  await expect(family).toHaveCount(1);
  await family.locator('summary').click();
  await expect(family.locator('.study-variant-list>li')).toHaveCount(2);
  await page.screenshot({path:testInfo.outputPath('study-family.png'),fullPage:true});
  const filter=page.getByLabel('Filter Anatomy resources');
  await filter.fill('closed chain');
  await expect(family.locator('.study-variant-list>li:not([hidden])')).toHaveCount(1);
  await family.getByRole('link',{name:/Hip · Closed chain/}).click();
  await expect(page.locator('.native-player')).toHaveAttribute('data-ready','true');
  await expect(page.locator('.native-frame')).toHaveAttribute('src',/activity=hip-muscle&embedded=1/);
  if(testInfo.project.name==='phone')await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/topics\/anatomy\/$/);
  await expect(filter).toHaveValue('closed chain');
  await expect(family.locator('details')).toHaveAttribute('open','');
  await expect(family.locator('.study-variant-list>li:not([hidden])')).toHaveCount(1);
});

test('methods browse separately while reviewed neural regions override the legacy Whole body filing',async({page})=>{
  await page.goto('/');
  await page.getByRole('link',{name:'Methods and tools',exact:true}).click();
  await expect(page.getByLabel('Filter by scope')).toHaveValue('nonregional');
  await expect(page.locator('.ref-result')).toHaveCount(1);
  await expect(page.locator('.ref-result')).toContainText('method-tool');
  await page.getByLabel('Filter by scope').selectOption('');
  await page.getByLabel('Filter by region').selectOption('whole-body');
  await expect(page.locator('.ref-result')).toHaveCount(1);
  await expect(page.locator('.ref-result')).toContainText('body-study');
  await page.getByLabel('Filter by region').selectOption('hip');
  await expect(page.locator('.ref-result')).toHaveCount(2);
  await expect(page.locator('.ref-result').filter({hasText:'regional-neural'})).toContainText('Knee · Hip');
  await expect(page.locator('.ref-result a[href="/resources/hip-muscle/"]')).toBeVisible();
  await expect(page.locator('.study-group')).toHaveCount(0); // A single matching variant opens directly.
  await page.goto('/search/?topic=games');
  await expect(page.getByLabel('Filter by format')).toHaveValue('game');
  await expect(page.locator('.ref-result')).toHaveCount(2);
});
