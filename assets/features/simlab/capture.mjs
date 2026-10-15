/** Capture the genuine simLAB STUDENT workspace through supported local users.
 * Never capture the public /showcase/ entry or inject a session/stage. */
import { chromium, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const output = dirname(fileURLToPath(import.meta.url));
const source =
  process.env.SIMLAB_SOURCE_DIR || resolve(output, "../../../../simlab");
const origin = new URL(
  process.env.SIMLAB_STUDENT_URL || "http://127.0.0.1:5184/",
);
if (
  origin.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(origin.hostname) ||
  origin.pathname !== "/" ||
  origin.username ||
  origin.password ||
  origin.search ||
  origin.hash
)
  throw new Error("Use the local real student-app root, never /showcase/.");
const backend = new URL(
  process.env.SIMLAB_LOCAL_API || "http://127.0.0.1:5183",
);
if (
  backend.protocol !== "http:" ||
  !["127.0.0.1", "localhost", "[::1]"].includes(backend.hostname) ||
  backend.pathname !== "/" ||
  backend.username ||
  backend.password ||
  backend.search ||
  backend.hash
)
  throw new Error("Use only the official loopback synthetic API backend.");
const liveProof = JSON.parse(
  readFileSync(
    process.env.SIMLAB_LIVE_PROOF || "/tmp/simlab-live-release-proof.json",
    "utf8",
  ),
);
const pin = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (
  liveProof.sourceRevision !== pin ||
  liveProof.sourceRevisionFoundInBundle !== true ||
  !/^https:\/\/lab\.devpt\.app\/assets\/App-[^/]+\.js$/.test(liveProof.url) ||
  !/^[a-f0-9]{64}$/.test(liveProof.bundleSha256)
)
  throw new Error(
    "Capture source must match a verified live App bundle receipt.",
  );
execFileSync("git", ["diff", "--quiet", "HEAD"], { cwd: source });
const submodules = execFileSync("git", ["submodule", "status", "--recursive"], {
  cwd: source,
  encoding: "utf8",
}).trim();
if (submodules.split("\n").some((line) => /^[+-U]/.test(line)))
  throw new Error("Initialize the declared submodule pins.");
const entryResponse = await fetch(origin.href, {
  signal: AbortSignal.timeout(10000),
});
if (!entryResponse.ok)
  throw new Error("The production app entry did not load.");
const entryHtml = await entryResponse.text();
const appPath = entryHtml.match(/["'](\/assets\/App-[^"']+\.js)["']/)?.[1];
if (!appPath || entryHtml.includes("/@vite/client"))
  throw new Error("Serve the real production build, not a development entry.");
const appResponse = await fetch(new URL(appPath, origin), {
  signal: AbortSignal.timeout(10000),
});
if (!appResponse.ok) throw new Error("The production App bundle did not load.");
const appBundle = await appResponse.text();
if (!appBundle.includes(pin))
  throw new Error(
    "The served production App bundle does not match source HEAD. Rebuild it.",
  );
const servedBuildProof = {
  appPath,
  sourceRevision: pin,
  sourceRevisionFoundInBundle: true,
  bundleSha256: createHash("sha256").update(appBundle).digest("hex"),
};
if (process.env.SIMLAB_PREFLIGHT_ONLY === "1") {
  console.log(
    JSON.stringify(
      {
        sourceCommit: pin,
        sourceClean: true,
        liveReleaseProof: liveProof,
        servedBuildProof,
        loopbackBackend: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const raw = mkdtempSync(join(tmpdir(), "simlab-student-capture-"));
const world = "homepage-student-" + Date.now();
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
async function actor(name, video = false) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    ...(video
      ? { recordVideo: { dir: raw, size: { width: 1280, height: 800 } } }
      : {}),
  });
  // The official dev:users actor/world cookies are the same supported path as
  // e2e/users/classes.spec.ts. The backend still runs its real admission rules.
  await context.addCookies([
    { name: "simlab-local-world", value: world, url: origin.origin },
    { name: "simlab-local-actor", value: name, url: origin.origin },
  ]);
  const page = await context.newPage();
  await page.route(/googletagmanager|google-analytics/, (route) =>
    route.abort(),
  );
  return { context, page };
}
const faculty = await actor("faculty-dpt");
const student = await actor("dpt-alex", true);
const page = student.page;
const videoStarted = Date.now();
const errors = [],
  providerCalls = [],
  apiResponses = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  const url = new URL(request.url());
  if (
    /^\/api\/(?:ddx\/patient-respond|patient-respond|realtime(?:-|\/)|patient-transcribe|emr-chart|emr-patient|subjective-draft)/.test(
      url.pathname,
    )
  )
    providerCalls.push(url.pathname);
});
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.pathname.startsWith("/api/"))
    apiResponses.push({ path: url.pathname, status: response.status() });
});
const segments = [];
let encounterRoute;
const app = () => page.locator(".ddx");
async function proveStudent() {
  const url = new URL(page.url());
  expect(url.pathname).toBe("/");
  expect(url.searchParams.get("mission")).toBe("hip-ddx-practice");
  expect(url.searchParams.get("classSession")).toMatch(/^cs_[a-f0-9]+$/);
  await expect(
    page.getByRole("button", { name: /Your account: Alex DPT Student/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "simEMR navigation" }),
  ).toBeVisible();
  await expect(app()).toBeVisible();
  await expect(
    page.locator("[data-showcase-build],.showcase,.tour-transport"),
  ).toHaveCount(0);
  await expect(page.getByText("Local tools", { exact: true })).toHaveCount(0);
  await expect(
    page.locator(".interview-hand-gesture,.patient-actions"),
  ).toHaveCount(0);
  await expect(
    page.getByText("Scripted case practice", { exact: true }),
  ).toHaveCount(0);
  if (await page.locator(".interview-workspace").count())
    await expect(page.locator(".interview-workspace")).toHaveAttribute(
      "data-manual-controls",
      "false",
    );
  return {
    route: url.pathname + url.search,
    studentIdentity: "Alex DPT Student",
    role: "Student",
    nativeDdx: true,
    publicShowcase: false,
  };
}
async function session() {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      key.startsWith("devpt.ddx.session.v1:"),
    );
    if (!key) throw new Error("The app did not save its native session.");
    return Object.values(JSON.parse(localStorage.getItem(key)).versions)[0];
  });
}
async function next(expected) {
  await app().locator(".toolbar-next").click();
  const advisory = app().getByRole("dialog", {
    name: "Still to do",
    exact: true,
  });
  const heading = app().getByRole("heading", {
    level: 1,
    name: expected,
    exact: true,
  });
  await expect
    .poll(
      async () => (await advisory.isVisible()) || (await heading.isVisible()),
      { timeout: 90000 },
    )
    .toBe(true);
  if (await advisory.isVisible())
    await advisory
      .getByRole("button", { name: "Continue anyway", exact: true })
      .click();
  await expect(heading).toBeVisible({ timeout: 90000 });
}
async function segment(name, start, details) {
  const proof = await proveStudent();
  await page.waitForTimeout(Math.max(0, 12500 - (Date.now() - start)));
  expect(errors).toEqual([]);
  expect(providerCalls).toEqual([]);
  segments.push({
    id: name,
    start: (start - videoStarted) / 1000,
    poster: name + ".png",
    video: name + ".mp4",
    proof,
    ...details,
  });
  console.log("Student capture ready:", name, JSON.stringify(proof));
}
async function port(from, to) {
  const chart = app().locator('[data-chart-port="' + from + '|right"]');
  if (await chart.count()) await chart.click();
  else
    await app()
      .locator('[data-map-port^="' + from + '|"]')
      .last()
      .click();
  await page.waitForTimeout(700);
  await app()
    .locator('[data-map-port^="' + to + '|"]')
    .first()
    .click();
}
async function revealInNote(target) {
  const all = app().getByRole("button", { name: "All tests", exact: true });
  if (!(await target.count()) && (await all.isVisible())) await all.click();
  const region = target.locator(
    'xpath=ancestor::details[contains(@class,"note-region")]',
  );
  if ((await region.count()) && (await region.getAttribute("hidden")) !== null)
    await app()
      .getByRole("group", { name: "Select body regions", exact: true })
      .getByRole("button", {
        name: await region.getAttribute("data-region"),
        exact: true,
      })
      .click();
  for (const details of await target.locator("xpath=ancestor::details").all())
    if ((await details.getAttribute("open")) === null)
      await details.locator(":scope > summary").click();
}
try {
  const ready = await faculty.page.request.get(
    backend.origin + "/__local-dev/world",
  );
  const worldInfo = await ready.json();
  expect(ready.ok()).toBe(true);
  expect(worldInfo.enabled).toBe(true);
  expect(worldInfo.seedErrors).toEqual([]);
  await faculty.page.goto(origin.origin + "/?class=host");
  await expect(
    faculty.page.getByRole("heading", { level: 1, name: "Run a class" }),
  ).toBeVisible({ timeout: 60000 });
  await faculty.page.getByLabel(/^Label/).fill("Clinical reasoning practice");
  await faculty.page
    .getByRole("listitem")
    .filter({ hasText: "James Morgan" })
    .getByRole("button", { name: /^Start class/ })
    .click();
  await expect(faculty.page.locator(".joincode")).toBeVisible({
    timeout: 60000,
  });
  const code = (await faculty.page.locator(".joincode").innerText()).trim();
  console.log("Faculty synthetic class created.");
  await page.goto(origin.href);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your classes" }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByLabel("Class code").fill(code);
  await page.getByRole("button", { name: "Join class", exact: true }).click();
  await expect(
    app().getByRole("heading", {
      level: 1,
      name: "Chart review & plan",
      exact: true,
    }),
  ).toBeVisible({ timeout: 120000 });
  encounterRoute = new URL(page.url()).pathname + new URL(page.url()).search;
  await proveStudent();
  console.log("Production student joined native encounter:", encounterRoute);

  await app()
    .getByRole("button", {
      name: "Pin finding: Reason for referral",
      exact: true,
    })
    .click();
  for (const name of [
    "Hip osteoarthritis",
    "Femoroacetabular impingement syndrome",
    "Acetabular labral tear",
  ]) {
    await app()
      .getByRole("combobox", { name: "Add a diagnosis", exact: true })
      .fill(name);
    await app().getByRole("option", { name, exact: true }).click();
  }
  const before = await session();
  const oa = before.hypotheses.find((item) => item.diagnosisId === "oa");
  const fai = before.hypotheses.find((item) => item.diagnosisId === "fai");
  if (!oa || !fai)
    throw new Error("Expected native hypotheses were not saved.");
  const reasonStart = Date.now();
  await page.waitForTimeout(1000);
  await port("finding:ref-reason", "diagnosis:" + oa.id);
  await page.waitForTimeout(1200);
  await port("finding:ref-reason", "diagnosis:" + fai.id);
  await expect(app().locator(".mm-line")).toHaveCount(2);
  await page.screenshot({ path: join(raw, "differentials.png") });
  await segment("differentials", reasonStart, {
    caption: "Connect charted findings to working differentials.",
    stage: "Chart review & plan",
    workflow:
      "A real student pins the native referral finding, adds three native diagnoses, then connects the chart finding to two working differentials with native ports. These are illustrative student-entered hypotheses, not a graded conclusion.",
  });

  await next("Interview");
  await expect(app().locator(".interview-patient")).toHaveAttribute(
    "data-patient-state",
    "ready",
    { timeout: 120000 },
  );
  await app()
    .getByRole("button", { name: "Patient voice", exact: true })
    .click();
  await expect(app().locator(".interview-planned-questions")).toHaveCount(0);
  await proveStudent();
  const interviewStart = Date.now();
  await page.screenshot({ path: join(raw, "interview.png") });
  await page.waitForTimeout(1500);
  await app()
    .getByRole("textbox", { name: "Ask the patient a question", exact: true })
    .pressSequentially("What would you like to get back to?", { delay: 100 });
  await segment("interview", interviewStart, {
    caption: "Interview the native 3D patient inside the student encounter.",
    stage: "Interview",
    workflow:
      "Actual production student PatientInterview with native 3D patient, original case opening and an unsent student question. Patient voice is muted with the native control. No AI answer is requested or fabricated; the full student app chrome remains visible.",
  });
  await app()
    .getByRole("textbox", { name: "Ask the patient a question", exact: true })
    .fill("");

  await next("Body chart");
  await expect(
    app().locator(".chart-canvas .pain-body3d__loader-host"),
  ).toHaveAttribute("aria-hidden", "true", { timeout: 120000 });
  await expect(
    app().locator(".chart-canvas .pain-body3d__readiness"),
  ).toHaveCount(0, { timeout: 120000 });
  await next("Revised DDx");
  await app()
    .getByRole("combobox", { name: "Plan a test", exact: true })
    .fill("PROM · Right hip internal rotation");
  await app()
    .getByRole("option", {
      name: "PROM · Right hip internal rotation",
      exact: true,
    })
    .click();
  await next("Examination");
  await expect(
    app().locator(".exam-stage-wrap .interview-patient"),
  ).toHaveAttribute("data-patient-state", "ready", { timeout: 120000 });
  const testId = "bx-prom-hip-ir-right";
  const conversation = app().locator(
    ".exam-stage-wrap .objective-conversation",
  );
  if ((await conversation.getAttribute("open")) === null)
    await conversation.locator(":scope > summary").click();
  await app()
    .getByRole("textbox", { name: "Ask the patient a question", exact: true })
    .fill("Check right passive hip internal rotation in sitting");
  await app()
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  console.log("Native seated PROM requested.");
  const recorded = app().locator("#exam-result-" + testId);
  await expect(recorded).toBeVisible({ timeout: 120000 });
  const observed = await session();
  const performance = observed.examProgress.performances.find(
    (item) => item.examId === testId,
  );
  if (!performance || performance.awaitingObservation)
    throw new Error("The original native observation did not complete.");
  console.log("Native seated PROM observed:", JSON.stringify(performance));
  if ((await conversation.getAttribute("open")) !== null)
    await conversation.locator(":scope > summary").click();
  await recorded.click();
  const patient = app().locator(".exam-stage-wrap");
  const loop = patient.getByRole("button", { name: "Loop", exact: true });
  await expect(loop).toBeEnabled({ timeout: 60000 });
  if ((await loop.getAttribute("aria-pressed")) !== "true") await loop.click();
  const timeline = patient.getByRole("slider", {
    name: "Movement timeline",
    exact: true,
  });
  await timeline.focus();
  await page.keyboard.press("Home");
  const promStart = Date.now();
  const play = patient.getByRole("button", { name: "Play", exact: true });
  if (await play.isVisible()) await play.click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(raw, "passive-rom.png") });
  await segment("passive-rom", promStart, {
    caption:
      "Observe passive hip range of motion in the student Examination workspace.",
    stage: "Examination",
    workflow:
      "The student plans and performs native right-hip PROM using the native typed Objective command with supported sitting position and ordinary individual admission/observation, then replays that completed test with native Loop and timeline controls. No written fallback, accelerated reveal or stage injection.",
    examId: testId,
    observation: performance,
    builder: {
      kind: "prom",
      itemId: "hip-ir",
      side: "right",
      position: "sitting",
    },
  });

  expect(segments).toHaveLength(3);
  expect(errors).toEqual([]);
  expect(providerCalls).toEqual([]);
  console.log("All three actual student surfaces captured.", raw);
} catch (error) {
  console.error("Student capture failed:", error);
  await page
    .screenshot({ path: "/tmp/simlab-student-capture-failure.png" })
    .catch(() => {});
  writeFileSync(
    "/tmp/simlab-student-capture-failure.txt",
    await page
      .locator("body")
      .innerText()
      .catch(() => ""),
  );
  throw error;
} finally {
  await student.context.close();
  await faculty.context.close();
  await browser.close();
}
if (
  execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  }).trim() !== pin
)
  throw new Error("Source revision changed during capture.");
execFileSync("git", ["diff", "--quiet", "HEAD"], { cwd: source });
const recording = await page.video().path();
const assets = [];
for (const part of segments) {
  const target = join(raw, part.video);
  execFileSync("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    String(part.start),
    "-i",
    recording,
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
    target,
  ]);
  if (part.id === "interview") {
    execFileSync("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      "0.5",
      "-i",
      target,
      "-frames:v",
      "1",
      join(raw, part.poster),
    ]);
    part.posterFrameSeconds = 0.5;
  }
  const info = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration,size:stream=codec_name,codec_type,width,height",
        "-of",
        "json",
        target,
      ],
      { encoding: "utf8" },
    ),
  );
  if (
    info.streams.length !== 1 ||
    info.streams[0].codec_name !== "h264" ||
    Number(info.format.duration) < 10 ||
    Number(info.format.duration) > 15
  )
    throw new Error("Invalid student preview video.");
  copyFileSync(join(raw, part.poster), join(output, part.poster));
  copyFileSync(target, join(output, part.video));
  const poster = readFileSync(join(output, part.poster)),
    video = readFileSync(join(output, part.video));
  const { start, ...details } = part;
  assets.push({
    ...details,
    width: 1280,
    height: 800,
    durationSeconds: Number(info.format.duration),
    bytes: video.byteLength,
    posterBytes: poster.byteLength,
    audio: false,
    sha256: {
      poster: createHash("sha256").update(poster).digest("hex"),
      video: createHash("sha256").update(video).digest("hex"),
    },
  });
}
const manifest = {
  schemaVersion: 1,
  product: "simlab",
  surface: "actual-student-workspace",
  repository: "danstonedev/simlab",
  sourceCommit: pin,
  liveReleaseProof: liveProof,
  servedBuildProof,
  capturedAt: new Date().toISOString(),
  productEntry: "https://lab.devpt.app/",
  entry: "/",
  encounterRoute,
  missionId: "hip-ddx-practice",
  nativePatientId: "patient-james-morgan",
  caseId: "hip-groin-64",
  actor: { key: "dpt-alex", displayName: "Alex DPT Student", role: "student" },
  authentication:
    "Plain production frontend built from verified live-deployed source, served locally through a Host-preserving preview proxy. Supported dev:users synthetic actor cookies and real in-memory API handlers; ordinary faculty class creation and student code join. These are not literal signed-in production recordings.",
  submodules: submodules.split("\n").map((line) => line.trim()),
  capture: {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    browser: "System Chromium headless",
    renderer: "SwiftShader; native software-render budget retained",
    durationSeconds: 12,
    processing:
      "Trim original browser recording and transcode to silent H.264. No UI overlays, cropping, source edits, mocked responses, or localStorage writes. Native Continue anyway advisories are used to review this incomplete synthetic educational encounter; no completion or clinical acceptance is claimed.",
  },
  runtimeLimitations: [
    "The locally served production frontend uses the official synthetic in-memory user/class API, with AI/EMR pass-through pointed at unused loopback port 65530. The recordings are not literal signed-in production sessions.",
    "The native automatic voice preparation reads authored persona instructions; local health and spoken-audio requests are unavailable and recorded in localApiResponses. No AI answer, realtime token, microphone, EMR relay or external provider is used. The interview clip types an unsent question.",
    "SwiftShader software rendering retains the product adaptive budget; 3D resolution can soften. The interview poster is the original native frame 0.5 seconds into the encoded clip, before typing, with no cropping or sharpening.",
  ],
  pageErrors: errors,
  providerCalls,
  localApiResponses: apiResponses,
  assets,
};
writeFileSync(
  join(output, "provenance.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      sourceCommit: pin,
      encounterRoute,
      assets: assets.map(({ id, durationSeconds, bytes }) => ({
        id,
        durationSeconds,
        bytes,
      })),
    },
    null,
    2,
  ),
);
