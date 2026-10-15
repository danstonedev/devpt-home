# Authentic simLAB feature previews

These are direct captures of the public simLAB UI at `danstonedev/simlab` commit **`c08e40a54b8401e1b9b082cb23d2b2b8598ecc3b`**, captured on October 15, 2026. All recorded submodules were initialized at that commit's declared pins. `provenance.json` records those pins, exact routes, dimensions, file sizes, SHA-256 hashes and capture checks.

| Feature               | Poster / silent clip                      | Native source and action                                                                                                                                                                                                                  |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patient interview     | `interview.png` / `interview.mp4`         | `/showcase/?chapter=listen`: real `PatientInterview.svelte`, James's authored case, native question button and typed question.                                                                                                            |
| Working differentials | `differentials.png` / `differentials.mp4` | Enter Listen, ask the native pattern question, then open Connect (`?chapter=reason`). In the real `ReasoningMap.svelte`, remove and restore one of the public sample's own evidence-to-hypothesis connections using its accessible ports. |
| Passive ROM           | `passive-rom.png` / `passive-rom.mp4`     | `/showcase/?chapter=examine`: James's real `bx-prom-hip-flexion-right` examination, builder kind `prom`, right hip, supine. Let the original observation complete, then use the native timeline, Loop and Play controls.                  |

The sample uses James Morgan (`patient-james-morgan`, case `hip-groin-64`) and synthetic authored case content. It displays **Scripted case practice** and **Illustrative working hypotheses**. It does not demonstrate a protected AI call, use a production record, establish an assessed answer or record clinical acceptance. The PROM preview is the actual native passive hip-flexion workflow, not a renamed historical exam clip. The displayed finding follows the original completed native observation; the captured motion is its ordinary replay.

All posters and videos retain **1280 × 800 (16:10)**. Clips are approximately 12 seconds, H.264/yuv420p MP4 with no audio. The only video processing is trimming loading/preparation and transcoding the original browser recording; playback speed is unchanged. Posters are direct browser screenshots. There is no compositing, copied interface, custom rendering adapter, substituted patient or source modification.

The cloud machine renders through SwiftShader. simLAB's own adaptive software-render budget remains enabled, so the interview's 3D canvas reduces resolution while the native interface text remains sharp. The interview poster is the first clear ready frame. This is a source-rendered capture, without artificial sharpening or a fake high-quality replacement.

Each capture asserted the exact simLAB build stamp, no page errors and no protected `/api/` requests. The PROM player and original observed finding also loaded normally. The existing focused public-showcase unit suite validates the real case, current catalogue, observation gate, exact trusted parents and separate public entry.

## Reproduce

Use the existing cloud checkout; do not create a worktree for setup. Preserve local changes before selecting the recorded source revision. Do not replace a declared submodule pin with a newer checkout to work around a fetch failure.

```bash
cd /workspace/simlab
# Select the exact source commit above when reproducing these assets.
git -c http.version=HTTP/1.1 submodule update --init --recursive --jobs 4 --depth 1
git submodule status --recursive  # every line starts with a space; no +, - or U

PATH=/workspace/.setup-cache/npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH \
COREPACK_HOME=/workspace/.setup-cache/corepack \
corepack pnpm --filter @vspx/mission-shell... install --frozen-lockfile \
  --store-dir /workspace/.setup-cache/pnpm-store

PATH=/workspace/.setup-cache/npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH \
COREPACK_HOME=/workspace/.setup-cache/corepack \
corepack pnpm --filter @vspx/mission-shell dev --host 127.0.0.1 --port 5180 --strictPort
```

This uses the repository's pinned pnpm 9.15.0 and cached Node 22.23.3. The explicit Corepack and pnpm cache locations avoid unavailable home-directory defaults. The supported Git HTTP/1.1 option resolved a transport stall; TLS and artifact validation remain enabled. Earlier upstream HTTP 503 failures recovered before capture. The product and lockfiles were unchanged when the clean source checkout advanced from `18159e1` to the recorded capture commit.

The existing `predev` script prepares ignored SvelteKit config stubs in the source-consumed submodules. No account or backend service is required for the public sample. Keep the development server running while capturing.

Use the homepage's installed Playwright dependency and system Chromium/FFmpeg. For Playwright's supported browser-cache location in this cloud instance:

```bash
mkdir -p /workspace/.setup-cache/playwright/ffmpeg-1011
# Create this link only when it is absent; it uses the installed system encoder.
test -e /workspace/.setup-cache/playwright/ffmpeg-1011/ffmpeg-linux || \
  ln -s /usr/bin/ffmpeg /workspace/.setup-cache/playwright/ffmpeg-1011/ffmpeg-linux

cd /workspace/devpt-home
PLAYWRIGHT_BROWSERS_PATH=/workspace/.setup-cache/playwright \
/workspace/.setup-cache/npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node \
  assets/features/simlab/capture.mjs
```

`SIMLAB_SOURCE_DIR` and `SIMLAB_SHOWCASE_URL` can select another local checkout/server. `SIMLAB_FEATURES=passive-rom` reruns only that feature while retaining same-source provenance for the others. After a source revision changes, capture all three again as one set. The script verifies the build and declared pins, interacts only with the native public UI and regenerates the provenance hashes.

Homepage clips are dated editorial previews. The dedicated `/simlab/` walkthrough continues to embed the product-owned live entry at `https://lab.devpt.app/showcase/`.
