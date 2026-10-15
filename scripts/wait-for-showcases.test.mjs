import assert from "node:assert/strict";
import test from "node:test";
import { permitsDevPT, probeShowcase } from "./wait-for-showcases.mjs";

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
