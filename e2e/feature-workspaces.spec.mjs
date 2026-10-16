import { expect, test } from "@playwright/test";

const homepageOrigin = "http://127.0.0.1:8109";
const build = "a".repeat(40);
const products = [
  {
    id: "simlab",
    origin: "https://lab.devpt.app",
    port: 5180,
    sections: ["interview", "reason", "examine"],
  },
  {
    id: "emrs",
    origin: "https://simemr.devpt.app",
    port: 5181,
    sections: ["documentation", "schedule", "feedback"],
  },
  {
    id: "painmap",
    origin: "https://www.3dpain.app",
    port: 5182,
    sections: ["mapping", "movement", "timeline"],
  },
];

// A message-only fixture exercises the host protocol, never an imitation of
// a product. Native workspace interactions are tested in their own repositories.
function fixture(product) {
  return `<!doctype html><html lang="en"><title>Protocol test fixture</title>
<body><p>Protocol test fixture</p><script>
window.receivedMessages = [];
addEventListener('message', function (event) {
  if (event.source === parent) receivedMessages.push(event.data);
});
addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && !event.defaultPrevented)
    parent.postMessage({type:'${product.id}-workspace-close'}, new URL(document.referrer).origin);
});
</script></body></html>`;
}

function readyMessage(product) {
  return {
    type: `${product.id}-workspace-ready`,
    build,
    manifest: {
      schemaVersion: 1,
      product: product.id,
      presentation: "workspace",
      ...(product.id === "simlab"
        ? {
            case: { patient: { id: "patient-james-morgan" } },
            patientConversation: {
              mode: "ai",
              exchangeLimit: 3,
              speech: "dictation-and-reply-audio",
            },
            patientPresentation: { readiness: "settled-scene" },
          }
        : {}),
      sections: product.sections.map((id) => ({ id, label: `Protocol ${id}` })),
    },
  };
}

async function routeFixture(page, product, origin = product.origin) {
  await page.route(`${origin}/showcase/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: fixture(product) }),
  );
}

async function frameFor(page, origin) {
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
  // Acknowledge delivery before negative assertions: otherwise a rejection
  // assertion could pass before the message even reaches the host.
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
    {
      origin: new URL(page.url()).origin,
      message,
    },
  );
  await page.evaluate(() => window.protocolMessageObserved);
}

let deliveryFence = 0;
async function flushHostMessages(page, frame, origin) {
  const token = ++deliveryFence;
  await page.locator("[data-workspace-frame]").evaluate((iframe, { origin, token }) => {
    iframe.contentWindow.postMessage({ type: "protocol-delivery-fence", token }, origin);
  }, { origin, token });
  await frame.waitForFunction(token => receivedMessages.some(message => message.type === "protocol-delivery-fence" && message.token === token), token);
}

function triggerFor(page, product, section) {
  return page.locator(
    `[data-product="${product.id}"] [data-workspace-preview="${section}"] [data-workspace-expand]`,
  );
}

function posterFor(page, product, section) {
  return page.locator(
    `[data-product="${product.id}"] [data-workspace-preview="${section}"] [data-workspace-launch]`,
  );
}

async function present(page, frame, product, section = product.sections[0]) {
  await post(page, frame, readyMessage(product));
  if (product.id === "simlab")
    await post(page, frame, {
      type: "simlab-workspace-patient-state",
      section,
      state: "ready",
    });
  await expect(page.locator("[data-workspace-frame]")).toHaveAttribute(
    "data-visual-ready", "true",
  );
}

async function open(
  page,
  product,
  section = product.sections[0],
  origin = product.origin,
) {
  await triggerFor(page, product, section).click();
  await expect(page.locator("#workspace-live-dialog")).toBeVisible();
  await expect(page.locator("#workspace-live-dialog")).toHaveAttribute(
    "data-expanded", "true",
  );
  return frameFor(page, origin);
}

function workspaceUrl(product, section, origin = product.origin) {
  return `${origin}/showcase/?presentation=workspace&section=${section}`;
}

async function serveProductionHome(page) {
  await page.route("https://devpt.app/**", async (route) => {
    const url = new URL(route.request().url());
    const response = await page.request.get(
      `${homepageOrigin}${url.pathname}${url.search}`,
    );
    await route.fulfill({ response });
  });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === homepageOrigin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

for (const product of products) {
  test.describe(product.id, () => {
    test("each feature reveals its native site inline and expands the same frame", async ({
      page,
    }, testInfo) => {
      const requests = [];
      page.on("request", (request) => {
        if (
          products.some((item) => new URL(request.url()).origin === item.origin)
        )
          requests.push(request.url());
      });
      await routeFixture(page, product);
      await page.goto("/");
      const card = page.locator(`[data-product="${product.id}"]`);
      await expect(card.locator("[data-workspace-preview]")).toHaveCount(3);
      await expect(
        page.locator("video, [data-enlarge], [data-workspace-frame]"),
      ).toHaveCount(0);
      expect(requests).toEqual([]);
      await expect(card.locator("[data-workspace-launch] img")).toHaveCount(3);
      await expect(card.locator("[data-workspace-try], [data-workspace-direct]")).toHaveCount(0);
      for (const section of product.sections) {
        const trigger = triggerFor(page, product, section);
        const poster = posterFor(page, product, section);
        await poster.scrollIntoViewIfNeeded();
        await expect.poll(() => poster.locator("img").evaluate(image => image.naturalWidth)).toBeGreaterThan(0);
        await poster.click();
        const frame = await frameFor(page, product.origin);
        const surface = page.locator("#workspace-live-dialog");
        await expect(surface).toHaveAttribute("role", "region");
        await expect(page.locator(".workspace-live-notice")).toBeVisible();
        expect(frame.url()).toBe(workspaceUrl(product, section));
        await present(page, frame, product, section);
        const element = page.locator("[data-workspace-frame]");
        await expect(element).toHaveCount(1);
        await expect(element).toHaveAttribute("data-ready", "true");
        const retained = await element.elementHandle();
        const policy = await element.evaluate(
          (iframe, origin) => ({
            expected: iframe.featurePolicy.allowsFeature("microphone", origin),
            unrelated: iframe.featurePolicy.allowsFeature(
              "microphone",
              "https://untrusted.example",
            ),
          }),
          product.origin,
        );
        expect(policy).toEqual({
          expected: product.id === "simlab",
          unrelated: false,
        });
        await expect(page.locator(".workspace-live-notice")).toBeHidden();
        await flushHostMessages(page, frame, product.origin);
        const beforeExpand = await frame.evaluate(() => receivedMessages.filter(message => message.type.endsWith("-select")).length);
        await trigger.click();
        await expect(surface).toHaveAttribute("role", "dialog");
        await expect(surface).toHaveAttribute("data-expanded", "true");
        await flushHostMessages(page, frame, product.origin);
        expect(await retained.evaluate(iframe => iframe === document.querySelector("[data-workspace-frame]") && iframe.isConnected)).toBe(true);
        expect(await frame.evaluate(() => receivedMessages.filter(message => message.type.endsWith("-select")).length)).toBe(beforeExpand);
        const viewport = page.viewportSize();
        const bounds = await page
          .locator("#workspace-live-dialog")
          .boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.width).toBeLessThanOrEqual(viewport.width);
        expect(bounds.height).toBeLessThanOrEqual(viewport.height);
        const frameBounds = await element.boundingBox();
        expect(frameBounds.width).toBeGreaterThan(viewport.width - 100);
        expect(frameBounds.height).toBeGreaterThan(400);
        if (section === product.sections.at(-1)) {
          await frame.locator("body").click();
          // Desktop covers hardware Escape; phone coverage also exercises the
          // native source-to-parent close request without a hardware keyboard.
          if (testInfo.project.name === "phone")
            await frame
              .locator("body")
              .dispatchEvent("keydown", { key: "Escape", bubbles: true });
          else await page.keyboard.press("Escape");
        } else await page.locator("[data-workspace-close]").click();
        await expect(surface).toHaveAttribute("role", "region");
        await expect(surface).not.toHaveAttribute("data-expanded", "true");
        await expect(surface).toBeVisible();
        await expect(element).toHaveCount(1);
        await flushHostMessages(page, frame, product.origin);
        expect(await retained.evaluate(iframe => iframe === document.querySelector("[data-workspace-frame]") && iframe.isConnected)).toBe(true);
        expect(await frame.evaluate(() => receivedMessages.filter(message => message.type.endsWith("-select")).length)).toBe(beforeExpand);
        await expect(trigger).toBeFocused();
      }
    });

    test("ready requires the expected schema, product, origin and actual iframe", async ({
      page,
    }) => {
      await routeFixture(page, product);
      await routeFixture(page, product, "https://untrusted.example");
      await page.goto("/");
      let frame = await open(page, product);
      const valid = readyMessage(product);
      const invalid = [
        { ...valid, type: "devpt-showcase-ready" },
        { ...valid, manifest: { ...valid.manifest, schemaVersion: 2 } },
        {
          ...valid,
          manifest: { ...valid.manifest, product: "another-product" },
        },
        { ...valid, manifest: { ...valid.manifest, presentation: "guided" } },
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
              { id: product.sections[0], label: "" },
              ...valid.manifest.sections.slice(1),
            ],
          },
        },
        {
          ...valid,
          manifest: {
            ...valid.manifest,
            sections: [
              { id: product.sections[0], label: "bad\nlabel" },
              ...valid.manifest.sections.slice(1),
            ],
          },
        },
        { ...valid, build: "not-a-build" },
      ];
      if (product.id === "simlab") {
        const oldManifest = { ...valid.manifest };
        delete oldManifest.patientConversation;
        const withoutPresentation = { ...valid.manifest };
        delete withoutPresentation.patientPresentation;
        invalid.push(
          { ...valid, manifest: oldManifest },
          { ...valid, manifest: withoutPresentation },
          { ...valid, manifest: { ...valid.manifest, patientPresentation: { readiness: "document" } } },
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
              patientConversation: {
                ...valid.manifest.patientConversation,
                exchangeLimit: 4,
              },
            },
          },
          {
            ...valid,
            manifest: {
              ...valid.manifest,
              patientConversation: {
                ...valid.manifest.patientConversation,
                speech: "text-only",
              },
            },
          },
        );
      }
      const element = page.locator("[data-workspace-frame]");
      for (const message of invalid) {
        await post(page, frame, message);
        await expect(element).not.toHaveAttribute("data-ready", "true");
      }
      const nativeUrl = await element.getAttribute("src");
      await page.evaluate((url) => {
        const probe = document.createElement("iframe");
        probe.id = "protocol-source-probe";
        probe.src = url;
        document.body.append(probe);
      }, nativeUrl);
      await expect
        .poll(
          () => page.frames().filter((item) => item.url() === nativeUrl).length,
        )
        .toBe(2);
      const sibling = page
        .frames()
        .find((item) => item !== frame && item.url() === nativeUrl);
      await sibling.waitForFunction(() =>
        Array.isArray(window.receivedMessages),
      );
      await post(page, sibling, valid);
      await expect(element).not.toHaveAttribute("data-ready", "true");
      await page
        .locator("#protocol-source-probe")
        .evaluate((item) => item.remove());
      await element.evaluate((item) => {
        item.src = "https://untrusted.example/showcase/";
      });
      await post(
        page,
        await frameFor(page, "https://untrusted.example"),
        valid,
      );
      await expect(element).not.toHaveAttribute("data-ready", "true");
      await element.evaluate((item, url) => {
        item.src = url;
      }, nativeUrl);
      frame = await frameFor(page, product.origin);
      await post(page, frame, valid);
      await expect(element).toHaveAttribute("data-ready", "true");
    });

    test("native state is authoritative and hidden workspaces pause without autoplay", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await routeFixture(page, product);
      await page.goto("/");
      const frame = await open(page, product);
      await present(page, frame, product);
      const prefix = `${product.id}-workspace`;
      await frame.waitForFunction(
        (type) => receivedMessages.some((message) => message.type === type),
        `${prefix}-select`,
      );
      await frame.evaluate(() => {
        receivedMessages = [];
      });
      await post(page, frame, {
        type: `${prefix}-state`,
        section: product.sections[1],
      });
      await expect(page.locator("[data-workspace-full-view]")).toHaveAttribute(
        "href",
        workspaceUrl(product, product.sections[1]),
      );
      // Flush host messages before checking that state never causes an echo.
      await page.locator("[data-workspace-frame]").evaluate((item, origin) => {
        item.contentWindow.postMessage(
          { type: "protocol-delivery-fence" },
          origin,
        );
      }, product.origin);
      await frame.waitForFunction(() =>
        receivedMessages.some(
          (message) => message.type === "protocol-delivery-fence",
        ),
      );
      expect(
        await frame.evaluate(
          (type) =>
            receivedMessages.some(
              (message) => message.type === type || message.play === true,
            ),
          `${prefix}-select`,
        ),
      ).toBe(false);
      await post(page, frame, { type: `${prefix}-state`, section: "unknown" });
      await expect(page.locator("[data-workspace-full-view]")).toHaveAttribute(
        "href",
        workspaceUrl(product, product.sections[1]),
      );
      // Visibility belongs to the card's media slot. A fixed expanded frame
      // must not make its offscreen inline owner count as visible forever.
      await page.locator("[data-workspace-close]").click();
      const media = page.locator(`[data-product="${product.id}"] [data-workspace-preview="${product.sections[0]}"] .feature-media`);
      await media.evaluate((item) => {
        item.style.transform = "translateY(200vh)";
      });
      await frame.waitForFunction(
        (type) =>
          receivedMessages.some(
            (message) => message.type === type && message.visible === false,
          ),
        `${prefix}-visibility`,
        { polling: 100 },
      );
      await media.evaluate((item) => {
        item.style.transform = "";
      });
      await frame.waitForFunction(
        (type) =>
          receivedMessages.some(
            (message) => message.type === type && message.visible === true,
          ),
        `${prefix}-visibility`,
        { polling: 100 },
      );
      await page.evaluate(() => {
        Object.defineProperty(document, "visibilityState", {
          configurable: true,
          value: "hidden",
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await frame.waitForFunction(
        (type) =>
          receivedMessages.at(-1)?.type === type &&
          receivedMessages.at(-1)?.visible === false,
        `${prefix}-visibility`,
        { polling: 100 },
      );
      await expect(page.locator("[data-workspace-frame]")).toHaveCount(1);
      await expect(page.locator("#workspace-live-dialog")).toHaveAttribute("role", "region");
    });

    test("assigned loopback overrides work and production ignores all overrides", async ({
      page,
    }) => {
      const localOrigin = `http://127.0.0.1:${product.port}`;
      await routeFixture(page, product, localOrigin);
      await routeFixture(page, product);
      await page.goto(`/?${product.id}=${localOrigin}`);
      const local = await open(page, product, product.sections[2], localOrigin);
      await post(page, local, readyMessage(product));
      await expect(page.locator("[data-workspace-full-view]")).toHaveAttribute(
        "href",
        workspaceUrl(product, product.sections[2], localOrigin),
      );
      await page.locator("[data-workspace-close]").click();
      await page.goto(`/?${product.id}=http://127.0.0.1:5999`);
      await open(page, product);
      await expect(page.locator("[data-workspace-frame]")).toHaveAttribute(
        "src",
        workspaceUrl(product, product.sections[0]),
      );
      await page.locator("[data-workspace-close]").click();
      await page.goto(`/?${product.id}=invalid-url`);
      await open(page, product);
      await expect(page.locator("[data-workspace-frame]")).toHaveAttribute(
        "src",
        workspaceUrl(product, product.sections[0]),
      );
      await page.locator("[data-workspace-close]").click();
      await serveProductionHome(page);
      await page.goto(`https://devpt.app/?${product.id}=${localOrigin}`);
      await open(page, product);
      await expect(page.locator("[data-workspace-frame]")).toHaveAttribute(
        "src",
        workspaceUrl(product, product.sections[0]),
      );
    });

    test("blocked embeds retain a direct fallback and restore focus", async ({
      page,
    }) => {
      await page.clock.install();
      await routeFixture(page, product);
      await page.goto("/");
      const trigger = triggerFor(page, product, product.sections[0]);
      await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10000));
      await trigger.click();
      await page.clock.fastForward(14999);
      await expect(page.locator("[data-workspace-status]")).not.toHaveAttribute("data-state", "unavailable");
      await page.clock.fastForward(1001);
      await expect(page.locator("[data-workspace-status]")).toHaveAttribute(
        "data-state",
        "unavailable",
      );
      await expect(page.locator("[data-workspace-status]")).toContainText(
        "Open it directly",
      );
      await expect(page.locator(".workspace-live-notice")).toBeVisible();
      await expect(page.locator("[data-workspace-frame]")).toHaveCount(0);
      await expect(page.locator("[data-workspace-full-view]")).toBeVisible();
      await expect(page.locator("[data-workspace-full-view]")).toHaveAttribute(
        "href",
        workspaceUrl(product, product.sections[0]),
      );
      await page.keyboard.press("Escape");
      await expect(page.locator("#workspace-live-dialog")).toHaveAttribute("role", "region");
      await expect(page.locator("#workspace-live-dialog")).not.toHaveAttribute("data-expanded", "true");
      await expect(trigger).toBeFocused();
    });
  });
}

test("registry failure preserves static links and creates no iframe", async ({
  page,
}) => {
  await page.route("**/apps.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.locator("[data-workspace-expand]:visible")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("[data-workspace-launch]")).toHaveCount(9);
  await expect(page.locator("[data-workspace-launch] img")).toHaveCount(9);
});

test("registry cannot redirect trust or substitute an old workspace contract", async ({
  page,
}) => {
  const catalog = await (
    await page.request.get(`${homepageOrigin}/apps.json`)
  ).json();
  catalog.productLines.find(
    (item) => item.id === "simlab",
  ).showcase.workspace.contract = "simlab-workspace:v1";
  catalog.productLines.find(
    (item) => item.id === "emrs",
  ).showcase.workspace.url =
    "https://untrusted.example/showcase/?presentation=workspace";
  const pain = catalog.productLines.find((item) => item.id === "painmap");
  catalog.productLines.push(structuredClone(pain));
  await page.route("**/apps.json", (route) => route.fulfill({ json: catalog }));
  await page.goto("/");
  await expect(page.locator("[data-workspace-expand]:visible")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  for (const product of products) {
    await expect(
      page
        .locator(`[data-product="${product.id}"] [data-workspace-launch]`)
        .first(),
    ).toHaveAttribute("href", workspaceUrl(product, product.sections[0]));
  }
});

test("a launch poster activates inline and its corner control returns focus on collapse", async ({
  page,
}) => {
  const product = products[1];
  await routeFixture(page, product);
  await page.goto("/");
  const poster = page
    .locator('[data-product="emrs"] [data-workspace-launch]')
    .first();
  await poster.scrollIntoViewIfNeeded();
  await expect
    .poll(() => poster.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.locator('[data-product="emrs"] [data-workspace-expand]').first(),
  ).toBeVisible();
  await poster.click();
  await present(page, await frameFor(page, product.origin), product);
  await expect(page.locator("[data-workspace-frame]")).toHaveCount(1);
  const corner = triggerFor(page, product, product.sections[0]);
  await corner.click();
  await page.locator("[data-workspace-close]").click();
  await expect(corner).toBeFocused();
  await expect(page.locator("[data-workspace-frame]")).toHaveCount(1);
  await expect(page.locator("#workspace-live-dialog")).toHaveAttribute("role", "region");
});

test("simLAB keeps its poster until the current native section reports a settled scene", async ({ page }) => {
  const product = products[0];
  await routeFixture(page, product);
  await page.goto("/");
  const frame = await open(page, product);
  const element = page.locator("[data-workspace-frame]");
  const scene = { type: "simlab-workspace-patient-state", section: "interview", state: "ready" };
  await post(page, frame, scene);
  await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  await post(page, frame, readyMessage(product));
  await expect(element).toHaveAttribute("data-ready", "true");
  await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  await expect(page.locator(".workspace-live-notice")).toBeVisible();
  for (const invalid of [
    null, [], "ready",
    { ...scene, section: "reason" },
    { ...scene, section: "unknown" },
    { ...scene, state: true },
    { ...scene, state: "settled" },
    { ...scene, state: "loading" },
  ]) {
    await post(page, frame, invalid);
    await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  }
  const nativeUrl = await element.getAttribute("src");
  await page.evaluate(url => {
    const sibling = document.createElement("iframe");
    sibling.id = "presentation-source-probe"; sibling.src = url; document.body.append(sibling);
  }, nativeUrl);
  await expect.poll(() => page.frames().filter(item => item.url() === nativeUrl).length).toBe(2);
  const sibling = page.frames().find(item => item !== frame && item.url() === nativeUrl);
  await sibling.waitForFunction(() => Array.isArray(window.receivedMessages));
  await post(page, sibling, scene);
  await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  await page.locator("#presentation-source-probe").evaluate(item => item.remove());
  await post(page, frame, scene);
  await expect(element).toHaveAttribute("data-visual-ready", "true");
  await expect(page.locator(".workspace-live-notice")).toBeHidden();
  await post(page, frame, { type: "simlab-workspace-state", section: "reason" });
  await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  await post(page, frame, scene); // A late receipt from the retired Interview.
  await expect(element).not.toHaveAttribute("data-visual-ready", "true");
  await post(page, frame, { ...scene, section: "reason" });
  await expect(element).toHaveAttribute("data-visual-ready", "true");
});

test("an unavailable native scene keeps the website poster and direct fallback usable", async ({ page }) => {
  const product = products[0];
  await routeFixture(page, product);
  await page.goto("/");
  const frame = await open(page, product);
  await post(page, frame, readyMessage(product));
  await post(page, frame, { type: "simlab-workspace-patient-state", section: "interview", state: "unavailable" });
  await expect(page.locator("[data-workspace-status]")).toHaveAttribute("data-state", "unavailable");
  await expect(page.locator("[data-workspace-full-view]")).toBeVisible();
  await expect(page.locator("[data-workspace-full-view]")).toHaveAttribute("href", workspaceUrl(product, "interview"));
  await expect(posterFor(page, product, "interview").locator("img")).toBeVisible();
  await expect(page.locator("[data-workspace-frame][data-visual-ready=true]")).toHaveCount(0);
});

test("normal motion warms only one visible preview and parks it with its card", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", {
    configurable: true, value: { saveData: false, effectiveType: "4g" },
  }));
  const requests = [];
  page.on("request", request => {
    if (products.some(product => new URL(request.url()).origin === product.origin)) requests.push(request.url());
  });
  for (const product of products) await routeFixture(page, product);
  await page.goto("/");
  const media = page.locator('[data-product="simlab"] [data-workspace-preview="interview"] .feature-media');
  await media.scrollIntoViewIfNeeded();
  const frame = await frameFor(page, products[0].origin);
  await present(page, frame, products[0]);
  const element = page.locator("[data-workspace-frame]");
  const retained = await element.elementHandle();
  await expect(element).toHaveCount(1);
  expect(requests).toEqual([workspaceUrl(products[0], "interview")]);
  await page.locator('[data-product="painmap"] [data-workspace-preview="timeline"] .feature-media').scrollIntoViewIfNeeded();
  // A tall desktop can show parts of the first and final rows together.
  // Move the actual observed card fully out of view, rather than assuming
  // scrolling to another preview necessarily hides this one completely.
  await media.evaluate(item => { item.style.transform = "translateY(200vh)"; });
  await frame.waitForFunction(() => receivedMessages.some(message => message.type === "simlab-workspace-visibility" && message.visible === false), undefined, { polling: 100 });
  await expect(element).toHaveCount(1);
  expect(await retained.evaluate(iframe => iframe.isConnected && iframe === document.querySelector("[data-workspace-frame]"))).toBe(true);
  expect(requests).toEqual([workspaceUrl(products[0], "interview")]);
  await media.evaluate(item => { item.style.transform = ""; });
  await media.scrollIntoViewIfNeeded();
  await frame.waitForFunction(() => receivedMessages.at(-1)?.type === "simlab-workspace-visibility" && receivedMessages.at(-1)?.visible === true, undefined, { polling: 100 });
});

for (const connection of [{ saveData: true, effectiveType: "4g" }, { saveData: false, effectiveType: "2g" }]) {
  test(`automatic preview preparation respects ${connection.saveData ? "data saving" : "a slow connection"}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(connection => Object.defineProperty(navigator, "connection", { configurable: true, value: connection }), connection);
    await page.clock.install();
    await routeFixture(page, products[0]);
    await page.goto("/");
    await page.locator('[data-product="simlab"] .feature-media').first().scrollIntoViewIfNeeded();
    await page.clock.fastForward(16000);
    await expect(page.locator("[data-workspace-frame]")).toHaveCount(0);
    const frame = await open(page, products[0]);
    await present(page, frame, products[0]);
    await expect(page.locator("[data-workspace-frame]")).toHaveCount(1);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("all nine features link straight to their public native workspaces", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.locator("[data-workspace-expand]:visible, iframe, video"),
    ).toHaveCount(0);
    for (const product of products) {
      for (const section of product.sections) {
        await expect(
          page.locator(
            `[data-product="${product.id}"] [data-workspace-preview="${section}"] [data-workspace-launch]`,
          ),
        ).toHaveAttribute("href", workspaceUrl(product, section));
      }
    }
  });
});
