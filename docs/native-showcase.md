# Native simLAB showcase

## Source and scope

Repository: `danstonedev/simlab`.

Pinned commit: **61a664ca5706c19cddb8842fbfec1f0118121917** (`61a664c`).

`showcase-src/` owns only homepage framing, scene selection and demonstration state. It imports the real components
and renderer modules from the clean source checkout at `../simlab-native-source`; product source is not modified.
Native labels, controls, teaching notes, clinical bounds and attribution remain native.

| Area                      | Source under `apps/mission-shell/src/lib`                | Native behavior                                                                                      |
| ------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Patients & environments   | `ddx/InterviewPatient.svelte`, `ddx/RoomSelector.svelte` | Patient renderer, room selection, camera controls and clinical environments                          |
| Patient interview         | `ddx/PatientInterview.svelte`                            | Type/Talk, composer/send, planned questions, transcript and selected-text evidence capture           |
| Reasoning & evidence      | `ddx/ReasoningMap.svelte`                                | Diagnosis/finding pickers, ports, Supports/Weakens, flags, pins, likelihood and interview-plan lanes |
| Sterile teaching baseline | `lab/MovementLab.svelte`                                 | Native catalog, presets, Body stage, examiner aids, findings, tailoring and playback                 |
| Joint mechanics           | `lab/JointLab.svelte`                                    | Anatomy layers, authored motion, teaching notes and synchronized technique views where available     |
| Eye examinations          | `lab/EyeLab.svelte`                                      | Native patient/eye views, vestibular presets and examination/playback controls                       |
| Neuro lab                 | `neuro/NeuroLab.svelte`                                  | Stimulus, pathways, sensory endings, anatomy and lesion controls                                     |
| Aquatic Therapy           | `aquatic/AquaticLab.svelte`                              | Pool scene, immersion/dose/movement, modeled responses and documentation                             |
| Live Vitals               | `liveVitals/LiveVitalsLab.svelte`                        | Authored profiles, posture, effort, time, readings and response trends                               |

The gallery opens Movement lab's **sterile teaching view**. Its Body baseline remains unchanged: `labPlayer` creates
the default `createMovementStage` without a clinical room. Native patient identity and rooms are optional
presentation layers, not changes to the movement sampler. Room choices are Outpatient PT, Inpatient room and
Performance gym. `labcuration.ts` selects existing demonstrations instead of creating new clinical exercises.

`PatientScene.svelte` supplies a labeled presentation sequence around the actual patient renderer. Its listening,
thinking and answering signals demonstrate gestures and appearance; they are not a live AI conversation or learner
record. Identities and opening words come from the native case catalog. Native room/camera controls remain intact.

## Public case and service boundaries

`CaseWorkspace.svelte` mounts the real interview and reasoning components with one in-memory native Session. James
Morgan, 64 (`hip-groin-64`), is the default. The starting referral pins, diagnoses and interview-plan questions are
example selections from native data, not an assessed answer or seeded correct ranking.

The host uses native `createSession`, `patientReply`, `validPlannedQuestionContext`, `captureEvidence`,
`toggleFindingPin`, `addHypothesis` and `getFindingFlagColors`. Authored replies produce native messages and disclosed
findings; visitors capture excerpts with native `EvidenceText` controls. The same state is used in ReasoningMap.

View changes do not recreate the Session. `active=false` unmounts native children while the outer host retains its
case state across other gallery areas/offscreen pauses. Selecting another patient or **Reset demonstration** starts
a new sample. Native child editor state resets with the new session. No learner attempt is persisted or submitted.

The public case passes `aiConfigured=false`, displays **Scripted case practice**, and receives only an authored reply
callback. It does not mount `AuthGate` or `DdxActivity`, provide API/token callbacks, or enable protected realtime or
`/api/speak` access. Production authentication is unchanged. Native Talk/dictation may use browser speech recognition
after explicit activation; native notices explain that behavior. Existing homepage analytics remains configured.

The same-origin homepage and iframe coordinate selected areas and visibility using messages checked against the
expected window. One lab workspace is mounted at a time; case state is retained separately. Native full-view routes
also work without the homepage iframe. Wrapper sizing provides the native `.ddx-body` container and scrolling,
while the product's controls and layouts remain unchanged.

Offscreen lab/scene suspension releases the renderer; returning mounts a fresh exploration. The sample case Session
survives, including its transcript, captured evidence and map. Opening a separate full view starts a separate local
demonstration, preserving the selected area and URL-backed joint selection rather than the in-memory exploration.

## Frozen source and build

The build was tested with Node.js 22.19.0. The build script enables TypeScript stripping for native plugin imports.
Use pnpm 9.15.0, as declared by simLAB.
From this homepage checkout:

```bash
git clone https://github.com/danstonedev/simlab.git ../simlab-native-source
git -C ../simlab-native-source checkout --detach 61a664ca5706c19cddb8842fbfec1f0118121917
git -C ../simlab-native-source submodule update --init --recursive
pnpm --dir ../simlab-native-source install --frozen-lockfile
npm ci
npm run build:native
```

For an existing checkout, inspect its changes before switching revisions. `SIMLAB_SOURCE_DIR` overrides the default
sibling path. Preserve recorded submodule commits; do not update them with `--remote`. Relevant root pins are:

| Submodule         | Commit                                     |
| ----------------- | ------------------------------------------ |
| `pose-engine`     | `0a5f11ffb0844c9eea4e4a78aa3be1186b01e4be` |
| `scenario-engine` | `ce212a093f40dbaa9c840299ace5656edafa09fa` |
| `apps/painmap`    | `13f9095bc08826dc5298382714eb4ac59704885a` |
| `apps/simvitals`  | `2252d655ad12cbc22ca9aec1ca5df3e1c06787ad` |

`showcase/source.json` records the full commit and all recursive/nested submodule statuses. The builder verifies the
pinned HEAD and tracked source cleanliness, prepares ignored SvelteKit config stubs for source submodules, and runs
Vite. Native asset plugins retain the pose-engine, PainMap and Aquatic runtime assets under `/showcase/`.

## Generated deployment assets

The builder regenerates `showcase/`: HTML, hashed JavaScript/CSS, models/runtime assets, `source.json` and `credits/`.
It also copies root `simlab-logo.png`. The packaged credits include joint anatomy attribution, patient/room metadata
and Svelte/Three.js licenses. Preserve native on-screen source links and teaching/model caveats.

Review and commit generated output with source-wrapper changes. Azure uploads the repository root with
`skip_app_build: true`; it does not fetch simLAB or run npm/pnpm/Vite during deployment. Source edits alone do not
update the deployed showcase. Serving already checked-in output does not require the sibling source checkout.

The superseded `experience.*`, `reasoning-demo.*` and `demos/` adapters are not loaded by the current homepage.
`build:demos` remains for those historical assets. Use **`build:native`** for the current product showcase.
