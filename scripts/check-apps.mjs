#!/usr/bin/env node
/**
 * Validates apps.json (the DevPT hub catalog) and checks each listed app is
 * wired into index.html and reachable. Run by .github/workflows/check-apps.yml.
 *
 *   node scripts/check-apps.mjs            # schema + page checks, then ping (warn-only)
 *   node scripts/check-apps.mjs --no-ping  # skip the network reachability check
 *   node scripts/check-apps.mjs --strict   # unreachable listed URLs become errors
 *
 * Exits non-zero on schema or page-consistency errors (ping failures only warn
 * unless --strict, so a transient outage or an intentionally-inert subdomain
 * does not break CI).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const noPing = process.argv.includes("--no-ping");

const CATEGORIES = new Set(["research", "simulation", "imaging", "platform", "motion"]);
const STATUSES = new Set(["live", "live-unlisted", "internal", "soon"]);
const PLACEMENTS = new Set(["hero", "nav", "plate", "footer"]);
const REQUIRED = ["id", "name", "tag", "footerLabel", "category", "url", "repo", "status", "blurb"];

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
const ids = new Set();

for (const a of data.apps) {
  const id = a && typeof a.id === "string" ? a.id : "(missing id)";
  for (const k of REQUIRED) {
    if (typeof a[k] !== "string" || a[k].length === 0) errors.push(`${id}: "${k}" must be a non-empty string`);
  }
  if (ids.has(a.id)) errors.push(`${id}: duplicate id`);
  ids.add(a.id);
  if (typeof a.category === "string" && !CATEGORIES.has(a.category))
    errors.push(`${id}: category "${a.category}" not in {${[...CATEGORIES].join(", ")}}`);
  if (typeof a.status === "string" && !STATUSES.has(a.status))
    errors.push(`${id}: status "${a.status}" not in {${[...STATUSES].join(", ")}}`);
  if (typeof a.url === "string" && !/^https:\/\/\S+$/.test(a.url))
    errors.push(`${id}: url must be a valid https URL`);
  if (typeof a.repo === "string" && !/^danstonedev\/\S+$/.test(a.repo))
    warnings.push(`${id}: repo "${a.repo}" is not in the form danstonedev/<name>`);
  if (!Array.isArray(a.placement) || a.placement.length === 0)
    errors.push(`${id}: "placement" must be a non-empty array`);
  else for (const p of a.placement)
    if (!PLACEMENTS.has(p)) errors.push(`${id}: placement "${p}" not in {${[...PLACEMENTS].join(", ")}}`);

  // Page consistency: a "plate" app must have its <article id="app-<id>"> and link its url.
  if (Array.isArray(a.placement) && a.placement.includes("plate")) {
    if (!html.includes(`id="app-${a.id}"`))
      errors.push(`${id}: placement includes "plate" but index.html has no id="app-${a.id}"`);
    if (typeof a.url === "string" && !html.includes(a.url))
      warnings.push(`${id}: plate exists but index.html does not link ${a.url}`);
  }
}

// Light checks on the auxiliary sections (urls may legitimately be TBD).
for (const u of data.unlisted || []) {
  if (!u.id || !u.repo) warnings.push(`unlisted entry missing id/repo: ${JSON.stringify(u).slice(0, 60)}`);
}
for (const e of data.engines || []) {
  if (!e.id || !e.repo || !e.role) warnings.push(`engines entry missing id/repo/role: ${JSON.stringify(e).slice(0, 60)}`);
}

async function ping(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: ctrl.signal, headers: { "user-agent": "devpt-hub-check" } });
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
    if (typeof a.url !== "string" || !a.url) continue;
    const status = await ping(a.url);
    const ok = status >= 200 && status < 400;
    console.log(`  ${ok ? "✓" : "✗"} ${String(a.id).padEnd(10)} ${a.url} -> ${status || "unreachable"}`);
    if (!ok) (strict ? errors : warnings).push(`${a.id}: ${a.url} returned ${status || "unreachable"}`);
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
console.log(`\n✓ apps.json OK - ${data.apps.length} listed app(s), ${(data.unlisted || []).length} unlisted, ${warnings.length} warning(s).`);
