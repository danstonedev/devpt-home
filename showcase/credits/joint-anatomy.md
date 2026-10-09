# Hip, knee, ankle, and foot teaching anatomy

Source: AnatomyTool Open 3D Anatomical Model, Leiden University Medical Center and collaborators, derived through Z-Anatomy and BodyParts3D.

- Source and credits: https://anatomytool.org/open3dmodel-learn and https://anatomytool.org/open3dmodel-credit
- Model license: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/
- Input: simPACS lower-limb.glb, SHA256 5a889d5cae00421885aaf1841e72364e5f215f0c29fb0116ca5e9844ec4c5fe7
- Hip modifications: extracted seven structures, baked transforms, fitted an idealized joint center to femoral-head cartilage, added rigid pelvis/femur controls, and recentered the model.
- Knee modifications: extracted ten structures, baked transforms, fitted posterior femoral condylar cartilage spheres, centered their midpoint, aligned the fitted hinge to +X, and added independent rigid femur, tibia/fibula, and patella controls. Cartilage and menisci are retained as hidden future tissue layers.
- Ankle modifications: extracted 33 structures, derived a transverse hinge from the central sagittal talar-dome cartilage strip, recentered the model, and added rigid tibia, fibula, talus, and foot-context controls. The editable project preserves individual foot bones. The runtime batches and simplifies only neutral foot context, with a measured bidirectional vertex-to-surface deviation below 0.75 mm; the joint bones and capsule keep their source geometry.
- Foot modifications: extracted 27 source bone structures into eight rigid groups (talus, calcaneus, navicular, cuboid, cuneiforms, first ray, central rays, lateral rays). The editable project retains each source bone; the runtime batches by segment without simplification or geometric deviation. Surface-derived authoring pivots use paired cartilage patches for subtalar/TN/CC articulations and metatarsal/tarsal base strips for TMT groups. One generated frame file supplies both solver and host bindings. Foot capsules are absent from this export; toe context remains neutral relative to its metatarsal.
- The viewer derives each left side by reflection and visually deforms the capsules. Patellar tracking and coupled tibial rotation are authored teaching trajectories.
- Derivatives hip.glb, hip.blend, knee.glb, knee.blend, ankle.glb, ankle.blend, foot.glb, and foot.blend retain CC BY-SA 4.0. This anatomy's license is separate from application source licensing.

Reproduce with Blender 4.4 or a compatible installed version:

    blender --background --python scripts/blender/build-joint-hip.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets
    blender --background --factory-startup --python scripts/blender/build-joint-knee.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets
    blender --background --factory-startup --python scripts/blender/build-joint-ankle.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets
    blender --background --factory-startup --python scripts/blender/build-joint-foot.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets packages/ddx/src/joints/footFrames.json

The foot build checks its input hash against ankle.meta.json and shares the ankle atlas origin. foot.meta.json records every source structure, group, bound, pivot selection method, authored axis, 30,710 runtime triangles, and limitations. footFrames.json contains the corresponding pivots, cortical markers, and oblique axis. The source-derived pivot locations are authoring approximations, not validated contact centers or measured instantaneous axes.

The optional morphology layer makes runtime teaching derivatives of cloned hip/knee/ankle bone geometries, with bounded regional edits defined in morphologyBindings.ts. Those anatomical derivatives retain CC BY-SA 4.0; the original GLBs are unmodified. The accessory-navicular preview is an authored beveled triangular ossicle following the navicular frame. These are schematic examples without a patient source, diagnostic grading, or measured contact response. Primary research provides content context; faculty review of the shapes remains pending.

hip.meta.json, knee.meta.json, and ankle.meta.json retain source mesh identities, bounds, center methods, units, and authoring version. Knee metadata also records the source-to-joint frame, condylar fit residuals, and patellar bounds. Ankle metadata retains its dome patch selection and runtime-context deviation. Fit residuals describe geometric extraction, not clinical accuracy. The joint centers, tracking, and visual capsule deformation are teaching approximations, not experimentally validated mechanics.
