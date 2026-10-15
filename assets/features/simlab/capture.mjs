/** Capture genuine simLAB public UI, without fixtures, mocked controls or source changes.
 * See provenance.md for the source pin, startup and system FFmpeg setup. */
import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const output = dirname(fileURLToPath(import.meta.url));
const source =
  process.env.SIMLAB_SOURCE_DIR || resolve(output, "../../../../simlab");
const origin = new URL(
  process.env.SIMLAB_SHOWCASE_URL || "http://127.0.0.1:5180/showcase/",
);
if (
  origin.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname)
)
  throw new Error("Capture the local, source-owned public entry.");
const pin = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
const submodules = execFileSync("git", ["submodule", "status", "--recursive"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (submodules.split("\n").some((line) => /^[+-]/.test(line)))
  throw new Error("Initialize the recorded submodule commits before capture.");
const raw = mkdtempSync(join(tmpdir(), "simlab-feature-capture-"));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  recordVideo: { dir: raw, size: { width: 1280, height: 800 } },
});
const requested = new Set(
  (process.env.SIMLAB_FEATURES || "interview,differentials,passive-rom").split(
    ",",
  ),
);
const previous = existsSync(join(output, "provenance.json"))
  ? JSON.parse(readFileSync(join(output, "provenance.json"), "utf8"))
  : null;
const supported = ["interview", "differentials", "passive-rom"];
if ([...requested].some((feature) => !supported.includes(feature)))
  throw new Error("Unknown requested simLAB feature.");
const allFeatures = supported.every((feature) => requested.has(feature));
if (previous && previous.sourceCommit !== pin && !allFeatures)
  throw new Error(
    "Capture every feature again after a source revision changes.",
  );
const results =
  previous?.sourceCommit === pin
    ? previous.assets.filter((asset) => !requested.has(asset.id))
    : [];

async function create(chapter) {
  const page = await context.newPage();
  const started = Date.now();
  const errors = [],
    requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });
  const url = new URL(origin);
  url.searchParams.set("chapter", chapter);
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-showcase-build]")).toHaveAttribute(
    "data-showcase-build",
    pin,
    { timeout: 120_000 },
  );
  return { page, started, errors, requests, url: url.pathname + url.search };
}
async function finish(item, name, marker, details) {
  const { page, started, errors, requests } = item;
  await page.waitForTimeout(Math.max(0, 12_500 - (Date.now() - marker)));
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
  const capturedUrl = new URL(page.url());
  const video = page.video();
  await page.close();
  const path = await video.path();
  const seconds = Math.max(0, (marker - started) / 1000);
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(seconds),
    "-i",
    path,
    "-t",
    "12",
    "-vf",
    "fps=25,setsar=1",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    join(output, name + ".mp4"),
  ]);
  const probe = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size:stream=codec_name,codec_type,width,height",
        "-of",
        "json",
        join(output, name + ".mp4"),
      ],
      { encoding: "utf8" },
    ),
  );
  results.push({
    id: name,
    route: capturedUrl.pathname + capturedUrl.search,
    startRoute: item.url,
    poster: name + ".png",
    video: name + ".mp4",
    ...details,
    durationSeconds: Number(probe.format.duration),
    bytes: Number(probe.format.size),
    width: probe.streams[0].width,
    height: probe.streams[0].height,
    audio: probe.streams.some((stream) => stream.codec_type === "audio"),
    pageErrors: errors,
    protectedApiRequests: requests,
  });
  console.log("Captured", name, probe.format.size + " bytes");
}
try {
  if (requested.has("interview")) {
    const interview = await create("listen");
    const p = interview.page;
    await expect(p.locator(".interview-patient")).toHaveAttribute(
      "data-patient-state",
      "ready",
      { timeout: 120_000 },
    );
    await p.screenshot({ path: join(output, "interview.png") });
    const mark = Date.now();
    await p.waitForTimeout(1500);
    await p
      .getByRole("button", { name: "The Saturday walk", exact: true })
      .click();
    await expect(p.locator(".conversation-demo")).toContainText(
      "coffee afterward",
    );
    await p.waitForTimeout(3500);
    await p.locator("textarea").fill("What makes it worse, and what helps?");
    await p.locator("textarea").press("Enter");
    await expect(p.locator(".conversation-demo")).toContainText(
      "What makes it worse, and what helps?",
    );
    await finish(interview, "interview", mark, {
      caption:
        "Ask James about the activities and symptoms that matter to him.",
      workflow:
        "Native PatientInterview, scripted authored questions/replies, Type mode. No microphone, voice API or account.",
    });
  }
  if (requested.has("differentials")) {
    const reasoning = await create("listen");
    const r = reasoning.page;
    await expect(r.locator(".interview-patient")).toHaveAttribute(
      "data-patient-state",
      "ready",
      { timeout: 120_000 },
    );
    await r.getByRole("button", { name: "The pattern", exact: true }).click();
    await r
      .getByRole("navigation", { name: "James’s visit", exact: true })
      .getByRole("button", { name: /Connect/ })
      .click();
    await expect(r.locator(".mindmap-canvas")).toBeVisible({ timeout: 60_000 });
    await expect(r.locator(".mm-line")).toHaveCount(2, { timeout: 15_000 });
    const line = r.locator(".mm-line").first();
    const from = await line.getAttribute("data-from-node"),
      to = await line.getAttribute("data-to-node");
    await r.locator(".mm-line-hit").first().focus();
    await r.keyboard.press("Shift+F10");
    await r
      .getByRole("menuitem", { name: "Remove connection", exact: true })
      .click();
    await expect(r.locator(".mm-line")).toHaveCount(1);
    const reasonMark = Date.now();
    await r.waitForTimeout(1500);
    await r
      .locator('[data-map-port^="' + from + '|"]')
      .last()
      .click();
    await r.waitForTimeout(1600);
    await r
      .locator('[data-map-port^="' + to + '|"]')
      .first()
      .click();
    await expect(r.locator(".mm-line")).toHaveCount(2);
    await r.waitForTimeout(1000);
    await r.screenshot({ path: join(output, "differentials.png") });
    await finish(reasoning, "differentials", reasonMark, {
      caption:
        "Connect disclosed findings to an illustrative working differential.",
      workflow:
        "Native ReasoningMap. The public sample’s own authored evidence-to-hypothesis connection is removed and restored with native accessible controls.",
      connection: { from, to },
      assessment:
        "Illustrative working hypotheses, not an assessed answer or instructor endorsement.",
    });
  }
  if (requested.has("passive-rom")) {
    const examination = await create("examine");
    const e = examination.page;
    const stage = e.getByRole("region", {
      name: "3D examination: PROM · Right hip flexion",
      exact: true,
    });
    await expect(stage.locator("canvas")).toBeVisible({ timeout: 120_000 });
    await expect(e.locator(".exam-result")).toBeVisible({ timeout: 120_000 });
    const choice = e.locator(".exam-choices button").first();
    const examName = (await stage.getAttribute("aria-label")).replace(
      /^3D examination: /,
      "",
    );
    const examId = await e
      .locator(".exam-result")
      .getAttribute("data-exam-result");
    await stage.getByRole("button", { name: "Loop", exact: true }).click();
    await stage
      .getByRole("slider", { name: "Movement timeline", exact: true })
      .focus();
    await e.keyboard.press("Home");
    const examMark = Date.now();
    await stage.getByRole("button", { name: "Play", exact: true }).click();
    await e.waitForTimeout(3500);
    await e.screenshot({ path: join(output, "passive-rom.png") });
    await finish(examination, "passive-rom", examMark, {
      caption:
        "Observe the native right-hip passive range-of-motion examination.",
      workflow:
        "Loop James’s actual native supine PROM test with its own playback controls after the original observed examination finishes. No result is released ahead of the original observation.",
      examName,
      examId,
      builder: {
        kind: "prom",
        itemId: "hip-flexion",
        side: "right",
        position: "supine",
      },
    });
  }
} finally {
  await context.close();
  await browser.close();
}
const sourceManifest = {
  schemaVersion: 1,
  product: "simlab",
  repository: "danstonedev/simlab",
  sourceCommit: pin,
  capturedAt: new Date().toISOString(),
  publicEntry: "https://lab.devpt.app/showcase/",
  nativePatientId: "patient-james-morgan",
  caseId: "hip-groin-64",
  submodules: submodules.split("\n").map((line) => line.trim()),
  capture: {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    browser: "System Chromium headless",
    renderer: "SwiftShader; native adaptive software-render budget retained",
    video:
      "Approximately 12 seconds, H.264/yuv420p, 25fps container, no audio; original temporal playback retained",
    processing:
      "Trim loading/preparation before the clip; transcode original browser video only. No compositing, substitute UI, source edits or fabricated records.",
  },
  assets: results,
};
for (const asset of sourceManifest.assets) {
  const poster = readFileSync(join(output, asset.poster)),
    video = readFileSync(join(output, asset.video));
  asset.posterBytes = poster.byteLength;
  asset.sha256 = {
    poster: createHash("sha256").update(poster).digest("hex"),
    video: createHash("sha256").update(video).digest("hex"),
  };
}
writeFileSync(
  join(output, "provenance.json"),
  JSON.stringify(sourceManifest, null, 2) + "\n",
);
