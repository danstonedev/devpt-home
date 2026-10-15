# DevPT product introduction and walkthroughs

DevPT has three distinct product lines: **simLAB**, **EMRs** and **3Dpain.app**. The hero reads **A Web App Platform for Developing Clinical Reasoning & Readiness**. The homepage introduces that family and gives each product its own route for a focused walkthrough:

- `/simlab/` preserves James Morgan's live guided visit, native study tools and student/faculty introduction.
- `/emrs/` introduces the education and clinic documentation workspaces.
- `/3dpain/` introduces the symptom-mapping workflow.

The brand homepage must not load the full simLAB walkthrough. Product pages share navigation and link back to DevPT, so visitors can compare the family without treating the other products as simLAB features.

## Established DevPT presentation

Use the active EMR design, rather than creating a separate marketing theme. The references are `src/app.css`, `src/routes/+layout.svelte`, `src/lib/styles/emrHeaders.css` and `src/lib/styles/noteGuide.css` in `danstonedev/devpt-emr-platform`. Its vendored `design-tokens/` folder is currently unused and is not the authority.

`emr-foundation.css` contains the selected active theme variables and shared public navigation/control styles. Keep the compact black application header, black text, neutral gray working surface, white content, green primary actions and matching section frames. The homepage introduces its products in a single directory with approved wordmarks. Use direct headings and useful product descriptions; avoid oversized slogans, numbered marketing tiles, extra product palettes and repeated promotional sections.

Refresh the selected variables with `npm run sync:brand`, then verify them with `npm run check:brand:source`. Both use the adjacent EMR checkout. The provenance manifest records the source revision and hashes. CI's `check:brand` verifies the committed CSS against that manifest; its explicit snapshot mode does not claim to inspect the latest private EMR source.

The product wordmarks in `assets/brand/` are byte-for-byte approved assets from the EMR's `static/brand/{simemr,probonoemr}/wordmark-on-dark.png` and PainMap's `static/3dpainapp-logo-640.png`. Keep them on dark surfaces with their aspect ratios preserved. Source-owned walkthroughs continue to render their own interfaces.

## Preserve the simLAB experience

The former homepage content was moved to `/simlab/`, including both native frames, chapter navigation, James's story, live study tools, student/faculty sections, screenshot enlargement and public fallback links. Assets and scripts use site-root paths so nested routes resolve correctly. The simLAB-specific demo enquiry remains on that page; the shared top navigation leads to the DevPT contact section.

The walkthrough uses the currently deployed simLAB public entry rather than a copied source build. Chapter names and study tools arrive in its versioned manifest. Keep the exact-origin/source checks, `referrerpolicy="origin"`, reduced-motion support, offscreen suspension and in-memory case retention described in [Live simLAB walkthrough](native-showcase.md).

## Product truth belongs with the products

Keep each product's capabilities, demonstration data, public entry and versioned contract in its owning repository. DevPT owns the introductory copy and framing. Do not recreate signed-in forms, clinical workflows or 3D controls in marketing code. A product change should update its public walkthrough from the same sources, as simLAB already does.

The app registry in `apps.json` records canonical launch URLs and repositories. Keep 3Dpain.app links aligned with the PainMap repository's domain record. Explain sign-in requirements before the visitor opens a protected workspace. Public demonstrations must identify their sample data and must not request a production patient or student account.

## Validation

Run `npm test`, JavaScript syntax checks and `git diff --check`. Inspect the homepage and all three product routes at desktop and phone widths, including navigation, local resources, full-view links and unavailable-embed fallbacks. Use `npm run preview` so a draft contains the latest `origin/main`.

Existing photographs and screenshots are supporting imagery; they are not a replacement for a product's live public walkthrough. Do not claim validated learning gains, clinical measurement validity, replacement clinical hours or biomechanics accuracy without evidence.

## Homepage feature previews

The homepage introduces three features from each product:

- simLAB: patient interview, connecting differentials and objective exam/observation with one preselected test per category, including vestibular BPPV testing.
- EMRs: note workspace, a student clinic schedule and faculty feedback with comments.
- 3Dpain.app: symptom mapping, pose/movement and timeline review of a pain progression.

All nine actions open real source-owned workspaces in one shared full-size iframe dialog. Each product's canonical URL and version marker are registered in `apps.json` under `showcase.workspace`. The dedicated guided walkthroughs remain separate. Public practice requires no account or real patient or learner record; changes stay in the sample.

simLAB uses `/showcase/?presentation=workspace&section=interview|reason|examine` on `lab.devpt.app`. It mounts the native patient toolbar, encounter activity and practice guest header with a fictional James Morgan case. The interview, reasoning map and observation-gated examination use the same components as the application. Objective examples cover each native major exam group; the vestibular BPPV choice uses the separately labeled native EyeLab sample rather than inventing a James finding.

The EMR source supplies `documentation|schedule|feedback` from `simemr.devpt.app`. Documentation edits use the real OrientationWriter. The shared native student schedule begins half booked and permits one practice booking; faculty feedback uses the real note renderer and review controls to add or edit sample comments. These data ports keep practice changes in memory and do not release feedback, sign notes or write patient records.

The pain-map source supplies `mapping|movement|timeline` from `www.3dpain.app`. Its native finding workflow, body renderer and pose/movement controls use an ephemeral sample. The real history preview reviews three source-owned synthetic snapshots. Account, assessment, persistence and export services are outside the public entry.

The public patient interview allows three actual AI exchanges, shared by typed and dictated questions. The source API owns the fixed patient prompt, durable allowance and bounded audio for its replies; provider keys remain on the server. A short-lived opaque grant resumes the remaining allowance across preview openings. The third reply includes the patient's demo farewell and invitation to contact [Dan Stone](mailto:daniel.j.stone@und.edu). Native rendering must create that known contact link explicitly, without rendering model output as HTML. Failures must be identified as failures, never passed off as AI with a scripted answer. Reasoning and examination do not spend conversation turns.

No simulator loads on the homepage until a visitor selects **Try live**. The dialog owns at most one iframe, validates its exact origin, source window and workspace catalog, and pauses when the page is hidden. simLAB additionally must advertise its fixed patient and three-exchange speech capability. Microphone permission is delegated only to simLAB's exact source origin and recording requires the visitor's action. Closing removes the iframe and returns focus to its trigger. Direct source links remain available without JavaScript or if an embed fails.

Before uploading the homepage, the release workflow requires the deployed `simlab-ai-preview:v1`, `emrs-workspace:v1` and `painmap-workspace:v1` markers and each source's DevPT framing policy. The simLAB API must also pass its read-only three-exchange readiness check. Older guided, recorded or scripted builds cannot satisfy those gates.

The six EMR and 3Dpain.app native PNGs remain launch posters, linked to their corresponding real workspaces. Their source revisions and capture details remain under `assets/features/{emrs,painmap}/`. The former recorded clips and software-rendered simLAB captures are retired from the homepage; do not reintroduce recorded playback in place of an interactive preview. Keep native poster aspect ratios intact.

All four product-page footers link **About Dan Stone** to the official UND directory bio and include the supplied LinkedIn profile. The outdated CV PDF and links to it are removed from the site.
