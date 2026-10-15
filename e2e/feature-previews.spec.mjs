import { expect, test } from "@playwright/test";

const origin = "http://127.0.0.1:8109";
const productIds = ["emrs", "painmap"];

function figures(page, product) {
  return page.locator(
    `article[data-product="${product}"] [data-feature-preview]`,
  );
}

async function expectPlaying(video) {
  await expect
    .poll(() =>
      video.evaluate(
        (element) =>
          !element.paused &&
          element.currentTime > 0 &&
          element.readyState >= 2 &&
          element.videoWidth > 0,
      ),
    )
    .toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

test("screenshots stay primary and no clips load or play before a user asks", async ({
  page,
}) => {
  const clips = [];
  page.on("request", (request) => {
    if (/\/assets\/features\/.*\.mp4$/.test(new URL(request.url()).pathname))
      clips.push(request.url());
  });
  await page.goto("/");
  for (const product of productIds) {
    const group = figures(page, product);
    await expect(group).toHaveCount(3);
    for (const figure of await group.all()) {
      const image = figure.locator(".feature-still img");
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((element) => element.naturalWidth))
        .toBeGreaterThan(0);
      await expect(figure.locator("[data-feature-play]")).toBeVisible();
      await expect(figure.locator("[data-feature-play]")).toHaveText(
        "Play clip",
      );
      await expect(figure.locator("[data-feature-play]")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      await expect(figure.locator("[data-feature-video]")).toBeHidden();
      expect(
        await figure
          .locator("[data-feature-video]")
          .evaluate(
            (video) =>
              video.paused &&
              !video.autoplay &&
              !video.loop &&
              video.preload === "none",
          ),
      ).toBe(true);
    }
  }
  expect(clips).toEqual([]);
});

for (const product of productIds) {
  test(`${product} feature clips decode and play only after an explicit click`, async ({
    page,
  }) => {
    await page.goto("/");
    for (const figure of await figures(page, product).all()) {
      const button = figure.locator("[data-feature-play]");
      const video = figure.locator("[data-feature-video]");
      const still = figure.locator(".feature-still");
      await button.click();
      await expect(video).toBeVisible();
      await expect(still).toBeHidden();
      await expect(button).toHaveText("Show screenshot");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expectPlaying(video);
      expect(
        await video.evaluate(
          (element) =>
            element.controls && element.playsInline && element.duration > 0,
        ),
      ).toBe(true);
      await button.click();
      await expect(still).toBeVisible();
      await expect(video).toBeHidden();
      await expect(button).toHaveText("Play clip");
      expect(await video.evaluate((element) => element.paused)).toBe(true);
    }
  });
}

test("native playback pauses other clips and scrolling away never resumes them automatically", async ({
  page,
}) => {
  await page.goto("/");
  const group = figures(page, "emrs");
  const first = group.nth(0);
  const second = group.nth(1);
  const top = await first
    .locator(".feature-media")
    .evaluate((element) => element.getBoundingClientRect().top + scrollY);
  await page.evaluate((position) => scrollTo(0, position - 70), top);
  await first.locator("[data-feature-play]").click();
  await expectPlaying(first.locator("video"));
  await second.locator("[data-feature-play]").click();
  await expectPlaying(second.locator("video"));
  expect(await first.locator("video").evaluate((video) => video.paused)).toBe(
    true,
  );

  // The same native play event fires when a visitor uses the video's controls.
  await page.evaluate((position) => scrollTo(0, position - 70), top);
  await expect(first.locator(".feature-media")).toBeInViewport({ ratio: 0.1 });
  await expect(second.locator(".feature-media")).toBeInViewport({ ratio: 0.1 });
  await expectPlaying(second.locator("video"));
  await first.locator("video").evaluate((video) => video.play());
  await expectPlaying(first.locator("video"));
  expect(await second.locator("video").evaluate((video) => video.paused)).toBe(
    true,
  );
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => first.locator("video").evaluate((video) => video.paused))
    .toBe(true);
  await first.locator(".feature-media").scrollIntoViewIfNeeded();
  await expect(first.locator(".feature-media")).toBeInViewport();
  const pausedTime = await first
    .locator("video")
    .evaluate((video) => video.currentTime);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  expect(
    await first
      .locator("video")
      .evaluate((video) => video.paused && video.currentTime),
  ).toBe(pausedTime);

  await first.locator("video").evaluate((video) => video.play());
  await expectPlaying(first.locator("video"));
  // Isolate the browser-reported visibility event without depending on a
  // headless window manager's treatment of background tabs.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await first.locator("video").evaluate((video) => video.paused)).toBe(
    true,
  );
  await page.evaluate(() => {
    delete document.visibilityState;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await first.locator("video").evaluate((video) => video.paused)).toBe(
    true,
  );
});

test("reduced motion keeps still images until clicked and screenshot enlargement stays available", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const figure = figures(page, "painmap").first();
  const video = figure.locator("video");
  const still = figure.locator(".feature-still");
  await expect(still).toBeVisible();
  expect(
    await video.evaluate(
      (element) => element.paused && element.currentTime === 0,
    ),
  ).toBe(true);
  await figure.locator("[data-feature-play]").click();
  await expectPlaying(video);
  await figure.locator("[data-feature-play]").click();
  const imageUrl = new URL(await still.getAttribute("href"), origin).href;
  await still.click();
  const dialog = page.getByRole("dialog", {
    name: "Enlarged product screenshot",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("img")).toHaveAttribute("src", imageUrl);
  await expect
    .poll(() => dialog.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await dialog.getByRole("button", { name: /Close/ }).click();
  await expect(dialog).toBeHidden();
  await expect(still).toBeFocused();
});

test("a failed clip restores its usable screenshot and explains the fallback", async ({
  page,
}) => {
  await page.route("**/assets/features/emrs/*.mp4", (route) =>
    route.fulfill({ status: 404, body: "Missing clip" }),
  );
  await page.goto("/");
  const figure = figures(page, "emrs").first();
  await figure.locator("[data-feature-play]").click();
  await expect(figure.locator("[data-feature-status]")).toBeVisible();
  await expect(figure.locator("[data-feature-status]")).toContainText(
    "The screenshot is still available.",
  );
  await expect(figure.locator(".feature-still")).toBeVisible();
  await expect(figure.locator("video")).toBeHidden();
  await expect(figure.locator("[data-feature-play]")).toHaveText("Play clip");
  await figure.locator(".feature-still").click();
  await expect(
    page.getByRole("dialog", { name: "Enlarged product screenshot" }),
  ).toBeVisible();
});

test("a rejected play request also returns to the screenshot", async ({
  page,
}) => {
  await page.goto("/");
  const figure = figures(page, "painmap").first();
  // Exercise the browser's play-promise failure path independently of HTTP.
  await figure.locator("video").evaluate((video) => {
    video.play = () =>
      Promise.reject(new DOMException("Playback refused", "NotAllowedError"));
  });
  await figure.locator("[data-feature-play]").click();
  await expect(figure.locator("[data-feature-status]")).toBeVisible();
  await expect(figure.locator(".feature-still")).toBeVisible();
  await expect(figure.locator("video")).toBeHidden();
  await expect(figure.locator("[data-feature-play]")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("an external video source never replaces the native screenshot", async ({
  page,
}) => {
  await page.route(`${origin}/`, async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace(
        'src="/assets/features/emrs/workspace.mp4"',
        'src="https://untrusted.example/clip.mp4"',
      ),
    });
  });
  await page.goto("/");
  const figure = figures(page, "emrs").first();
  await expect(figure.locator("[data-feature-play]")).toBeHidden();
  await expect(figure.locator(".feature-still")).toBeVisible();
  await expect(figure.locator("video")).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("each native screenshot remains an ordinary usable image link", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-feature-preview]")).toHaveCount(6);
    await expect(page.locator("[data-feature-play]:visible")).toHaveCount(0);
    await expect(page.locator("[data-feature-video]:visible")).toHaveCount(0);
    for (const product of productIds) {
      for (const figure of await figures(page, product).all()) {
        const still = figure.locator(".feature-still");
        const image = still.locator("img");
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(() => image.evaluate((element) => element.naturalWidth))
          .toBeGreaterThan(0);
        await expect(still).toHaveAttribute(
          "href",
          await image.getAttribute("src"),
        );
      }
    }
    const still = figures(page, "painmap").first().locator(".feature-still");
    const destination = new URL(await still.getAttribute("href"), origin).href;
    await still.click();
    await expect(page).toHaveURL(destination);
  });
});
