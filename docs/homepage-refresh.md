# simLAB homepage refresh — October 8, 2026

## Product and design brief

Lead with "Clinical reasoning, made visible." Explain the current PT/PTA learning environment through the patient encounter, differential diagnosis map, care planning, live classes and focused learning labs. Give program faculty a clear demo path and make sign-in requirements visible before visitors open simLAB.

Replace the expired September pilot estimate and old phase-by-phase screenshots. Keep DevPT's dark brand chrome, green accent and light editorial surfaces. Use deliberate feature selection and full-screen image inspection instead of automatic slides/video. Preserve a usable mobile menu and no-JavaScript fallback.

## Verified product scope

Reviewed current simLAB source at b69c3a6fc463f73a88e324688218484f4c0cf368 (October 8, 2026), particularly:

- apps/mission-shell/src/lib/ddx/PatientInterview.svelte and ReasoningMap.svelte
- DDx examination, care plan, follow-up and clinical instructor components
- apps/mission-shell/src/lib/classroom/ClassHost.svelte
- apps/mission-shell/src/lib/staff/StaffConsole.svelte
- AuthGate.svelte, ActivityRail.svelte and current native lab routes
- ADR-0024's September amendment, ADR-0027, ADR-0029, ADR-0032, ADR-0035 and ADR-0041

Case/library counts are intentionally omitted from marketing to avoid drift. Faculty control remains central: native DDx has formative feedback, no automatic score; graded classes can use faculty-entered DDx grades. Labs use educational models; no validated learning gain, biomechanics accuracy or replacement clinical hours are claimed.

## Screenshot provenance

All six new JPEG images are direct browser screenshots of the current source running locally at the same product revision. The homepage identifies them as demonstration screens; local preview/tool labels are retained where present. No image was generated, composited or presented as a production student record.

- clinical-workspace.jpg: James Morgan native hip case, Interview. One typed question using offline scripted practice.
- reasoning-map.jpg: same fictional case. Two illustrative hypotheses and two findings from the scripted interview connected through normal UI controls. The expanded map also includes the illustrative goal from care planning. It illustrates interaction, not an instructor-approved answer.
- care-plan.jpg: same fictional case, Assessment & plan. One illustrative goal entered through the UI. Incomplete steps were bypassed with the app's ordinary Continue anyway control solely to capture the interface; this was not a completed or assessed attempt.
- movement-lab.jpg: native Movement lab's default authored hip demonstration, paused.
- live-class.jpg and faculty-workspace.jpg: documented dev:users Simulated class world using in-memory synthetic faculty and learners. No production accounts or data.

Capture commands use pnpm 9.15.0, frozen dependencies and pinned submodules. Ordinary loopback dev is mock-only; dev:users runs local seeded handlers. Production auth and application source were not modified.

## Verification

Run `node --check app.js`, `node scripts/check-apps.mjs --no-ping`, and `git diff --check`. Inspect the homepage at desktop, tablet and phone widths, each tour panel, tab keyboard navigation, image dialog open/close/focus restoration, mobile navigation, footer catalog, all local assets and auxiliary pages. Use `npm run preview` so the draft must contain latest origin/main.
