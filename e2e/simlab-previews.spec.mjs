import { expect, test } from "@playwright/test";

const homepageOrigin = "http://127.0.0.1:8109";
const simlabOrigin = "https://lab.devpt.app";
const sections = ["interview", "reason", "examine"];
const build = "a".repeat(40);

// A message-only fixture exercises the host protocol, never an imitation of
// the product. Real workspace behavior is tested in the simLAB repository.
const fixture = `<!doctype html><html lang="en"><title>Protocol test fixture</title>
<body><p>Protocol test fixture</p><script>
window.receivedMessages = [];
addEventListener('message', function (event) {
  if (event.source === parent) receivedMessages.push(event.data);
});
addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !event.defaultPrevented)
    parent.postMessage({type:'simlab-workspace-close'}, new URL(document.referrer).origin);
});
</script></body></html>`;

function readyMessage() {
  return {
    type: "simlab-workspace-ready",
    build,
    manifest: {
      schemaVersion: 1,
      product: "simlab",
      presentation: "workspace",
      case: { patient: { id: "patient-james-morgan" } },
      sections: sections.map((id) => ({ id, label: `Protocol ${id}` })),
    },
  };
}

async function routeFixture(page, origin = simlabOrigin) {
  await page.route(`${origin}/showcase/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
}

async function frameFor(page, origin = simlabOrigin) {
  await expect
    .poll(() =>
      page
        .frames()
        .some((frame) => frame.url().startsWith(`${origin}/showcase/`)),
    )
    .toBe(true);
  const frame = page
    .frames()
    .find((item) => item.url().startsWith(`${origin}/showcase/`));
  await frame.waitForFunction(() => Array.isArray(window.receivedMessages));
  return frame;
}

async function post(page, frame, message) {
  // Acknowledge actual parent delivery before checking a rejection; otherwise
  // a negative assertion can pass before the cross-origin message arrives.
  await page.evaluate(
    ({ origin, expected }) => {
      window.protocolMessageObserved = new Promise((resolve) => {
        function observed(event) {
          if (
            event.origin !== origin ||
            JSON.stringify(event.data) !== expected
          )
            return;
          removeEventListener("message", observed);
          resolve();
        }
        addEventListener("message", observed);
      });
    },
    { origin: new URL(frame.url()).origin, expected: JSON.stringify(message) },
  );
  await frame.evaluate(
    ({ origin, message }) => parent.postMessage(message, origin),
    { origin: new URL(page.url()).origin, message },
  );
  await page.evaluate(() => window.protocolMessageObserved);
}

async function open(page, section = "interview", origin = simlabOrigin) {
  await page
    .locator(`[data-simlab-preview="${section}"] [data-simlab-try]`)
    .click();
  await expect(page.locator("#simlab-live-dialog")).toBeVisible();
  return frameFor(page, origin);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === homepageOrigin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

test("all three features open one usable live dialog only after a user action", async ({
  page,
}, testInfo) => {
  const requests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin === simlabOrigin)
      requests.push(request.url());
  });
  await routeFixture(page);
  await page.goto("/");
  const card = page.locator('[data-product="simlab"]');
  await expect(card.locator("[data-simlab-preview]")).toHaveCount(3);
  await expect(
    card.locator(".feature-gallery img, .feature-gallery video"),
  ).toHaveCount(0);
  await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(0);
  expect(requests).toEqual([]);

  for (const section of sections) {
    const trigger = page.locator(
      `[data-simlab-preview="${section}"] [data-simlab-try]`,
    );
    const frame = await open(page, section);
    await expect(page.locator(".simlab-live-notice")).toBeVisible();
    expect(new URL(frame.url()).searchParams.get("presentation")).toBe(
      "workspace",
    );
    expect(new URL(frame.url()).searchParams.get("section")).toBe(section);
    await post(page, frame, readyMessage());
    await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(1);
    await expect(page.locator("[data-simlab-live-frame]")).toHaveAttribute(
      "data-ready",
      "true",
    );
    await expect(page.locator(".simlab-live-notice")).toBeHidden();
    const viewport = page.viewportSize();
    const bounds = await page.locator("#simlab-live-dialog").boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.height).toBeLessThanOrEqual(viewport.height);
    const frameBounds = await page
      .locator("[data-simlab-live-frame]")
      .boundingBox();
    expect(frameBounds.width).toBeGreaterThan(viewport.width - 100);
    expect(frameBounds.height).toBeGreaterThan(400);
    if (section === "examine") {
      await frame.locator("body").click();
      if (testInfo.project.name === "phone") {
        // Mobile Chromium can wait forever for a hardware-key acknowledgment
        // when that event destroys its focused iframe. Exercise the same
        // frame-owned DOM event here; desktop covers hardware Escape below.
        await frame
          .locator("body")
          .dispatchEvent("keydown", { key: "Escape", bubbles: true });
      } else {
        await page.keyboard.press("Escape");
      }
    } else {
      await page.locator("[data-simlab-close]").click();
    }
    await expect(page.locator("#simlab-live-dialog")).toBeHidden();
    await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("a ready signal must match the workspace schema, case, origin and actual iframe", async ({
  page,
}) => {
  await routeFixture(page);
  await routeFixture(page, "https://untrusted.example");
  await page.goto("/");
  let frame = await open(page);
  const valid = readyMessage();
  const invalid = [
    { ...valid, type: "simlab-showcase-ready" },
    { ...valid, manifest: { ...valid.manifest, schemaVersion: 2 } },
    { ...valid, manifest: { ...valid.manifest, product: "emrs" } },
    { ...valid, manifest: { ...valid.manifest, presentation: "guided" } },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        case: { patient: { id: "another-patient" } },
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        sections: [
          valid.manifest.sections[0],
          valid.manifest.sections[0],
          valid.manifest.sections[2],
        ],
      },
    },
    {
      ...valid,
      manifest: {
        ...valid.manifest,
        sections: [
          { id: "interview", label: "" },
          ...valid.manifest.sections.slice(1),
        ],
      },
    },
    { ...valid, build: "not-a-build" },
  ];
  for (const message of invalid) {
    await post(page, frame, message);
    await expect(page.locator("[data-simlab-live-frame]")).not.toHaveAttribute(
      "data-ready",
      "true",
    );
  }
  const nativeUrl = await page
    .locator("[data-simlab-live-frame]")
    .getAttribute("src");
  await page.evaluate((url) => {
    const probe = document.createElement("iframe");
    probe.id = "protocol-source-probe";
    probe.src = url;
    document.body.append(probe);
  }, nativeUrl);
  await expect
    .poll(() => page.frames().filter((item) => item.url() === nativeUrl).length)
    .toBe(2);
  const sibling = page
    .frames()
    .find((item) => item !== frame && item.url() === nativeUrl);
  await post(page, sibling, valid);
  await expect(page.locator("[data-simlab-live-frame]")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .locator("#protocol-source-probe")
    .evaluate((element) => element.remove());

  await page.locator("[data-simlab-live-frame]").evaluate((element) => {
    element.src = "https://untrusted.example/showcase/";
  });
  await post(page, await frameFor(page, "https://untrusted.example"), valid);
  await expect(page.locator("[data-simlab-live-frame]")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.locator("[data-simlab-live-frame]").evaluate((element, url) => {
    element.src = url;
  }, nativeUrl);
  frame = await frameFor(page);
  await post(page, frame, valid);
  await expect(page.locator("[data-simlab-live-frame]")).toHaveAttribute(
    "data-ready",
    "true",
  );
});

test("native state stays authoritative and reduced motion never starts a walkthrough", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await routeFixture(page);
  await page.goto("/");
  const frame = await open(page);
  await post(page, frame, readyMessage());
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) => message.type === "simlab-workspace-select",
    ),
  );
  await frame.evaluate(() => {
    receivedMessages = [];
  });
  await post(page, frame, {
    type: "simlab-workspace-state",
    section: "reason",
  });
  await expect(page.locator("[data-simlab-full-view]")).toHaveAttribute(
    "href",
    `${simlabOrigin}/showcase/?presentation=workspace&section=reason`,
  );
  // Flush earlier parent messages before asserting that state caused no echo.
  await page.evaluate(
    (origin) =>
      document
        .querySelector("[data-simlab-live-frame]")
        .contentWindow.postMessage({ type: "protocol-delivery-fence" }, origin),
    simlabOrigin,
  );
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) => message.type === "protocol-delivery-fence",
    ),
  );
  expect(
    await frame.evaluate(() =>
      receivedMessages.some(
        (message) =>
          message.type === "simlab-workspace-select" || message.play === true,
      ),
    ),
  ).toBe(false);
  await post(page, frame, {
    type: "simlab-workspace-state",
    section: "unknown",
  });
  await expect(page.locator("[data-simlab-full-view]")).toHaveAttribute(
    "href",
    `${simlabOrigin}/showcase/?presentation=workspace&section=reason`,
  );

  await page.locator("[data-simlab-live-frame]").evaluate((element) => {
    element.style.transform = "translateY(200vh)";
  });
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) =>
        message.type === "simlab-workspace-visibility" &&
        message.visible === false,
    ),
  );
  await page.locator("[data-simlab-live-frame]").evaluate((element) => {
    element.style.transform = "";
  });
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) =>
        message.type === "simlab-workspace-visibility" &&
        message.visible === true,
    ),
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await frame.waitForFunction(
    () =>
      receivedMessages.at(-1)?.type === "simlab-workspace-visibility" &&
      receivedMessages.at(-1)?.visible === false,
  );
  await page.locator("[data-simlab-close]").click();
  await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(0);
});

test("only the assigned local endpoint can override a loopback preview", async ({
  page,
}) => {
  await routeFixture(page, "http://127.0.0.1:5180");
  await routeFixture(page);
  await page.goto("/?simlab=http://127.0.0.1:5180");
  const local = await open(page, "examine", "http://127.0.0.1:5180");
  await post(page, local, readyMessage());
  await expect(page.locator("[data-simlab-full-view]")).toHaveAttribute(
    "href",
    "http://127.0.0.1:5180/showcase/?presentation=workspace&section=examine",
  );
  await page.locator("[data-simlab-close]").click();
  await page.goto("/?simlab=http://127.0.0.1:5181");
  await open(page);
  await expect(page.locator("[data-simlab-live-frame]")).toHaveAttribute(
    "src",
    `${simlabOrigin}/showcase/?presentation=workspace&section=interview`,
  );
});

test("the production homepage ignores local source overrides", async ({
  page,
}) => {
  await page.route("https://devpt.app/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await page.request.get(
      `${homepageOrigin}${url.pathname}${url.search}`,
    );
    await route.fulfill({ response });
  });
  await routeFixture(page);
  await page.goto("https://devpt.app/?simlab=http://127.0.0.1:5180");
  await open(page);
  await expect(page.locator("[data-simlab-live-frame]")).toHaveAttribute(
    "src",
    `${simlabOrigin}/showcase/?presentation=workspace&section=interview`,
  );
});

test("an unavailable embed retains a direct workspace link and restores focus on close", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const trigger = page.locator(
    '[data-simlab-preview="interview"] [data-simlab-try]',
  );
  await trigger.click();
  await page.clock.fastForward(16000);
  await expect(page.locator("[data-simlab-status]")).toHaveAttribute(
    "data-state",
    "unavailable",
  );
  await expect(page.locator("[data-simlab-status]")).toContainText(
    "Open it directly",
  );
  await expect(page.locator(".simlab-live-notice")).toBeVisible();
  await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(0);
  await expect(page.locator("[data-simlab-full-view]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#simlab-live-dialog")).toBeHidden();
  await expect(trigger).toBeFocused();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("each feature links straight to its public native workspace", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("[data-simlab-try]:visible")).toHaveCount(0);
    await expect(page.locator("[data-simlab-live-frame]")).toHaveCount(0);
    for (const section of sections) {
      await expect(
        page.locator(`[data-simlab-preview="${section}"] [data-simlab-direct]`),
      ).toHaveAttribute(
        "href",
        `${simlabOrigin}/showcase/?presentation=workspace&section=${section}`,
      );
    }
  });
});
