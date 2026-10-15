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

function triggerFor(page, product, section) {
  return page.locator(
    `[data-product="${product.id}"] [data-workspace-preview="${section}"] [data-workspace-try]`,
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
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === homepageOrigin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

for (const product of products) {
  test.describe(product.id, () => {
    test("each feature opens one spacious native dialog after an explicit action", async ({
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
      if (product.id === "simlab") {
        await expect(card.locator(".simlab-case-label").first()).toHaveText(
          "Try 3 AI exchanges",
        );
        await expect(card.locator(".feature-gallery img")).toHaveCount(0);
      } else {
        await expect(card.locator("[data-workspace-launch] img")).toHaveCount(
          3,
        );
      }
      for (const section of product.sections) {
        const trigger = triggerFor(page, product, section);
        const frame = await open(page, product, section);
        await expect(page.locator(".workspace-live-notice")).toBeVisible();
        expect(frame.url()).toBe(workspaceUrl(product, section));
        await post(page, frame, readyMessage(product));
        const element = page.locator("[data-workspace-frame]");
        await expect(element).toHaveCount(1);
        await expect(element).toHaveAttribute("data-ready", "true");
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
          // Mobile Chromium can wait forever for a hardware-key ack when that
          // event destroys its focused iframe. Desktop covers hardware Escape.
          if (testInfo.project.name === "phone")
            await frame
              .locator("body")
              .dispatchEvent("keydown", { key: "Escape", bubbles: true });
          else await page.keyboard.press("Escape");
        } else await page.locator("[data-workspace-close]").click();
        await expect(page.locator("#workspace-live-dialog")).toBeHidden();
        await expect(element).toHaveCount(0);
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
        invalid.push(
          { ...valid, manifest: oldManifest },
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
      await post(page, frame, readyMessage(product));
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
      await page.locator("[data-workspace-frame]").evaluate((item) => {
        item.style.transform = "translateY(200vh)";
      });
      await frame.waitForFunction(
        (type) =>
          receivedMessages.some(
            (message) => message.type === type && message.visible === false,
          ),
        `${prefix}-visibility`,
      );
      await page.locator("[data-workspace-frame]").evaluate((item) => {
        item.style.transform = "";
      });
      await frame.waitForFunction(
        (type) =>
          receivedMessages.some(
            (message) => message.type === type && message.visible === true,
          ),
        `${prefix}-visibility`,
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
      );
      await page.locator("[data-workspace-close]").click();
      await expect(page.locator("[data-workspace-frame]")).toHaveCount(0);
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
      await page.goto("/");
      const trigger = triggerFor(page, product, product.sections[0]);
      await trigger.click();
      await page.clock.fastForward(16000);
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
      await expect(page.locator("#workspace-live-dialog")).toBeHidden();
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
  await expect(page.locator("[data-workspace-try]:visible")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.locator("[data-workspace-direct]")).toHaveCount(9);
  await expect(page.locator("[data-workspace-launch]")).toHaveCount(6);
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
  await expect(page.locator("[data-workspace-try]:visible")).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
  for (const product of products) {
    await expect(
      page
        .locator(`[data-product="${product.id}"] [data-workspace-direct]`)
        .first(),
    ).toHaveAttribute("href", workspaceUrl(product, product.sections[0]));
  }
});

test("launch posters open the native workspace and return focus to the poster", async ({
  page,
}) => {
  const product = products[1];
  await routeFixture(page, product);
  await page.goto("/");
  const poster = page
    .locator('[data-product="emrs"] [data-workspace-launch]')
    .first();
  await expect
    .poll(() => poster.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.locator('[data-product="emrs"] [data-workspace-try]').first(),
  ).toBeVisible();
  await poster.click();
  await post(page, await frameFor(page, product.origin), readyMessage(product));
  await expect(page.locator("[data-workspace-frame]")).toHaveCount(1);
  await page.locator("[data-workspace-close]").click();
  await expect(poster).toBeFocused();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("all nine features link straight to their public native workspaces", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.locator("[data-workspace-try]:visible, iframe, video"),
    ).toHaveCount(0);
    for (const product of products) {
      for (const section of product.sections) {
        await expect(
          page.locator(
            `[data-product="${product.id}"] [data-workspace-preview="${section}"] [data-workspace-direct]`,
          ),
        ).toHaveAttribute("href", workspaceUrl(product, section));
      }
    }
  });
});
