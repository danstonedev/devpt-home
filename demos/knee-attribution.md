# Hip and knee teaching anatomy

Source: AnatomyTool Open 3D Anatomical Model, Leiden University Medical Center and collaborators, derived through Z-Anatomy and BodyParts3D.

- Source and credits: https://anatomytool.org/open3dmodel-learn and https://anatomytool.org/open3dmodel-credit
- Model license: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/
- Input: simPACS lower-limb.glb, SHA256 5a889d5cae00421885aaf1841e72364e5f215f0c29fb0116ca5e9844ec4c5fe7
- Hip modifications: extracted seven structures, baked transforms, fitted an idealized joint center to femoral-head cartilage, added rigid pelvis/femur controls, and recentered the model.
- Knee modifications: extracted ten structures, baked transforms, fitted posterior femoral condylar cartilage spheres, centered their midpoint, aligned the fitted hinge to +X, and added independent rigid femur, tibia/fibula, and patella controls. Cartilage and menisci are retained as hidden future tissue layers.
- The viewer derives each left side by reflection and visually deforms the capsules. Patellar tracking and coupled tibial rotation are authored teaching trajectories.
- Derivatives hip.glb, hip.blend, knee.glb, and knee.blend retain CC BY-SA 4.0. This anatomy's license is separate from application source licensing.

Reproduce with Blender 4.4 or a compatible installed version:

    blender --background --python scripts/blender/build-joint-hip.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets
    blender --background --factory-startup --python scripts/blender/build-joint-knee.py -- PATH_TO_LOWER_LIMB.glb apps/mission-shell/src/lib/lab/joints/assets

hip.meta.json and knee.meta.json retain source mesh identities, bounds, center methods, units, and authoring version. Knee metadata also records the source-to-joint frame, condylar fit residuals, and patellar bounds. Fit residuals describe geometric extraction, not clinical accuracy. The joint centers, tracking, and visual capsule deformation are teaching approximations, not experimentally validated mechanics.
