import { expect, test } from "@playwright/test";

const homepageOrigin = "http://127.0.0.1:8109";
const products = [
  { id: "simlab", path: "/simlab/", name: "simLAB" },
  {
    id: "emrs",
    path: "/emrs/",
    name: "EMRs",
    origin: "https://simemr.devpt.app",
    localPort: 5181,
  },
  {
    id: "painmap",
    path: "/3dpain/",
    name: "3Dpain.app",
    origin: "https://www.3dpain.app",
    localPort: 5182,
  },
];

// This is only a postMessage probe. Product demonstrations are maintained and
// tested in their own repositories; these tests never substitute a copied UI.
const protocolFixture = `<!doctype html><html lang="en"><title>Protocol test fixture</title>
<body><p>Protocol test fixture</p><script>
window.receivedMessages = [];
addEventListener('message', function (event) {
  if (event.source === parent) window.receivedMessages.push(event.data);
});
</script></body></html>`;

function manifest(product = "emrs") {
  return {
    schemaVersion: 1,
    product,
    title: "Protocol test fixture",
    chapters: [
      { id: "first", label: "First chapter" },
      {
        id: "middle",
        label: "<b>Middle chapter</b>",
        cue: "A text-only chapter cue",
      },
      { id: "last", label: "Last chapter" },
    ],
  };
}

async function routeFixture(page, origin) {
  await page.route(`${origin}/showcase/**`, (route) =>
    route.fulfill({ contentType: "text/html", body: protocolFixture }),
  );
}

async function nativeFrame(page, origin) {
  const element = page.locator("[data-product-frame]");
  await element.scrollIntoViewIfNeeded();
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

async function post(page, frame, data) {
  // Wait for the parent's message handler to run, including rejection paths.
  // A negative assertion immediately after child.postMessage can otherwise
  // pass before the cross-origin message has reached the parent at all.
  await page.evaluate(
    ({ expected, origin }) => {
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
    { expected: JSON.stringify(data), origin: new URL(frame.url()).origin },
  );
  await frame.evaluate(
    ({ message, parentOrigin }) => parent.postMessage(message, parentOrigin),
    { message: data, parentOrigin: new URL(page.url()).origin },
  );
  await page.evaluate(() => window.protocolMessageObserved);
}

async function ready(page, frame, product = "emrs") {
  await post(page, frame, {
    type: "devpt-showcase-ready",
    manifest: manifest(product),
  });
  await expect(page.locator("[data-product-frame]")).toHaveAttribute(
    "data-ready",
    "true",
  );
}

async function expectNoHorizontalOverflow(page) {
  const result = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
  }));
  expect(
    result.width,
    `Page width ${result.width}px exceeds viewport ${result.viewport}px at ${page.url()}`,
  ).toBeLessThanOrEqual(result.viewport + 1);
}

test.beforeEach(async ({ page }) => {
  // Layout remains local and deterministic. No external product, analytics or
  // font network access is needed; protocol tests add their specific fixture.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === homepageOrigin
      ? route.continue()
      : route.abort("blockedbyclient"),
  );
});

test("the homepage introduces three distinct product lines and destinations", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/portfolio-home/);
  const cards = page.locator(".product-grid article[data-product]");
  await expect(cards).toHaveCount(3);
  const boxes = [];
  for (const product of products) {
    const card = page.locator(
      `.product-grid article[data-product="${product.id}"]`,
    );
    await expect(card.locator("h2")).toContainText(product.name);
    await expect(card.locator("a.product-walkthrough")).toHaveAttribute(
      "href",
      product.path,
    );
    await expect
      .poll(() => card.locator("img").evaluate((image) => image.naturalWidth))
      .toBeGreaterThan(0);
    boxes.push(await card.boundingBox());
  }
  if (testInfo.project.name === "phone") {
    expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height);
    expect(boxes[2].y).toBeGreaterThan(boxes[1].y + boxes[1].height);
  } else {
    expect(boxes[0].y).toBe(boxes[1].y);
    expect(boxes[1].y).toBe(boxes[2].y);
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
  }
  await expectNoHorizontalOverflow(page);
});

test("all four pages remain readable without horizontal overflow", async ({
  page,
}) => {
  for (const path of ["/", ...products.map((product) => product.path)]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("a.skip-link")).toHaveAttribute("href", "#main");
    await expect(page.locator("main#main")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  }
});

test("primary navigation reaches each product, including the phone menu", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "phone") {
    await page.locator(".nav-mobile summary").click();
    const nav = page.getByRole("navigation", {
      name: "Mobile primary",
      exact: true,
    });
    for (const product of products) {
      await expect(
        nav.getByRole("link", { name: product.name, exact: true }),
      ).toHaveAttribute("href", product.path);
    }
    await nav.getByRole("link", { name: "3Dpain.app", exact: true }).click();
    await expect(page).toHaveURL(/\/3dpain\/$/);
    await expect(page.locator(".nav-mobile")).not.toHaveAttribute("open", "");
    await expect(page.locator("main")).toHaveAttribute(
      "data-product-walkthrough",
      "painmap",
    );
  } else {
    const nav = page.getByRole("navigation", { name: "Primary", exact: true });
    for (const product of products) {
      await expect(
        nav.getByRole("link", { name: product.name, exact: true }),
      ).toBeVisible();
    }
    await nav.getByRole("link", { name: "EMRs", exact: true }).click();
    await expect(page).toHaveURL(/\/emrs\/$/);
  }
});

test("existing simLAB section bookmarks keep their destination", async ({
  page,
}) => {
  await page.goto("/?simlab=http://127.0.0.1:5180&discard=this#flow");
  await expect(page).toHaveURL(
    (url) => url.pathname === "/simlab/" && url.hash === "#flow",
  );
  expect(new URL(page.url()).searchParams.get("simlab")).toBe(
    "http://127.0.0.1:5180",
  );
  expect(new URL(page.url()).searchParams.has("discard")).toBe(false);
  await expect(page.locator("#flow")).toBeVisible();
});

test("native chapter navigation validates deep links, keyboard and child state without an echo", async ({
  page,
}) => {
  await routeFixture(page, products[1].origin);
  await page.goto("/emrs/?chapter=last");
  const frame = await nativeFrame(page, products[1].origin);
  await ready(page, frame);

  const rail = page.locator("[data-product-chapters]");
  await expect(rail.locator("button")).toHaveCount(3);
  await expect(rail.locator("b")).toHaveCount(0);
  await expect(rail.locator('[data-chapter="middle"]')).toContainText(
    "<b>Middle chapter</b>",
  );
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "last",
  );
  await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
    "href",
    `${products[1].origin}/showcase/?chapter=last`,
  );

  await rail.locator('[data-chapter="last"]').focus();
  await page.keyboard.press("ArrowRight");
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "first",
  );
  await page.keyboard.press("End");
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "last",
  );
  await page.keyboard.press("Home");
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "first",
  );
  await frame.waitForFunction(
    () =>
      receivedMessages.filter(
        (message) => message.type === "devpt-showcase-select",
      ).length >= 4,
  );

  await frame.evaluate(() => {
    receivedMessages = [];
  });
  await post(page, frame, { type: "devpt-showcase-state", chapter: "middle" });
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "middle",
  );
  await expect(page).toHaveURL(/\?chapter=middle$/);
  await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
    "href",
    `${products[1].origin}/showcase/?chapter=middle`,
  );
  // Flush earlier parent-to-child messages before asserting that no selection
  // was echoed. postMessage delivery is asynchronous across these origins.
  await page.evaluate((origin) => {
    document
      .querySelector("[data-product-frame]")
      .contentWindow.postMessage({ type: "protocol-delivery-fence" }, origin);
  }, products[1].origin);
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) => message.type === "protocol-delivery-fence",
    ),
  );
  expect(
    await frame.evaluate(
      () =>
        receivedMessages.filter(
          (message) => message.type === "devpt-showcase-select",
        ).length,
    ),
  ).toBe(0);

  await post(page, frame, {
    type: "devpt-showcase-state",
    chapter: "unlisted",
  });
  await expect(rail.locator('[aria-current="step"]')).toHaveAttribute(
    "data-chapter",
    "middle",
  );
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await frame.waitForFunction(() =>
    receivedMessages.some(
      (message) =>
        message.type === "devpt-showcase-visibility" &&
        message.visible === false,
    ),
  );
});

test("only the expected origin, actual frame and valid native manifest can activate chapters", async ({
  page,
}) => {
  await routeFixture(page, products[1].origin);
  await routeFixture(page, "https://untrusted.example");
  await page.goto("/emrs/");
  let frame = await nativeFrame(page, products[1].origin);
  const valid = manifest();
  const invalid = [
    { ...valid, product: "painmap" },
    { ...valid, schemaVersion: 2 },
    { ...valid, chapters: [valid.chapters[0], valid.chapters[0]] },
    { ...valid, chapters: [{ id: "<invalid>", label: "Invalid id" }] },
    {
      ...valid,
      chapters: Array.from({ length: 21 }, (_, index) => ({
        id: `chapter-${index}`,
        label: "Too many chapters",
      })),
    },
  ];
  for (const item of invalid) {
    await post(page, frame, { type: "devpt-showcase-ready", manifest: item });
  }
  await expect(page.locator("[data-product-frame]")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("[data-product-chapters] button")).toHaveCount(0);

  const nativeUrl = await page
    .locator("[data-product-frame]")
    .getAttribute("src");
  await page.evaluate((url) => {
    const sibling = document.createElement("iframe");
    sibling.id = "protocol-source-probe";
    sibling.src = url;
    document.body.append(sibling);
  }, nativeUrl);
  await expect
    .poll(() => page.frames().filter((item) => item.url() === nativeUrl).length)
    .toBe(2);
  const sibling = page
    .frames()
    .find((item) => item !== frame && item.url() === nativeUrl);
  await post(page, sibling, { type: "devpt-showcase-ready", manifest: valid });
  await expect(page.locator("[data-product-frame]")).not.toHaveAttribute(
    "data-ready",
    "true",
  );
  await page
    .locator("#protocol-source-probe")
    .evaluate((element) => element.remove());

  await page.locator("[data-product-frame]").evaluate((element) => {
    element.src = "https://untrusted.example/showcase/";
  });
  const wrongOrigin = await nativeFrame(page, "https://untrusted.example");
  await post(page, wrongOrigin, {
    type: "devpt-showcase-ready",
    manifest: valid,
  });
  await expect(page.locator("[data-product-frame]")).not.toHaveAttribute(
    "data-ready",
    "true",
  );

  await page.locator("[data-product-frame]").evaluate((element, url) => {
    element.src = url;
  }, nativeUrl);
  frame = await nativeFrame(page, products[1].origin);
  await ready(page, frame);
  await expect(page.locator("[data-product-chapters] button")).toHaveCount(3);
});

for (const product of products.filter((item) => item.localPort)) {
  test(`${product.name} allows only the assigned loopback preview endpoint`, async ({
    page,
  }) => {
    const localOrigin = `http://127.0.0.1:${product.localPort}`;
    await routeFixture(page, localOrigin);
    await page.goto(
      `${product.path}?${product.id}=${encodeURIComponent(localOrigin)}&chapter=unknown`,
    );
    const frame = await nativeFrame(page, localOrigin);
    await ready(page, frame, product.id);
    await expect(
      page.locator('[data-product-chapters] [aria-current="step"]'),
    ).toHaveAttribute("data-chapter", "first");
    await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
      "href",
      `${localOrigin}/showcase/?chapter=first`,
    );
  });

  test(`${product.name} ignores local overrides on the production homepage`, async ({
    page,
  }) => {
    // Serve the real local files under a production origin to exercise that
    // origin boundary without contacting or replacing the live website.
    await page.route("https://devpt.app/**", async (route) => {
      const url = new URL(route.request().url());
      const response = await page.request.get(
        `${homepageOrigin}${url.pathname}${url.search}`,
      );
      await route.fulfill({ response });
    });
    await routeFixture(page, product.origin);
    await page.goto(
      `https://devpt.app${product.path}?${product.id}=http://127.0.0.1:${product.localPort}`,
    );
    await nativeFrame(page, product.origin);
    await expect(page.locator("[data-product-frame]")).toHaveAttribute(
      "src",
      `${product.origin}/showcase/?embed=`,
    );
    await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
      "href",
      `${product.origin}/showcase/`,
    );
  });
}

test("a local override with the wrong port keeps the canonical native endpoint", async ({
  page,
}) => {
  await routeFixture(page, products[1].origin);
  await page.goto("/emrs/?emrs=http://127.0.0.1:5182");
  await nativeFrame(page, products[1].origin);
  await expect(page.locator("[data-product-frame]")).toHaveAttribute(
    "src",
    `${products[1].origin}/showcase/?embed=`,
  );
});

test("an untrusted registry endpoint retains the direct native fallback", async ({
  page,
}) => {
  await page.route("**/apps.json", (route) =>
    route.fulfill({
      json: {
        productLines: [
          {
            id: "emrs",
            showcase: { url: "https://untrusted.example/showcase/" },
          },
        ],
      },
    }),
  );
  await page.goto("/emrs/");
  await expect(page.locator("[data-product-status]")).toHaveAttribute(
    "data-state",
    "unavailable",
  );
  await expect(page.locator("[data-product-frame]")).not.toHaveAttribute("src");
  await expect(page.locator("[data-product-chapters] a")).toHaveAttribute(
    "href",
    `${products[1].origin}/showcase/`,
  );
  await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
    "href",
    `${products[1].origin}/showcase/`,
  );
});

test("a blocked embed exposes a visible connection fallback with a direct full view", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/emrs/#walkthrough");
  await page.locator("[data-product-frame]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-product-frame]")).toHaveAttribute(
    "src",
    `${products[1].origin}/showcase/?embed=`,
  );
  await page.clock.fastForward(16000);
  const status = page.locator("[data-product-status]");
  await status.scrollIntoViewIfNeeded();
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-state", "unavailable");
  await expect(status).toContainText(/Open the full view/);
  await expect(page.locator("[data-product-full-view]")).toHaveAttribute(
    "href",
    `${products[1].origin}/showcase/`,
  );
});
