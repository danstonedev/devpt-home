# 3Dpain native feature media

These previews show native 3Dpain UI. No controls or screen content were drawn,
restyled, composited, or generated for the DevPT homepage.

## What is shown

- **`mapping` — Map symptoms on the body.** The MP4 is the product's committed
  `static/hero/workspace-paint.mp4` recording, copied without modification. The
  landscape PNG is a fresh native workspace capture of the owner-authored
  `e2e/fixtures/painted-map.json` fixture. Its seven findings are existing geometry;
  the capture does not paint or test strokes.
- **`movement` — Position the body with the Pose tool.** The MP4 is the product's
  committed `static/hero/workspace-pose.mp4`, copied without modification. It
  actively demonstrates native joint-handle positioning. The fresh landscape PNG
  shows the current Pose tool with its green joint handles and full body in frame.
  It does not claim to be a recording of the separate Movement preset workflow.
- **`timeline` — Review maps over time.** The fresh MP4 and PNG show the actual
  `HistorySnapshotPreview` on the native assessment progress route. Native Play
  and snapshot buttons traverse three **synthetic sample visits**, dated October
  1, 8 and 15, 2026. The visits contain the first 1, 3 and 5 findings from the
  existing owner-authored fixture, respectively. They are examples of stored map
  states, not a real patient's clinical course. The native `Metrics unavailable`
  labels remain where visible; no measurements or claims of improvement or
  worsening were invented. The captured sequence includes real state 1 → 2 → 3
  changes and manual review. Its timing is accelerated to about 14 seconds.

## Provenance and limits

The source is `danstonedev/3DPainMap`, checkout
`b8669ea13ff6dff318e237d9d57a3bd72a9c3210`. Its complete tree is identical to
merged main `42286bbdbcabbbde19a3758c0030d75d4bd2bba4`
(tree `b745d2f038274d4ba199e06b73ee7c876ec6eef8`). The `pose-engine` submodule is
`db90f127d2361d388ba01c9ee6ff4a7fa933f755`.

The two reused clips are the source-owned recordings exposed by the native hero
catalog in `src/lib/marketing/v2/siteContent.ts` and the public `/showcase/` route.
Their original capture implementation is `scripts/capture-homepage-demos.mjs`.
They retain their native **390×720 portrait** aspect and 25 fps. The homepage must
contain them without cropping or stretching. The fresh posters and timeline are
**1280×800 landscape**. The source recordings and fresh fixture posters use
separate sample workspaces and need not show the same body or findings.

Fresh media was captured from a local e2e-mode development server, not from a
live production patient workspace. The fixture helper deliberately creates the
synthetic patient `Painted Fixture`, MRN `BC-FIXTURE`. The geometry fixture carries
no patient identity or notes. The local access badge is native development UI.

Only this media folder was edited. No product source changes, new painting
strokes, pose-handle drags, or gesture-feel tests were performed. This follows the
product's `CLAUDE.md` and its sanctioned `e2e/paintedMap.ts` fixture-loading route.

Machine-readable file dimensions, durations, sizes, hashes, exact routes, source
paths, and the final recording timing are in `provenance.json`.

## Repeat the capture

Use Node 22+, the source checkout and its pinned `pose-engine`, frozen installed
source dependencies, Chromium and FFmpeg. Prepare the product according to its
own setup instructions, including `node scripts/copy-3d-assets.mjs`. Start its
supported e2e development mode in one terminal:

```sh
cd /workspace/3DPainMap
npm run dev -- --mode e2e --host 127.0.0.1 --port 5182 --strictPort
```

Run this folder's capture helper in another terminal:

```sh
PAINMAP_SOURCE_DIR=/workspace/3DPainMap \
PAINMAP_CAPTURE_URL=http://localhost:5182 \
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium \
PAINMAP_FFMPEG=/usr/bin/ffmpeg \
node --experimental-strip-types \
  /workspace/devpt-home/assets/features/painmap/capture.mjs
```

The helper copies the existing native MP4s losslessly, uses the committed fixture
helper to open a painted workspace, uses the native Pose tool and camera controls
for its landscape poster, and saves synthetic visits with the product's own
persistence service. It then captures native History playback. The raw recording
is kept under `/tmp/devpt-painmap-feature-capture`; it trims to the demonstrated
sequence, accelerates timing when longer than 14 seconds, encodes H.264 / yuv420p
with faststart and no audio, and atomically replaces `timeline.mp4`. It logs exact
raw filename and trim timing. It never changes the product checkout.

Viewport framing and elapsed capture timings can vary with the installed browser
and GPU. Inspect the resulting PNGs and decode the timeline clip before publishing.
