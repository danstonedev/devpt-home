# Native simLAB knee preview

The files `native-joints/index.ts` and `native-joints/knee.ts` are byte-for-byte
copies of the Git blobs for `packages/ddx/src/joints/index.ts` and `packages/ddx/src/joints/knee.ts`
from DEVPT simLAB commit `b69c3a6` (8 October 2026). They retain the source's
teaching bounds, smoothing, coupled tibial rotation, patellar tracking and segment
transforms. `upstream-sha256.json` records the exact copied bytes, independent of checkout line-ending settings.

`joint-preview.mjs` is a homepage rendering adapter. It finds a requested angle
along the existing flexion preset's forward movement segment, samples that
preset unchanged, and applies all three native rigid segment transforms. It
does not infer patient measurements, diagnosis, loading, force, clinical
acceptance, treatment efficacy or tissue mechanics. It retains a bones-only
view; capsule and other tissue meshes are hidden rather than shown without their
native deformation behavior.

`knee.glb` and `knee.meta.json` are unmodified copies of the Git blobs for the corresponding files
under `apps/mission-shell/src/lib/lab/joints/assets` at the same commit. Anatomy
source, license and modification history are retained in `knee-attribution.md`.
Keep visible AnatomyTool/LUMC and CC BY-SA 4.0 links with the displayed anatomy.

Runtime dependencies are Three.js (including GLTFLoader and OrbitControls) and
the copied native sampler. No live API, Microsoft account, AI provider,
Svelte component or complete simLAB app is needed for this reference preview.
Bundle the module as ESM in this directory so its relative `knee.glb` URL stays
valid. The page should dynamically import the bundle only after the Load button
is pressed and call the exported `mountJointPreview(root)`.
