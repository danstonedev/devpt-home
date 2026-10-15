import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  permitsDevPT,
  probeShowcase,
  releaseTargets,
} from "./wait-for-showcases.mjs";

const csp =
  "default-src 'self'; frame-ancestors 'self' https://devpt.app https://www.devpt.app; object-src 'none'";
test("every enforced framing policy must permit both homepage origins", () => {
  assert.equal(permitsDevPT(csp), true);
  for (const policy of [
    null,
    "frame-ancestors 'none'",
    "frame-ancestors 'self'",
    "frame-ancestors https://devpt.app",
    `${csp}, frame-ancestors 'none'`,
  ])
    assert.equal(permitsDevPT(policy), false);
});
test("an auth shell, error, redirect or other product cannot release the homepage", async () => {
  const product = {
    id: "emrs",
    showcase: { url: "https://simemr.devpt.app/showcase/" },
  };
  const response =
    (body, status = 200, policy = csp) =>
    async () =>
      new Response(body, {
        status,
        headers: { "content-security-policy": policy },
      });
  assert.equal(
    await probeShowcase(
      product,
      response('<meta content="emrs:v1" name="devpt-showcase">'),
    ),
    null,
  );
  assert.match(
    await probeShowcase(product, response("<title>Sign in</title>")),
    /not deployed/,
  );
  assert.match(
    await probeShowcase(
      product,
      response('<meta name="devpt-showcase" content="painmap:v1">'),
    ),
    /not deployed/,
  );
  assert.match(await probeShowcase(product, response("", 404)), /HTTP 404/);
  assert.match(await probeShowcase(product, response("", 301)), /HTTP 301/);
  assert.match(
    await probeShowcase(
      product,
      response(
        '<meta name="devpt-showcase" content="emrs:v1">',
        200,
        "frame-ancestors 'self'",
      ),
    ),
    /framing/,
  );
});

test("the older guided simLAB build cannot release the native workspace homepage", async () => {
  const registry = JSON.parse(
    readFileSync(new URL("../apps.json", import.meta.url)),
  );
  const targets = releaseTargets(registry);
  assert.deepEqual(
    new Set(targets.map((p) => p.id)),
    new Set(["simlab", "emrs", "painmap"]),
  );
  const simlab = targets.find((p) => p.id === "simlab");
  const response =
    (marker, policy = csp, status = 200) =>
    async (url) => {
      assert.equal(
        url,
        "https://lab.devpt.app/showcase/?presentation=workspace",
      );
      return new Response(`<meta name="devpt-showcase" content="${marker}">`, {
        status,
        headers: { "content-security-policy": policy },
      });
    };
  assert.match(
    await probeShowcase(simlab, response("simlab:v1")),
    /not deployed/,
  );
  assert.equal(
    await probeShowcase(simlab, response("simlab-workspace:v1")),
    null,
  );
  assert.match(
    await probeShowcase(
      simlab,
      response("simlab-workspace:v1", "frame-ancestors 'self'"),
    ),
    /framing/,
  );
  assert.match(
    await probeShowcase(simlab, response("simlab-workspace:v1", csp, 302)),
    /HTTP 302/,
  );
  const incomplete = structuredClone(registry);
  delete incomplete.productLines.find((p) => p.id === "simlab").showcase
    .workspace;
  assert.throws(
    () => releaseTargets(incomplete),
    /native simLAB workspace contract/,
  );
});
