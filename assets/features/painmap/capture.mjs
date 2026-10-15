/** Capture authentic native UI from the sanctioned painted-map fixture.
 * Run with Node 22+ and --experimental-strip-types against PainMap's e2e-mode
 * Vite server. No strokes or new gesture sequences are dispatched.
 */
import { mkdir, readFile, copyFile, rename } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const OUTPUT = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(
  process.env.PAINMAP_SOURCE_DIR ?? resolve(OUTPUT, "../../../../3DPainMap"),
);
const BASE = process.env.PAINMAP_CAPTURE_URL ?? "http://localhost:5182";
const FFMPEG = process.env.PAINMAP_FFMPEG ?? "/usr/bin/ffmpeg";
const require = createRequire(resolve(SOURCE, "package.json"));
const { chromium } = require("playwright");
const { registry: registryModule } = require("playwright-core/lib/coreBundle");
const { registry } = registryModule;
// Use the installed capture encoder without downloading another browser tool.
registry.findExecutable("ffmpeg").executablePathOrDie = () => FFMPEG;
const { openPaintedWorkspace } = await import(
  pathToFileURL(resolve(SOURCE, "e2e/paintedMap.ts")).href
);
const map = JSON.parse(
  await readFile(resolve(SOURCE, "e2e/fixtures/painted-map.json"), "utf8"),
);
const temporary = "/tmp/devpt-painmap-feature-capture";
await mkdir(temporary, { recursive: true });
await mkdir(OUTPUT, { recursive: true });

for (const [name, native] of [
  ["mapping", "paint"],
  ["movement", "pose"],
]) {
  await copyFile(
    resolve(SOURCE, `static/hero/workspace-${native}.mp4`),
    resolve(OUTPUT, `${name}.mp4`),
  );
}

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/usr/bin/chromium",
  headless: true,
  args: ["--enable-webgl", "--ignore-gpu-blocklist"],
});
const context = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  reducedMotion: "no-preference",
  recordVideo: { dir: temporary, size: { width: 1280, height: 800 } },
});
const page = await context.newPage();
page.setDefaultTimeout(20000);
const video = page.video();
const recordingStartedAt = Date.now();
page.on("pageerror", (error) => process.stderr.write(`${error.message}\n`));

let clipStart = 0;
let clipDuration = 0;
try {
  await openPaintedWorkspace(page, {
    vspId: "painted-fixture",
    assessmentId: "feature-mapping",
  });
  await page
    .locator(".pain-body3d__loader-host--ready")
    .waitFor({ state: "attached", timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(OUTPUT, "mapping.png") });
  console.log("Captured native landscape mapping poster.");

  // Leave the authoring route before preparing another fixture state so its
  // autosave cannot race the capture setup's explicit persistence write.
  await page.goto("/showcase/", { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const persistence = await import(
      "/src/lib/services/symptomMapPersistence.ts"
    );
    const scope = "assessment:painted-fixture:feature-mapping";
    const draft = await persistence.loadSymptomMapDraftAsync(scope);
    if (!draft)
      throw new Error("The sanctioned mapping fixture did not persist a draft");
    await persistence.saveSymptomMapDraftAsync(scope, {
      ...draft,
      sessionType: "pose_move",
      conditions: undefined,
      conditionStates: undefined,
      activeConditionId: "typical",
    });
  });
  await page.goto("/app/patients/painted-fixture/assessments/feature-mapping", {
    waitUntil: "domcontentloaded",
  });
  await page
    .locator(".pain-body3d__loader-host--ready")
    .waitFor({ state: "attached", timeout: 60000 });
  // Pose assessments open with Pose active; clicking the active native tool
  // would toggle it OFF. Respect its state rather than adding pose gestures.
  const poseButton = page.getByRole("button", {
    name: "Pose tool",
    exact: true,
  });
  if ((await poseButton.getAttribute("aria-pressed")) !== "true")
    await poseButton.click();
  await page.getByRole("button", { name: /^Turn the body/ }).press("Home");
  await page.mouse.move(640, 400);
  // Ordinary camera zoom backs away from the map without dispatching a stroke
  // or a pose-handle drag, keeping the head and both feet inside native chrome.
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: resolve(OUTPUT, "movement.png") });
  console.log("Captured native landscape Pose tool poster with joint handles.");

  const saved = await page.evaluate(async (fixture) => {
    const persistence = await import(
      "/src/lib/services/symptomMapPersistence.ts"
    );
    const { createEmptyMovementTimeline } = await import(
      "/src/lib/services/movementTimeline.ts"
    );
    const scope = "assessment:painted-fixture:feature-timeline";
    await persistence.clearSymptomMapWorkspaceAsync(scope);
    const dates = [
      "2026-10-01T14:00:00.000Z",
      "2026-10-08T14:00:00.000Z",
      "2026-10-15T14:00:00.000Z",
    ];
    const records = [];
    for (const [index, count] of [1, 3, 5].entries()) {
      const findings = fixture.findings.slice(0, count);
      const ids = new Set(findings.map((finding) => finding.id));
      const groups = fixture.groups.map((group) => ({
        ...group,
        findingIds: group.findingIds.filter((id) => ids.has(id)),
      }));
      const draft = {
        assessmentId: "feature-timeline",
        vspId: "painted-fixture",
        isSandbox: true,
        bodyVariant: fixture.bodyVariant,
        findings,
        groups,
        relations: [],
        summary: "",
        mode: "patient",
        title: "Synthetic symptom timeline",
        sessionType: "now",
        movementTimeline: createEmptyMovementTimeline(),
        savedAt: dates[index],
      };
      const snapshot = await persistence.saveSymptomMapSnapshotAsync(
        scope,
        draft,
        { label: `Sample visit ${index + 1}` },
      );
      if (!snapshot) throw new Error("Synthetic native snapshot save failed");
      records.push({
        id: snapshot.id,
        label: snapshot.label,
        findingCount: findings.length,
      });
      if (index === 2) await persistence.saveSymptomMapDraftAsync(scope, draft);
    }
    return records;
  }, map);
  console.log("Native synthetic saved visits:", JSON.stringify(saved));

  await page.goto(
    "/app/patients/painted-fixture/assessments/feature-timeline/progress",
    { waitUntil: "domcontentloaded" },
  );
  const history = page.getByRole("region", { name: "Snapshot body preview" });
  await history.waitFor({ state: "visible", timeout: 60000 });
  await history.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await history
    .locator(".pain-body3d__loader-host--ready")
    .waitFor({ state: "attached", timeout: 60000 });
  const dots = history
    .getByRole("group", { name: "Snapshots", exact: true })
    .getByRole("button");
  await dots.nth(0).click();
  await history.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(2000);
  clipStart = (Date.now() - recordingStartedAt) / 1000;
  await page.waitForTimeout(1000);
  await history
    .getByRole("button", { name: "Play through snapshots", exact: true })
    .click();
  await page.waitForTimeout(4500);
  await dots.nth(0).click();
  await page.waitForTimeout(2000);
  await dots.nth(1).click();
  await page.waitForTimeout(2000);
  await dots.nth(2).click();
  await page.waitForTimeout(2000);
  await history.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(OUTPUT, "timeline.png") });
  clipDuration = (Date.now() - recordingStartedAt) / 1000 - clipStart;
} finally {
  await context.close();
  await browser.close();
}
if (!video || clipDuration <= 0)
  throw new Error("Native timeline recording did not finish");
const raw = await video.path();
const result = spawnSync(
  FFMPEG,
  [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    clipStart.toFixed(3),
    "-t",
    clipDuration.toFixed(3),
    "-i",
    raw,
    "-vf",
    `setpts=PTS/${Math.max(1, clipDuration / 14).toFixed(6)}`,
    "-r",
    "25",
    "-an",
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-preset",
    "medium",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    resolve(OUTPUT, ".timeline.capture.mp4"),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) throw new Error("Timeline encoding failed");
await rename(
  resolve(OUTPUT, ".timeline.capture.mp4"),
  resolve(OUTPUT, "timeline.mp4"),
);
console.log(JSON.stringify({ clipStart, clipDuration, raw, output: OUTPUT }));
