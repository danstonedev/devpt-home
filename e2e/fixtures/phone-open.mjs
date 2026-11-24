// Owner direction, 23 November 2026: a phone no longer starts a resource's player by itself. In the phone project the
// person presses Open resource wherever a test's next step needs the player, so the existing player assertions keep
// running along the path a phone now takes. A test of the page before that press sets `autoOpen: false`.
import { test as base, expect } from '@playwright/test';

export { expect };
export const pressOpenResource = page =>
  page.addLocatorHandler(page.locator('[data-launch-native]'), button => button.click());
/** For a page a test opens itself, outside the `page` fixture. */
export const onPhonePressOpenResource = (page, info) =>
  info.project.name === 'phone' ? pressOpenResource(page) : undefined;
export const test = base.extend({
  autoOpen: [true, { option: true }],
  page: async ({ page, autoOpen }, use, info) => {
    if (autoOpen && info.project.name === 'phone') await pressOpenResource(page);
    await use(page);
  },
});
