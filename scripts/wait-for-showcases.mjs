#!/usr/bin/env node
/** Release the hub only after all required source-owned entries are deployed. */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const parents = ["https://devpt.app", "https://www.devpt.app"];

export function releaseTargets(registry) {
  const ids = ["simlab", "emrs", "painmap"];
  const products = registry.productLines.filter((product) =>
    ids.includes(product.id),
  );
  if (products.length !== 3 || new Set(products.map((p) => p.id)).size !== 3)
    throw new Error(
      "All three source-owned product entries must be registered.",
    );
  return products.map((product) => {
    if (product.id !== "simlab") return product;
    const workspace = product.showcase.workspace;
    if (
      workspace?.url !==
        "https://lab.devpt.app/showcase/?presentation=workspace" ||
      workspace.contract !== "simlab-workspace:v1"
    )
      throw new Error(
        "The native simLAB workspace contract must be registered.",
      );
    return { ...product, showcase: workspace };
  });
}

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
    const contract = product.showcase.contract || `${product.id}:v1`;
    const literal = contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const marker = new RegExp(
      `<meta\\b(?=[^>]*\\bname=["']devpt-showcase["'])(?=[^>]*\\bcontent=["']${literal}["'])[^>]*>`,
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
        "All source-owned product entries are deployed and allow DevPT framing.",
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
  const products = releaseTargets(registry);
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
