import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(resolve(root, file), "utf8");
const home = read("index.html");
const page = read("simlab/index.html");
const bridge = read("walkthrough.js");
const workspaces = read("feature-workspaces.js");

const features = [...home.matchAll(/<figure\b[^>]*data-workspace-preview="[^"]+"[^>]*>[\s\S]*?<\/figure>/g)].map(match => match[0]);
assert.equal(features.length, 9, "Every homepage feature needs a native workspace preview.");
for (const feature of features) {
  assert(feature.includes('class="feature-media"'), "Keep each poster, inline workspace and expand control in one stable media slot.");
  assert(/<a\b[^>]*data-workspace-launch[\s\S]*?<img\b[^>]*>/u.test(feature), "Every feature, including simLAB, needs a real website image linking to its native workspace.");
  assert(/<button\b(?=[^>]*data-workspace-expand)(?=[^>]*\bhidden\b)[^>]*>/u.test(feature), "A feature's one corner expand button stays hidden without JavaScript.");
  const source = feature.match(/<img\b[^>]*\bsrc="([^"]+)"/u)?.[1];
  assert(source?.startsWith("/assets/") && existsSync(resolve(root, source.slice(1))), "Every native website poster must be a shipped local asset.");
}
assert(!home.includes("data-workspace-try") && !home.includes("data-workspace-direct"), "Use the website poster and one expand control, without duplicate launch options.");
assert(/<div\b(?=[^>]*\bid="workspace-live-dialog")(?=[^>]*\brole="region")[^>]*>/u.test(home), "The retained live surface starts as an inline region and expands in place.");
assert(!/<iframe\b/u.test(home), "The homepage must not eagerly allocate product frames in static HTML.");
assert(workspaces.includes("patient-state") && workspaces.includes("settled-scene"), "Patient posters must wait for native settled-scene readiness, not just the document handshake.");

assert(
  !home.includes("data-live-showcase") &&
    !home.includes('src="/walkthrough.js"') &&
    !home.includes('src="walkthrough.js"'),
  "The DevPT homepage introduces all three products; the simLAB walkthrough lives on its dedicated page.",
);
assert(
  page.includes('data-live-showcase="tour"') &&
    page.includes('data-live-showcase="teaser"'),
  "The dedicated simLAB page must retain both live public scenes.",
);
const frames = [
  ...page.matchAll(/<iframe\b[^>]*data-live-showcase="(?:tour|teaser)"[^>]*>/g),
].map((match) => match[0]);
assert(
  frames.length === 2 &&
    frames.every((frame) => frame.includes('referrerpolicy="origin"')),
  "Trusted walkthrough frames must identify the DevPT origin even when the site suppresses cross-origin referrers.",
);
assert(
  page.includes('src="/walkthrough.js"') &&
    page.includes('href="/native-showcase.css"'),
  "The dedicated walkthrough must load its bridge and layout from the site root.",
);
assert(
  page.includes('id="flow"') &&
    page.includes('id="labs"') &&
    page.includes("data-start-walkthrough") &&
    page.includes("data-story-chapters") &&
    page.includes("data-live-study-tools"),
  "The dedicated page must retain the guided visit, chapter controls and live study-tool catalogue.",
);
assert(
  page.includes('href="https://devpt.app/simlab/"'),
  "The dedicated simLAB page must have its own canonical URL.",
);
for (const product of ["/simlab/", "/emrs/", "/3dpain/"])
  assert(
    page.includes(`href="${product}"`),
    "The walkthrough must keep all three product paths reachable.",
  );
assert(
  !/\b(?:src|href)="(?:assets\/|(?:styles|native-showcase)\.css|(?:app|walkthrough)\.js)/.test(
    page,
  ),
  "A nested walkthrough must use site-root asset paths.",
);
assert(
  !page.includes('src="showcase/') &&
    !page.includes('src="/showcase/') &&
    !page.includes("native-showcase.js"),
  "The walkthrough must not load a vendored simulator.",
);
assert(
  bridge.includes("https://lab.devpt.app/showcase/"),
  "The production walkthrough must come from simLAB.",
);
assert(
  bridge.includes("manifest.chapters") &&
    bridge.includes("manifest.studyTools"),
  "Navigation must use the live simLAB catalogue.",
);
assert(
  bridge.includes("event.origin !== endpoint.origin") &&
    bridge.includes("item.contentWindow === event.source"),
  "The live bridge must trust only its own exact-origin simLAB frames.",
);
assert(
  bridge.includes("simlab-showcase-visibility") &&
    bridge.includes("IntersectionObserver") &&
    bridge.includes("visibilitychange"),
  "Offscreen and background frames must pause their live workspaces.",
);
assert(
  !existsSync(resolve(root, "showcase-src")) &&
    !existsSync(resolve(root, "scripts/build-native-showcase.mjs")),
  "Remove pinned simulator copies/builders to prevent drift.",
);
assert.deepEqual(
  readdirSync(resolve(root, "showcase")),
  ["index.html"],
  "Only the old-bookmark redirect may remain locally.",
);
assert(
  !/61a664c|SIMLAB_SOURCE_DIR/.test(bridge),
  "The walkthrough must not pin a simLAB source snapshot.",
);
console.log("Dedicated live simLAB walkthrough integration checks passed.");
