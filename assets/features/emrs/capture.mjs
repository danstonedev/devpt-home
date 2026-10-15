import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Only native screens, real local handlers and the owner's synthetic fixtures.
// Requires devpt-emr-platform's dev:probono on 3001 and dev:showcase on 5181.
const destination = dirname(fileURLToPath(import.meta.url));
const sourceRepo = resolve(destination, "../../../../devpt-emr-platform");
const clinic = "http://127.0.0.1:3001";
const showcase = "http://127.0.0.1:5181/showcase/";
const scratch = "/tmp/devpt-emr-feature-recordings";
const viewport = { width: 1440, height: 900 };
const duration = 11;
const text = {
  team: "Good connection between the patient’s goals and functional limitations. Add a measurable baseline for overhead reach and explain how you will reassess progress.",
  passage:
    "Make this baseline measurable: record height, repetitions or activity duration so you can compare the next visit.",
};
const revision = execFileSync("git", ["-C", sourceRepo, "rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
await mkdir(scratch, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
});
const admin = await browser.newContext();
const world = await (
  await admin.request.get(`${clinic}/__local-dev/world`)
).json();
if (world.enabled !== true || world.dataClass !== "phi")
  throw new Error(
    "Require the loopback-only, in-memory proBono fixture server.",
  );
// This local-only reset cannot reach Cosmos; the Vite plugin substitutes the
// real API handlers' backing store. It deliberately discards earlier captures.
const reset = await admin.request.post(`${clinic}/__local-dev/reset`, {
  data: {},
});
if (!reset.ok()) throw new Error("Local fixture reset failed.");
await admin.request.post(`${clinic}/__local-dev/role`, {
  data: { userId: "local-dev-admin" },
});
const nextMonday = new Date();
nextMonday.setUTCHours(12, 0, 0, 0);
nextMonday.setUTCDate(
  nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7),
);
const day = (offset) => {
  const date = new Date(nextMonday);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const term = {
  startDate: day(0),
  weeks: 14,
  groups: [
    { groupId: "local-group-dpt-1", weekday: 1, times: ["09:00", "10:00"] },
    { groupId: "local-group-dpt-2", weekday: 1, times: ["09:00", "10:00"] },
    { groupId: "local-group-pta-1", weekday: 3, times: ["10:45", "11:30"] },
    { groupId: "local-group-pta-2", weekday: 3, times: ["10:45", "11:30"] },
    {
      groupId: "local-group-interdisciplinary",
      weekday: 3,
      times: ["10:45", "11:30"],
    },
  ],
};
const current = await (
  await admin.request.get(`${clinic}/api/term-schedule`)
).json();
const termSave = await admin.request.put(`${clinic}/api/term-schedule`, {
  data: { schedule: term, version: current.version },
});
if (!termSave.ok()) throw new Error(await termSave.text());
await admin.request.post(`${clinic}/__local-dev/role`, {
  data: { userId: "local-dev-student" },
});
const bookings = [];
for (const [patientId, offset, visitTime] of [
  ["patient_local_ada", 0, "09:00"],
  ["patient_local_ellen", 7, "09:00"],
  ["patient_local_ada", 14, "10:00"],
]) {
  const body = {
    patientId,
    templateId: "pt-outpatient-follow-up",
    visitDate: day(offset),
    visitTime,
    intent: "schedule",
  };
  const response = await admin.request.post(`${clinic}/api/student-visit`, {
    data: body,
  });
  if (!response.ok()) throw new Error(await response.text());
  bookings.push(body);
}
await admin.close();

const assets = [];
async function record(name, actor, route, prepare, perform) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    recordVideo: { dir: scratch, size: viewport },
  });
  let verifiedActor = null;
  if (actor) {
    const switched = await context.request.post(`${clinic}/__local-dev/role`, {
      data: { userId: actor },
    });
    verifiedActor = (await switched.json()).actor;
    const expectedRole = name === "student-schedule" ? "student" : "faculty";
    if (verifiedActor.id !== actor || verifiedActor.role !== expectedRole)
      throw new Error("The native actor or role was not confirmed.");
  }
  const born = performance.now();
  const page = await context.newPage();
  const external = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      external.push(url.origin);
  });
  await page.goto(route);
  await prepare(page);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(destination, `${name}.png`) });
  const start = (performance.now() - born) / 1000;
  const began = performance.now();
  await perform(page);
  const remaining = duration * 1000 + 350 - (performance.now() - began);
  if (remaining > 0) await page.waitForTimeout(remaining);
  const raw = page.video();
  await context.close();
  const videoPath = await raw.path();
  const output = resolve(destination, `${name}.mp4`);
  const encoded = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(start),
      "-i",
      videoPath,
      "-t",
      String(duration),
      "-vf",
      "scale=1280:800:flags=lanczos,fps=24",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "24",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "-an",
      output,
    ],
    { encoding: "utf8" },
  );
  if (encoded.status !== 0) throw new Error(encoded.stderr);
  const inspection = JSON.parse(
    execFileSync(
      "ffprobe",
      ["-v", "quiet", "-show_format", "-show_streams", "-of", "json", output],
      { encoding: "utf8" },
    ),
  );
  const stream = inspection.streams.find((item) => item.codec_type === "video");
  const files = [];
  for (const suffix of ["png", "mp4"]) {
    const file = resolve(destination, `${name}.${suffix}`);
    const bytes = await readFile(file);
    files.push({
      file: `${name}.${suffix}`,
      bytes: (await stat(file)).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  assets.push({
    id: name,
    sourceRoute: route,
    actor,
    verifiedActor,
    durationSeconds: Number(inspection.format.duration),
    video: {
      width: stream.width,
      height: stream.height,
      codec: stream.codec_name,
      audio: false,
    },
    poster: viewport,
    externalRequestOrigins: [...new Set(external)],
    files,
  });
}

await record(
  "workspace",
  null,
  showcase,
  async (page) => {
    await page
      .getByRole("button", {
        name: "Expand Presenting concern / history",
        exact: true,
      })
      .click();
    await page
      .getByRole("textbox", {
        name: "Reason for today’s visit / chief concern",
        exact: true,
      })
      .waitFor();
  },
  async (page) => {
    await page.waitForTimeout(1800);
    const chapters = page.getByRole("navigation", {
      name: "Walkthrough chapters",
    });
    await chapters
      .getByRole("button", { name: "Objective", exact: true })
      .click();
    await page.waitForTimeout(800);
    const vitals = page.getByRole("button", {
      name: "Expand Vital Signs",
      exact: true,
    });
    if (await vitals.isVisible()) await vitals.click();
    await page.waitForTimeout(2400);
    await chapters.getByRole("button", { name: "Plan", exact: true }).click();
    await page.waitForTimeout(2500);
    await chapters
      .getByRole("button", { name: "Subjective", exact: true })
      .click();
  },
);
await record(
  "student-schedule",
  "local-dev-student",
  `${clinic}/workspace/scheduling`,
  async (page) => {
    await page
      .getByRole("button", { name: "Course weeks", exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".term-slot").length === 6 &&
        document.querySelectorAll(".term-slot .visit").length === 3 &&
        Array.from(document.querySelectorAll(".term-slot__empty")).filter(
          (slot) => slot.textContent.trim() === "Available",
        ).length === 3,
    );
    if (
      (await page.locator(".term-slot").count()) !== 6 ||
      (await page.locator(".term-slot .visit").count()) !== 3 ||
      (await page.locator(".term-slot__empty").count()) !== 3
    )
      throw new Error(
        "The student calendar must show exactly three booked and three available slots.",
      );
    await page.getByText("Alex DPT Student", { exact: true }).first().waitFor();
  },
  async (page) => {
    await page.waitForTimeout(1700);
    await page
      .getByRole("button", { name: "Schedule follow-up", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Patient", exact: true })
      .selectOption("patient_local_ada");
    await page
      .getByRole("combobox", { name: "Visit date", exact: true })
      .waitFor();
    await page.waitForTimeout(2200);
    const dates = page.getByRole("combobox", {
      name: "Visit date",
      exact: true,
    });
    const options = await dates
      .locator("option")
      .evaluateAll((items) => items.map((item) => item.value));
    if (options.length > 1) await dates.selectOption(options[1]);
    await page.waitForTimeout(2200);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  },
);
await record(
  "faculty-feedback",
  "local-dev-faculty",
  `${clinic}/oversight/review`,
  async (page) => {
    await page
      .getByRole("textbox", {
        name: "Overall message to the team",
        exact: true,
      })
      .fill(text.team);
    await page
      .getByRole("button", { name: "Add overall message", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Shoulder pain with overhead reach, limiting daily activity for the past several weeks.",
        exact: true,
      })
      .click();
    await page
      .getByRole("textbox", { name: /Comment on highlighted passage/ })
      .fill(text.passage);
    await page
      .getByRole("button", { name: "Add passage comment", exact: true })
      .click();
    const close = page.getByRole("button", {
      name: "Close 3D view",
      exact: true,
    });
    if (await close.isVisible()) await close.click();
    await page.waitForTimeout(1800);
    await page
      .getByRole("region", { name: "Signed note", exact: true })
      .evaluate((element) => {
        element.scrollTop = 0;
      });
    await page.locator(".composer-content").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    if (
      (await page.locator('[aria-label="Draft feedback"] article').count()) !==
      2
    )
      throw new Error("Require two actual added faculty draft comments.");
    await page.getByText("Dr. DPT Faculty", { exact: true }).first().waitFor();
  },
  async (page) => {
    await page.waitForTimeout(2200);
    const passage = page
      .locator('[aria-label="Draft feedback"] article')
      .last();
    await passage.getByRole("button", { name: "Edit", exact: true }).click();
    await page.waitForTimeout(900);
    await page
      .getByRole("textbox", { name: /Comment on highlighted passage/ })
      .fill(`${text.passage} Link this to your next reassessment.`);
    await page
      .getByRole("button", { name: "Save passage comment", exact: true })
      .click();
    await page.waitForTimeout(1600);
    await page.locator(".composer-content").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await page
      .getByRole("region", { name: "Signed note", exact: true })
      .evaluate((element) => {
        element.scrollTop = 0;
      });
  },
);
await browser.close();
await writeFile(
  resolve(destination, "source.json"),
  JSON.stringify(
    {
      capturedAt: new Date().toISOString(),
      source: {
        repository: "danstonedev/devpt-emr-platform",
        commit: revision,
        branch: execFileSync(
          "git",
          ["-C", sourceRepo, "branch", "--show-current"],
          { encoding: "utf8" },
        ).trim(),
      },
      capture: {
        browser: "Chromium via Playwright",
        viewport,
        finalVideo: { width: 1280, height: 800 },
        durationSeconds: duration,
        operations:
          "Native navigation, native slot picker, native faculty comment add/edit. Only initial loading footage trimmed; H.264 encoded for delivery. No DOM replacement, UI overlays or fabricated records.",
      },
      fixture: {
        backend:
          "Loopback Vite local-god-mode plugin, real API handlers over in-memory harness store",
        schedule: term,
        bookings,
        occupancy: {
          visibleSlots: 6,
          booked: 3,
          available: 3,
          fractionBooked: 0.5,
        },
        feedback: {
          patient: "Ben Carter (patient_local_ben)",
          actor: "Dr. DPT Faculty (local-dev-faculty)",
          state:
            "Private faculty review draft; no feedback release or co-sign performed",
          teamComment: text.team,
          passageComment: text.passage,
        },
      },
      assets,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    assets.map(({ id, files, durationSeconds }) => ({
      id,
      files,
      durationSeconds,
    })),
    null,
    2,
  ),
);
