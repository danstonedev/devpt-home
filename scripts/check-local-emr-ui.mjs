import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Integration smoke check of the portable site's real compiled EMR workspace.
// No routes or renderer responses are mocked.
const base = process.env.DEVPT_LOCAL_BASE_URL || 'http://127.0.0.1:8110';
const output = '/workspace/scratch/devpt-site-qa';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), ...(detail === undefined ? {} : { detail }) });
  assert.ok(pass, `${name}${detail === undefined ? '' : ': ' + JSON.stringify(detail)}`);
  console.log(`PASS ${name}`);
}
try {
  for (const [mode, viewport] of [['desktop', { width: 1440, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', ...(mode === 'phone' ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    const errors = [], forbidden = [], failedLocal = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^\/(?:api|\.auth|workspace)(?:\/|\?|$)/.test(url.pathname) || /^\/emr-native\/(?:api|\.auth|workspace)(?:\/|\?|$)/.test(url.pathname)) forbidden.push(request.url());
    });
    page.on('response', response => { if (response.url().startsWith(base + '/') && response.status() >= 400) failedLocal.push({ url: response.url(), status: response.status() }); });
    await page.goto(base + '/#/products');
    const emr = page.locator('[data-product="emrs"]');
    const open = emr.locator('[data-workspace-preview="documentation"] [data-workspace-expand]');
    await expect(open).toBeVisible();
    await open.click();
    const host = page.locator('#workspace-live-dialog');
    await expect(host).toBeVisible();
    await expect(host).toHaveAttribute('data-expanded', 'true');
    const iframe = host.locator('iframe');
    await expect(iframe).toHaveAttribute('src', /\/emr-native\/\?presentation=workspace&section=documentation$/);
    const frame = page.frameLocator('#workspace-live-dialog iframe');
    const nav = frame.getByRole('navigation', { name: 'Practice workspaces' });
    await expect(nav).toBeVisible({ timeout: 25000 });
    for (const label of ['Note workspace', 'Student schedule', 'Faculty feedback']) await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
    check(`${mode}: real shared rail visible with all practice destinations`, true);
    const concern = frame.getByRole('textbox', { name: 'Reason for today’s visit / chief concern', exact: true });
    await expect(concern).toBeVisible({ timeout: 25000 });
    const baseline = await concern.inputValue();
    const retainedFrame = await iframe.elementHandle();
    const nativeTimeOrigin = await frame.locator('html').evaluate(() => performance.timeOrigin);
    const sample = `${mode}: real note retained across shared-rail navigation.`;
    await concern.fill(sample);
    await nav.getByRole('button', { name: 'Student schedule', exact: true }).click();
    await expect(frame.getByRole('table', { name: 'Course appointment schedule' })).toBeVisible();
    check(`${mode}: schedule destination opens native schedule`, true);
    await nav.getByRole('button', { name: 'Faculty feedback', exact: true }).click();
    await expect(frame.getByRole('textbox', { name: 'Overall message to the team' })).toBeVisible();
    check(`${mode}: feedback destination opens native reviewer`, true);
    await nav.getByRole('button', { name: 'Note workspace', exact: true }).click();
    await expect(concern).toHaveValue(sample);
    check(`${mode}: unsaved practice note survives destination switches`, true);
    const guide = nav.getByRole('button', { name: 'Note Guide', exact: true });
    await guide.click();
    await expect(frame.locator('#chart-detail-panel')).toBeVisible();
    await frame.locator('#chart-detail-panel').getByRole('button', { name: 'Objective section', exact: true }).click();
    await expect(frame.locator('#section-tab-objective')).toHaveAttribute('aria-selected', 'true');
    check(`${mode}: Note Guide opens and jumps to native section`, true);
    if (await frame.locator('#chart-detail-panel').isVisible()) await frame.locator('body').press('Escape');
    await guide.click();
    await expect(frame.locator('#chart-detail-panel')).toBeVisible();
    await frame.locator('body').press('Escape');
    await expect(frame.locator('#chart-detail-panel')).toHaveCount(0);
    await expect(host).toBeVisible();
    await expect(guide).toBeFocused();
    check(`${mode}: native Escape closes guide first and returns rail focus`, true);
    await frame.getByRole('button', { name: 'Reset preview', exact: true }).click();
    await expect(concern).toHaveValue(baseline);
    await expect(nav).toBeVisible();
    check(`${mode}: Reset restores synthetic note fixture`, true);
    const frameSize = await frame.locator('html').evaluate(element => ({ viewport: innerWidth, scroll: element.scrollWidth }));
    const hostSize = await page.evaluate(() => ({ viewport: innerWidth, scroll: document.documentElement.scrollWidth }));
    check(`${mode}: native workspace has no horizontal overflow`, frameSize.scroll <= frameSize.viewport, frameSize);
    check(`${mode}: enclosing site has no horizontal overflow`, hostSize.scroll <= hostSize.viewport, hostSize);
    await page.screenshot({ path: `${output}/emr-rail-${mode}.png` });
    await host.locator('[data-workspace-close]').click();
    await expect(host).toHaveAttribute('role', 'region');
    await expect(host).not.toHaveAttribute('data-expanded', 'true');
    await expect(host).toBeVisible();
    await expect(open).toBeFocused();
    check(`${mode}: collapsing retains the same native practice session`, await retainedFrame.evaluate(element => element.isConnected && element === document.querySelector('#workspace-live-dialog iframe')) && await frame.locator('html').evaluate(() => performance.timeOrigin) === nativeTimeOrigin);
    check(`${mode}: host Close returns focus to product preview trigger`, true);
    check(`${mode}: no API, auth or protected workspace requests`, forbidden.length === 0, forbidden);
    check(`${mode}: no failed local asset responses`, failedLocal.length === 0, failedLocal);
    check(`${mode}: no runtime errors`, errors.length === 0, errors);
    await context.close();
  }
} catch (error) {
  checks.push({ name: 'run completed', pass: false, error: error.stack || String(error) });
  throw error;
} finally {
  await writeFile(`${output}/emr-results.json`, JSON.stringify(checks, null, 2) + '\n');
  await browser.close();
}
