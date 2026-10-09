# simLAB homepage refresh — October 8, 2026

## Product and design brief

Lead with "Clinical reasoning, made visible." Explain the current PT/PTA learning environment through the patient encounter, differential diagnosis map, care planning, live classes and focused learning labs. Give program faculty a clear demo path and make sign-in requirements visible before visitors open simLAB.

Replace the expired September pilot estimate and old phase-by-phase presentation. Keep DevPT's dark brand chrome, green accent and light editorial surfaces. The current gallery embeds the actual native workspaces rather than simplified replicas of their controls. Preserve the sterile Body teaching view as the default, a usable mobile menu and no-JavaScript fallback.

## Verified product scope

Current native showcase source is pinned to **61a664ca5706c19cddb8842fbfec1f0118121917** (`61a664c`). The original product/screenshot audit used b69c3a6fc463f73a88e324688218484f4c0cf368 (October 8, 2026), particularly:

- apps/mission-shell/src/lib/ddx/PatientInterview.svelte and ReasoningMap.svelte
- DDx examination, care plan, follow-up and clinical instructor components
- apps/mission-shell/src/lib/classroom/ClassHost.svelte
- apps/mission-shell/src/lib/staff/StaffConsole.svelte
- AuthGate.svelte, ActivityRail.svelte and current native lab routes
- ADR-0024's September amendment, ADR-0027, ADR-0029, ADR-0032, ADR-0035 and ADR-0041

Case/library counts are intentionally omitted from marketing to avoid drift. Faculty control remains central: native DDx has formative feedback, no automatic score; graded classes can use faculty-entered DDx grades. Labs use educational models; no validated learning gain, biomechanics accuracy or replacement clinical hours are claimed.

## Screenshot provenance

The six JPEG images below are historical supporting captures from b69c3a6, not the provenance of the new native build. They are direct browser screenshots of local demonstration source. The homepage retains movement-lab.jpg as a no-JavaScript fallback and faculty-workspace.jpg as supporting faculty imagery. No image was generated, composited or presented as a production student record.

- clinical-workspace.jpg: James Morgan native hip case, Interview. One typed question using offline scripted practice.
- reasoning-map.jpg: same fictional case. Two illustrative hypotheses and two findings from the scripted interview connected through normal UI controls. The expanded map also includes the illustrative goal from care planning. It illustrates interaction, not an instructor-approved answer.
- care-plan.jpg: same fictional case, Assessment & plan. One illustrative goal entered through the UI. Incomplete steps were bypassed with the app's ordinary Continue anyway control solely to capture the interface; this was not a completed or assessed attempt.
- movement-lab.jpg: native Movement lab's default authored hip demonstration, paused.
- live-class.jpg and faculty-workspace.jpg: documented dev:users Simulated class world using in-memory synthetic faculty and learners. No production accounts or data.

Capture commands use pnpm 9.15.0, frozen dependencies and pinned submodules. Ordinary loopback dev is mock-only; dev:users runs local seeded handlers. Production auth and application source were not modified.

## Verification

Run `node --check app.js`, `node --check native-showcase.js`, `node scripts/check-apps.mjs --no-ping`, and `git diff --check`. After rebuilding, inspect the served homepage and native workspaces at desktop, tablet and phone widths. Check iframe/full-view navigation, scene loading, native picker/playback/camera keyboard access, mobile scrolling, image dialog focus, footer catalog, local assets and auxiliary pages. Use `npm run preview` so the draft must contain latest origin/main.

## Native showcase replaces the earlier previews

The earlier Jamie Reed buttons, two-column DOM/SVG reasoning replica, fixed class-word reveal and custom knee-angle viewer are superseded. `experience.*`, `reasoning-demo.*` and `demos/` are not loaded by the current homepage. The native showcase uses the actual Svelte components, clinical case content and renderer modules from `61a664c`, with homepage framing and local demonstration state.

The default gallery starts with the sterile Movement lab teaching baseline. Visitors can also explore native patient/environment presentation, PatientInterview, ReasoningMap, JointLab, EyeLab, NeuroLab, AquaticLab and LiveVitalsLab. Component details, pinned submodules, service boundaries and reproducible build steps are documented in [Native showcase](native-showcase.md).

The public interview uses the actual James Morgan case and native authored replies, with **Scripted case practice** displayed. Native selected-text evidence capture and reasoning controls share one in-memory Session. Switching views, another gallery area or an offscreen pause retains that case state; changing the patient or explicitly resetting starts a new sample. No AI API/account capability or persistent learner record is supplied by the showcase host. Browser Talk/dictation can use the browser speech service only after explicit activation; native notices describe that path. Existing homepage analytics remains configured.

Additional checks cover typed authored responses, native evidence capture/flags, diagnosis picker and connection controls, transcript source navigation, reset, session retention, scene cleanup and native model credits. The checked-in `showcase/` build is deployed by Azure without a build step. Regenerate it with `npm run build:native`, then review and commit its output with wrapper changes. `build:demos` remains only for the older asset adapter.
