# Native simLAB student feature previews

These 1280 × 800 (16:10) exports show the actual student application at `/`, built in production mode from **`292497b7249045b27edd86bfcb3c58fecb2026fe`**. That source SHA was verified in the live `https://lab.devpt.app/` App bundle before capture and checked again afterward. `provenance.json` records both live and locally served bundle hashes, the seven declared submodule pins, native routes, actor, dimensions, durations, file hashes, API responses and observed PROM timing.

The frontend was served locally with simLAB's supported synthetic user/class backend. These are production builds of live-deployed source, **not literal signed-in production recordings**. All patient and account data are synthetic. The source checkout, authentication gate, authorization checks, clinical bounds and observation gates remain intact.

| Preview                                   | Native surface and interaction                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interview.png` / `interview.mp4`         | Actual student **Interview**, native 3D James Morgan and original authored case opening. The clip types an unsent question. The poster is the original frame 0.5 seconds into that clip, before typing.                                                                                                                                                                                |
| `differentials.png` / `differentials.mp4` | **Chart review & plan**. Pin the native referral reason, add three working hypotheses, connect the charted finding to two differentials using native ports. These are student-entered hypotheses, not a graded answer.                                                                                                                                                                 |
| `passive-rom.png` / `passive-rom.mp4`     | The same student encounter's **Examination**. Plan right passive hip internal rotation, use the native Objective Conversation command **“Check right passive hip internal rotation in sitting”**, complete the six-second native observation, then replay using native Loop/timeline controls. The original result is 10° with the authored familiar groin ache and capsular end-feel. |

Faculty create a James Morgan practice class through `/?class=host`; Alex DPT Student joins with its code. The app supplies the resulting `/?classSession=…&mission=hip-ddx-practice` route. Stage progression uses the ordinary Next buttons and Continue anyway advisories for this incomplete educational encounter. No completion or clinical acceptance is claimed.

The current deployed source defaults `demonstrationControls` to false. Capture checks reject the public `/showcase/` entry, Local tools, hand-gesture demonstrations, Patient Actions and the development scripted-case badge. Full student header, sidebar, patient identity and stage toolbar remain visible.

## Runtime limits

The official local backend runs real user/class handlers over in-memory synthetic stores. Its AI/EMR pass-through points to unused loopback port 65530. Automatic voice preparation reads authored persona instructions; local health and spoken audio are unavailable (500/503 responses are retained in provenance). No AI reply, realtime token, microphone or external provider is used. The patient voice is muted with the native control.

The machine renders through SwiftShader. The product's adaptive software-rendering budget can soften the 3D image while interface text stays sharp. No renderer override, artificial sharpening, overlay or crop is applied. Each silent H.264 clip is approximately 12 seconds and retains the full native frame.

## Reproduce

Use sibling checkouts at `/workspace/simlab` and `/workspace/devpt-home`, Node 22 and the repository-pinned pnpm 9.15.0. The tested environment has system Chromium and FFmpeg. The cached tool paths below are specific to this cloud workspace.

```bash
export PATH=/workspace/.setup-cache/npm/_npx/52027bd8fc0022aa/node_modules/node/bin:$PATH
export COREPACK_HOME=/workspace/.setup-cache/corepack
cd /workspace/simlab
git submodule update --init --recursive
corepack pnpm --filter @vspx/mission-shell... install --frozen-lockfile --store-dir /workspace/.setup-cache/pnpm-store
corepack pnpm --filter @vspx/mission-shell build
```

Start the official synthetic API in one terminal. Port 65530 must be unused; unmatched AI/EMR endpoints stay on loopback.

```bash
cd /workspace/simlab
VITE_API_PROXY_TARGET=http://127.0.0.1:65530 corepack pnpm --filter @vspx/mission-shell dev:users --host 127.0.0.1 --port 5183 --strictPort
```

Serve the plain production build in another terminal:

```bash
cd /workspace/simlab
SIMLAB_SOURCE_DIR=/workspace/simlab SIMLAB_LOCAL_API=http://127.0.0.1:5183 corepack pnpm --filter @vspx/mission-shell preview --config /workspace/devpt-home/assets/features/simlab/preview.config.mjs --host 127.0.0.1 --port 5184 --strictPort
```

`preview.config.mjs` imports the native Vite configuration and changes only the preview API proxy to preserve the browser Host (`changeOrigin: false`). This keeps the real same-origin write guard working across the two loopback ports. Both preview configuration and capture script reject remote API targets.

Generate a fresh receipt from the public deployed HTML/App bundle using normal `curl`, which inherits the managed environment's HTTPS proxy and CA configuration:

```bash
cd /workspace/devpt-home
SIMLAB_SOURCE_DIR=/workspace/simlab node assets/features/simlab/verify-live.mjs /tmp/simlab-live-release-proof.json
SIMLAB_PREFLIGHT_ONLY=1 SIMLAB_LIVE_PROOF=/tmp/simlab-live-release-proof.json node assets/features/simlab/capture.mjs
```

The verifier checks the exact checkout SHA appears in the public production bundle and writes its SHA-256. The capture preflight requires that verified live receipt, a clean tracked source tree, initialized declared submodule pins, and a locally served production App bundle containing the same SHA. A stale source checkout or stale local build fails before recording. Run the full native capture:

```bash
PLAYWRIGHT_BROWSERS_PATH=/workspace/.setup-cache/playwright SIMLAB_SOURCE_DIR=/workspace/simlab SIMLAB_LIVE_PROOF=/tmp/simlab-live-release-proof.json node assets/features/simlab/capture.mjs
```

The script uses the official synthetic actor/world cookies from simLAB's user browser tests, then ordinary faculty/student UI admission. It asserts Alex's student identity, the native `.ddx` workspace and current production controls. It reads the saved session only to verify hypotheses and completed observation; it never writes session state or stages. All three previews are refreshed together, using native browser recordings and lossless poster screenshots (the interview poster uses its original encoded video frame). Hashes are regenerated after export.

The homepage previews are dated exports. The dedicated `/simlab/` walkthrough continues to use the source-owned live public showcase. Update these media from the actual student workflow whenever the demonstrated product changes.
