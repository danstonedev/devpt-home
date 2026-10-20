#!/usr/bin/env node
/**
 * Validates apps.json (the DevPT hub catalog) and checks each listed app is
 * wired into the actual homepage renderer and reachable. Run by
 * .github/workflows/check-apps.yml.
 *
 *   node scripts/check-apps.mjs            # schema + page checks, then ping (warn-only)
 *   node scripts/check-apps.mjs --no-ping  # skip the network reachability check
 *   node scripts/check-apps.mjs --strict   # unreachable listed URLs become errors
 *
 * Exits non-zero on schema or page-consistency errors (ping failures only warn
 * unless --strict, so a transient outage or an intentionally-inert subdomain
 * does not break CI).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderProducts } from "./render-homepage.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const noPing = process.argv.includes("--no-ping");

const CATEGORIES = new Set([
  "research",
  "simulation",
  "imaging",
  "platform",
  "motion",
]);
const STATUSES = new Set(["live", "live-unlisted", "internal", "soon"]);
const PLACEMENTS = new Set(["hero", "nav", "plate", "footer"]);
const REQUIRED = [
  "id",
  "name",
  "tag",
  "footerLabel",
  "category",
  "url",
  "repo",
  "status",
  "blurb",
];

const errors = [];
const warnings = [];

let data;
try {
  data = JSON.parse(readFileSync(join(root, "apps.json"), "utf8"));
} catch (e) {
  console.error(`✗ apps.json is not valid JSON: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(data.apps)) {
  console.error('✗ apps.json must contain an "apps" array');
  process.exit(1);
}

const html = readFileSync(join(root, "index.html"), "utf8");
// The homepage is rendered by the same source used by the local site. Exercise
// its product route instead of treating an empty application shell as the UI.
// No teaching catalog, source application, browser, or network is needed here.
let productsHtml = '';
if (!html.includes('src="/site-bootstrap.js"') || !readFileSync(join(root, 'site-bootstrap.js'), 'utf8').includes("script('/teaching-library.js')")) errors.push('index.html must load the actual teaching-library.js renderer through its bootstrap');
if (!html.includes('id="app"')) errors.push('The homepage application mount is missing');
try { productsHtml = renderProducts(root); }
catch (error) { errors.push(`The homepage product route could not render: ${error.message}`); }
const productCards = new Map(
  [...productsHtml.matchAll(/<article\b([^>]*data-product="([^"]+)"[^>]*)>([\s\S]*?)<\/article>/g)]
    .map((match) => [match[2], { attributes: match[1], content: match[3] }]),
);
const ids = new Set();

for (const a of data.apps) {
  const id = a && typeof a.id === "string" ? a.id : "(missing id)";
  for (const k of REQUIRED) {
    if (typeof a[k] !== "string" || a[k].length === 0)
      errors.push(`${id}: "${k}" must be a non-empty string`);
  }
  if (ids.has(a.id)) errors.push(`${id}: duplicate id`);
  ids.add(a.id);
  if (typeof a.category === "string" && !CATEGORIES.has(a.category))
    errors.push(
      `${id}: category "${a.category}" not in {${[...CATEGORIES].join(", ")}}`,
    );
  if (typeof a.status === "string" && !STATUSES.has(a.status))
    errors.push(
      `${id}: status "${a.status}" not in {${[...STATUSES].join(", ")}}`,
    );
  if (typeof a.url === "string" && !/^https:\/\/\S+$/.test(a.url))
    errors.push(`${id}: url must be a valid https URL`);
  if (typeof a.repo === "string" && !/^danstonedev\/\S+$/.test(a.repo))
    warnings.push(
      `${id}: repo "${a.repo}" is not in the form danstonedev/<name>`,
    );
  if (!Array.isArray(a.placement) || a.placement.length === 0)
    errors.push(`${id}: "placement" must be a non-empty array`);
  else
    for (const p of a.placement)
      if (!PLACEMENTS.has(p))
        errors.push(
          `${id}: placement "${p}" not in {${[...PLACEMENTS].join(", ")}}`,
        );

  // Plate apps retain their stable anchor on a rendered product card. Its
  // actual product page must provide the canonical application destination.
  if (Array.isArray(a.placement) && a.placement.includes("plate")) {
    const product = Array.isArray(data.productLines)
      ? data.productLines.find((line) => line.appIds?.includes(a.id))
      : null;
    const card = product && productCards.get(product.id);
    if (!card?.attributes.includes(`id="app-${a.id}"`))
      errors.push(
        `${id}: placement includes "plate" but the rendered product card has no id="app-${a.id}"`,
      );
    if (product && typeof product.walkthrough === "string" && typeof a.url === "string") {
      const page = join(root, product.walkthrough.slice(1), "index.html");
      if (!existsSync(page) || !readFileSync(page, "utf8").includes(`href="${a.url}"`))
        errors.push(`${id}: its product page must link the canonical app ${a.url}`);
    }
  }
}

// Light checks on the auxiliary sections (urls may legitimately be TBD).
const productIds = new Set(["simlab", "emrs", "painmap"]);
if (
  !Array.isArray(data.productLines) ||
  data.productLines.length !== productIds.size
) {
  errors.push("The hub must declare all three product lines.");
} else {
  for (const product of data.productLines) {
    if (!productIds.delete(product.id))
      errors.push(`Unknown or duplicate product line: ${product.id}`);
    if (typeof product.name !== "string" || !product.name.trim())
      errors.push(`${product.id}: missing product name`);
    if (
      !Array.isArray(product.appIds) ||
      !product.appIds.length ||
      product.appIds.some((id) => !ids.has(id))
    ) {
      errors.push(
        `${product.id}: every product must reference registered applications`,
      );
    }
    if (
      typeof product.walkthrough !== "string" ||
      !/^\/[a-z0-9-]+\/$/.test(product.walkthrough)
    ) {
      errors.push(`${product.id}: walkthrough must be a local product page`);
      continue;
    }
    const productPage = join(root, product.walkthrough.slice(1), "index.html");
    if (!existsSync(productPage))
      errors.push(`${product.id}: walkthrough page is missing`);
    const card = productCards.get(product.id);
    if (!card || !card.content.includes(`href="${product.walkthrough}"`)) {
      errors.push(
        `${product.id}: the rendered homepage product card must visibly link its product walkthrough`,
      );
    }
    if (!html.includes(`href="${product.walkthrough}"`))
      errors.push(`${product.id}: the homepage must retain a product link when JavaScript is unavailable`);
    try {
      const source = new URL(product.showcase.url);
      const app = data.apps.find((app) => app.id === product.appIds[0]);
      if (
        source.origin !== new URL(app.url).origin ||
        source.pathname !== "/showcase/" ||
        source.search ||
        source.hash
      ) {
        errors.push(
          `${product.id}: showcase must belong to its canonical product origin`,
        );
      }
      if (
        !Number.isInteger(product.showcase.localPort) ||
        product.showcase.localPort < 5180 ||
        product.showcase.localPort > 5182
      ) {
        errors.push(`${product.id}: local showcase port is invalid`);
      }
      const workspace = product.showcase.workspace;
      const nativeUrl = new URL(workspace.url);
      const contract =
        product.id === "simlab"
          ? "simlab-ai-preview:v1"
          : `${product.id}-workspace:v1`;
      if (
        nativeUrl.origin !== source.origin ||
        nativeUrl.pathname !== source.pathname ||
        nativeUrl.search !== "?presentation=workspace" ||
        nativeUrl.hash ||
        workspace.contract !== contract ||
        (product.id === "simlab" &&
          (workspace.readiness?.url !==
            "https://lab.devpt.app/api/showcase/session" ||
            workspace.readiness.exchangeLimit !== 3))
      )
        errors.push(
          `${product.id}: native workspace URL or contract is invalid`,
        );
    } catch {
      errors.push(`${product.id}: invalid source-owned showcase URL`);
    }
  }
}

for (const u of data.unlisted || []) {
  if (!u.id || !u.repo)
    warnings.push(
      `unlisted entry missing id/repo: ${JSON.stringify(u).slice(0, 60)}`,
    );
}
for (const e of data.engines || []) {
  if (!e.id || !e.repo || !e.role)
    warnings.push(
      `engines entry missing id/repo/role: ${JSON.stringify(e).slice(0, 60)}`,
    );
}

async function ping(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "devpt-hub-check" },
    });
    return res.status;
  } catch {
    return 0;
  } finally {
    clearTimeout(timer);
  }
}

if (!noPing && typeof fetch === "function" && errors.length === 0) {
  console.log("Pinging listed app URLs…");
  for (const a of data.apps) {
    // Aliases are advertised URLs too, and until August 2026 nothing checked
    // them: `pain.devpt.app` sat in this file as PainMap's "resilient
    // alternate" while it was NXDOMAIN the whole time, because only `url` was
    // ever pinged. An alias nobody verifies is worse than no alias — it is a
    // URL the hub tells people to use.
    const targets = [
      { url: a.url, kind: "url" },
      ...(Array.isArray(a.aliases) ? a.aliases : []).map((url) => ({
        url,
        kind: "alias",
      })),
    ];
    for (const { url, kind } of targets) {
      if (typeof url !== "string" || !url) continue;
      // `redirect: "follow"` is deliberate: a 301 to a hostname that does not
      // resolve must fail here, not report the redirect's own 301 as healthy.
      const status = await ping(url);
      const ok = status >= 200 && status < 400;
      const label = kind === "alias" ? `${a.id} (alias)` : String(a.id);
      console.log(
        `  ${ok ? "✓" : "✗"} ${label.padEnd(18)} ${url} -> ${status || "unreachable"}`,
      );
      if (!ok)
        (strict ? errors : warnings).push(
          `${label}: ${url} returned ${status || "unreachable"}`,
        );
    }
  }
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (errors.length) {
  console.error("\nErrors:");
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error(`\n✗ apps.json check failed - ${errors.length} error(s).`);
  process.exit(1);
}
console.log(
  `\n✓ apps.json OK - ${data.apps.length} listed app(s), ${(data.unlisted || []).length} unlisted, ${warnings.length} warning(s).`,
);
