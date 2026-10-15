#!/usr/bin/env node
/** Release the hub only after both newly introduced native entries are deployed. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const parents = ["https://devpt.app", "https://www.devpt.app"];

export function permitsDevPT(csp) {
  if (!csp) return false;
  const ancestorPolicies = csp
    .split(",")
    .map((policy) => policy.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1])
    .filter(Boolean);
  return (
    ancestorPolicies.length > 0 &&
    ancestorPolicies.every((policy) => {
      const origins = policy.trim().split(/\s+/);
      return (
        !origins.includes("'none'") &&
        parents.every((origin) => origins.includes(origin))
      );
    })
  );
}

export async function probeShowcase(product, fetcher = fetch) {
  try {
    const response = await fetcher(product.showcase.url, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
      headers: {
        "user-agent": "devpt-showcase-release-check",
        "cache-control": "no-cache",
      },
    });
    if (response.status !== 200)
      return `${product.id}: HTTP ${response.status}`;
    if (!permitsDevPT(response.headers.get("content-security-policy")))
      return `${product.id}: DevPT framing is not enabled`;
    const html = await response.text();
    const marker = new RegExp(
      `<meta\\b(?=[^>]*\\bname=["']devpt-showcase["'])(?=[^>]*\\bcontent=["']${product.id}:v1["'])[^>]*>`,
      "i",
    );
    return marker.test(html)
      ? null
      : `${product.id}: the public walkthrough build is not deployed yet`;
  } catch (error) {
    return `${product.id}: ${error.name === "TimeoutError" ? "request timed out" : "entry not reachable"}`;
  }
}

export async function waitForShowcases(products, timeoutSeconds = 0) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (true) {
    const pending = (
      await Promise.all(products.map((product) => probeShowcase(product)))
    ).filter(Boolean);
    if (!pending.length) {
      console.log(
        "Both source-owned walkthroughs are deployed and allow DevPT framing.",
      );
      return true;
    }
    console.log(`Waiting for product deployments: ${pending.join("; ")}`);
    if (Date.now() >= deadline) return false;
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(15000, deadline - Date.now())),
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const registry = JSON.parse(
    readFileSync(new URL("../apps.json", import.meta.url), "utf8"),
  );
  const products = registry.productLines.filter((product) =>
    ["emrs", "painmap"].includes(product.id),
  );
  if (
    products.length !== 2 ||
    new Set(products.map((product) => product.id)).size !== 2
  )
    throw new Error("Both source-owned walkthroughs must be registered.");
  const timeout = Number(
    process.argv[process.argv.indexOf("--timeout-seconds") + 1] || 0,
  );
  const seconds = process.argv.includes("--timeout-seconds") ? timeout : 0;
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 1800)
    throw new Error("Release-check timeout must be 0–1800 seconds.");
  if (!(await waitForShowcases(products, seconds))) {
    console.error(
      "Product walkthroughs are not ready. The homepage upload must wait for their deployments.",
    );
    process.exitCode = 1;
  }
}
