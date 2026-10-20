# DevPT complete local preview

This is the actual DevPT homepage and product navigation with a resource library. Browse regions and topics, open prepared collections, explore source-owned interactive tools, save resources in this browser, and share one collection link. No account or lesson builder is needed.

## Open the exported package

1. Extract the entire ZIP to a folder.
2. Install Node.js 20 or newer if it is not installed.
3. On Windows, double-click `START-PREVIEW.cmd`. On macOS/Linux, run `./start-preview.sh`.
4. Keep that terminal open. The site opens at `http://127.0.0.1:8110`.

The launcher also serves canonical simPACS on port 5181. Close an earlier preview if either port is occupied. Do not open `index.html` directly.

Collection links work for someone who can reach the same site. A localhost link is for local review; after public hosting, the same route will use the public origin. Saved-resource IDs stay in this browser. Shared collections contain resource IDs, not student data or accounts. Copy-all-links provides separate interactive links for course materials.

The resource players, EMR note workspace and side rail run from generated builds of their owning repositories. SimLab and EMR product pages are retained. Features that depend on live cloud services, such as AI conversation, still require those services. The 3Dpain product demo uses its existing public source.

Gait ROM includes sagittal, frontal and transverse joint-angle line charts. Mark successive contacts of the same foot to align approximate reference phases; an unmarked full take uses native seconds. The separate Simulation panel runs the canonical simMOVE MuJoCo solver locally using the current native recording. Simulation results are model estimates; stopped or poorly tracked trials remain visible as such. Contact maps reflect the model's spatial resolution and assumptions. A separate Reference view provides illustrative teaching patterns.

## Rebuild from the workspace

In SimLab, run `node scripts/build-teaching-preview.mjs`. In the EMR repository, run `npm run build:teaching`. In simPACS, run `npm run build:teaching`. Then, in devpt-home:

```sh
npm run build:local
npm run build:local-physics
npm run preview:local
# Export to a new folder:
npm run package:local -- /workspace/scratch/devpt-site-local
```

The ordinary production preview and main-freshness checks remain in place. The explicit local target reviews the working tree.

`build:local-physics` bundles the canonical simMOVE CLI and its installed MuJoCo runtime; install simMOVE's locked npm dependencies first. The launcher runs only this fixed local simulation entry and requires no cloud compute service.

`source-manifest.json` records owning repositories, revisions, local source hashes and exported file hashes. Resource metadata comes from SimLab's teaching catalog. The `native/`, `emr-native/`, `pacs/` and `physics/` directories are disposable outputs. Update the owning source and rebuild; never maintain or edit an exported asset library.

This is a local development review, not a clinical acceptance or public release. The publication plan in `design-notes/` records outstanding review. Gait uses CC native walking clips and the original blank teaching model by default; ROM edits do not simulate physiological compensation.
