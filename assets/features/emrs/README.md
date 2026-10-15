# Native EMR feature previews

These are actual browser captures of `danstonedev/devpt-emr-platform` at
`0d80673ef1e074c673921c1432f3bc6c802539d8` on October 15, 2026. All patient,
student and faculty information comes from its prepared local practice fixtures.
No production patient record, production account or authentication token was used.

| Preview            | Native surface                                                                                          | Visible capability                                                                                                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `workspace`        | `/showcase/` on the source-owned public entry                                                           | The real Orientation note writer: Subjective, Objective and Plan navigation with a prepared Robert Castellano practice note.                                                                                                                |
| `student-schedule` | `/workspace/scheduling` on local proBonoEMR                                                             | Alex DPT Student's course calendar. Exactly three of the six slots visible in the first three course weeks are booked. The clip opens the native booking dialog and selects available team dates; it cancels without adding a fourth visit. |
| `faculty-feedback` | `/oversight/review?patient=patient_local_ben&clientKey=note%3Apatient_local_ben%3Aeval%3ADPT&version=1` | Dr. DPT Faculty adds a team message and a comment linked to highlighted note text, then edits the passage comment. These are saved review drafts; no feedback release or co-sign is performed.                                              |

Each name has a 1440×900 PNG poster and an approximately eleven-second,
1280×800 H.264 MP4 with no audio. Both use a 16:10 aspect ratio. The student
poster preserves the real one-team layout, including its open space below the
calendar. There are no substituted controls, DOM overlays, fabricated screenshots
or composited clinical records. The local development badge remains visible.

The capture workflow uses the product's actual API handlers over its in-memory
local fixture store. It configures a term and books three appointments through
the native endpoints; it adds and edits faculty comments through the actual UI.
The public note writer remains memory-only. The only video processing trims
initial page loading and encodes the recording for web delivery.

## Reproduce

Requirements: Node 22+, Chromium, system `ffmpeg`/`ffprobe`, the homepage's
Playwright dependency, and the adjacent EMR checkout with its root/API dependencies
and bundled API runtime prepared. The script uses a dedicated local proBono
instance and resets that instance's in-memory fixture world before capture.

In the EMR repository, run the two native servers:

```sh
npm run dev:probono # loopback port 3001; in-memory fixture backend
npm run dev:showcase # loopback port 5181; public native writer
```

In the homepage repository:

```sh
# Standard Playwright FFmpeg helper, when not already installed:
npx playwright install ffmpeg
PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node assets/features/emrs/capture.mjs
```

This cloud session reused the installed system FFmpeg through a writable,
Playwright-compatible helper directory instead of downloading another binary:

```sh
mkdir -p /tmp/devpt-media-playwright/ffmpeg-1011
ln -sf /usr/bin/ffmpeg /tmp/devpt-media-playwright/ffmpeg-1011/ffmpeg-linux
PLAYWRIGHT_BROWSERS_PATH=/tmp/devpt-media-playwright \
  PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium \
  node assets/features/emrs/capture.mjs
```

The script validates local fixture mode, native roles, and 50% occupancy. It uses
the next Monday relative to capture day, so recaptures keep the calendar valid.
It never changes product source. `source.json` records exact routes, source
revision, actor identities, setup, clip dimensions/durations, byte counts and
SHA-256 digests. All three posters and sampled video frames were visually
reviewed; all MP4s decoded without errors.
