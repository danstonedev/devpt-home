# DevPT product introduction and walkthroughs

DevPT has three distinct product lines: **simLAB**, **EMRs** and **3Dpain.app**. The homepage introduces that family and gives each product its own route for a focused walkthrough:

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

- simLAB: patient interview, connecting differentials and passive range of motion.
- EMRs: note workspace, a student clinic schedule and faculty feedback with comments.
- 3Dpain.app: symptom mapping, pose/movement and timeline review of a pain progression.

simLAB's three actions open its real public practice workspace in one full-size iframe dialog. The source-owned URL is `/showcase/?presentation=workspace&section=interview|reason|examine` on `lab.devpt.app`. It mounts the native patient toolbar, encounter activity and guest header with a fictional James Morgan case. The interview, reasoning map and observation-gated examination use the same components as the application. Practice state stays in memory; this public entry requests no account, learner records or AI provider credentials. The dedicated guided `/simlab/` walkthrough remains separate.

No simulator loads on the homepage until a visitor selects **Try live**. The dialog owns one iframe, validates its exact origin, source window and `simlab-workspace` manifest, and pauses when the page is hidden. Closing removes the iframe and returns focus to its trigger. A full-view source link remains available without JavaScript or if the embed fails. The release workflow requires the deployed source's `simlab-workspace:v1` marker and DevPT framing policy before uploading the homepage; the older guided manifest cannot satisfy that gate. The former software-rendered simLAB captures are retired from the homepage.

The six EMR and 3Dpain.app previews retain their native screenshots and optional recorded clips under `assets/features/{emrs,painmap}/`, with source revisions and capture details alongside them. Use synthetic demonstration data and refresh exports from the owning workflows when those features change. Screenshots can be enlarged and remain available without JavaScript. Clips load only when requested, use native video controls and never start or loop automatically. The homepage pauses a clip when another starts, when it leaves view or when the page is hidden. Keep the complete native frame visible without stretching its interface.
