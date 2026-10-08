import { Quaternion, Vector3 } from 'three';
import { KNEE_JOINT, KNEE_PRESETS } from './knee';
export { KNEE_JOINT, KNEE_PRESETS } from './knee';

export type JointSide = 'R' | 'L';
export type Vec3 = readonly [number, number, number];
/** Stable joint-specific coordinate ID; each joint supplies its own axes and bounds. */
export type JointCoordinate = string;
export type JointPhase = 'Set up' | 'Move' | 'Hold' | 'Return' | 'Contact' | 'Mobilize' | 'Release';
export interface JointDefinition {
  id: string;
  label: string;
  segments: readonly { id: string; label: string }[];
  coordinates: readonly { id: JointCoordinate; axis: Vec3; bounds: readonly [number, number] }[];
  translationLimitMm: number;
  capabilities: readonly ('rotation' | 'translation' | 'capsule' | 'therapist')[];
  /** Joint-specific coupled motion, in the joint reference frame. Bones stay rigid. */
  solveKinematics?: (primary: SampledJointState, preset: JointPreset, side: JointSide) => SampledJointState;
}
export interface JointPreset {
  id: string;
  label: string;
  group: 'Physiologic motion' | 'Manual therapy';
  coordinate: JointCoordinate;
  targetDeg: number;
  startDeg: number;
  translation: Vec3;
  durationMs: number;
  posture: 'supine' | 'prone';
  explanation: string;
  surfaceMotion: string;
  therapist: string;
  question: string;
  answer: string;
  source: { label: string; url: string };
  movingSegment?: string;
  referenceSegment?: string;
  setupFlexionDeg?: number;
  surfaceVectors?: { roll: Vec3; glide: Vec3 };
  translationFrame?: 'reference' | 'moving';
  /** Readout already displayed as the preset's primary angle. */
  primaryMeasurement?: string;
}
export interface JointSegmentTransform { quaternion: readonly [number, number, number, number]; translationM: Vec3; }
export interface JointMeasurement { id: string; label: string; value: number; unit: '°' | 'mm'; }
export interface SampledJointState {
  phase: JointPhase;
  progress: number;
  angleDeg: number;
  quaternion: readonly [number, number, number, number];
  translationM: Vec3;
  displacementMm: number;
  contact: number;
  load: number;
  /** Absolute transforms from the shared neutral joint frame, never skinning bones. */
  segments?: Readonly<Record<string, JointSegmentTransform>>;
  measurements?: readonly JointMeasurement[];
}

// Teaching ranges, not an individual patient's ROM or a diagnostic end range.
export const HIP_JOINT: JointDefinition = {
  id: 'hip', label: 'Hip',
  segments: [{ id: 'pelvis', label: 'Pelvis' }, { id: 'femur', label: 'Femur' }],
  coordinates: [
    { id: 'flexion', axis: [-1, 0, 0], bounds: [-20, 100] },
    { id: 'abduction', axis: [0, 0, -1], bounds: [-20, 40] },
    { id: 'rotation', axis: [0, 1, 0], bounds: [-35, 30] },
  ],
  translationLimitMm: 2, capabilities: ['rotation', 'translation', 'capsule', 'therapist'],
};
const source = { label: 'Hip translation and rotation · MRI study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11459479/' };
const physiology = (id: string, label: string, coordinate: JointCoordinate, targetDeg: number, surfaceMotion: string): JointPreset => ({
  id, label, group: 'Physiologic motion', coordinate, targetDeg, startDeg: 0, translation: [0, 0, 0], durationMs: 8000, posture: 'supine',
  explanation: 'The femur moves relative to a stabilized pelvis. Watch the shaft and the surface marker together: limb excursion and motion at the joint are different views of the same movement.',
  surfaceMotion, therapist: 'Independent joint demonstration. The pelvis is held in its reference position.',
  question: 'Which segment stays fixed during this demonstration?', answer: 'The pelvis stays fixed. The femur rotates about the modeled joint center.', source,
});
const manual = (id: string, label: string, startDeg: number, translation: Vec3, posture: 'supine' | 'prone', therapist: string, answer: string): JointPreset => ({
  id, label, group: 'Manual therapy', coordinate: 'flexion', targetDeg: startDeg, startDeg, translation, durationMs: 10000, posture,
  explanation: 'Compare the therapist’s contact and applied direction with the small accessory motion in the joint view. Translation is an authored 2 mm illustration, independent of the force arrow.',
  surfaceMotion: 'Accessory translation is shown relative to the pelvis. The arrow names a direction; it does not measure force or predict treatment response.',
  therapist, question: 'What is the mobilizing direction relative to the pelvis?', answer,
  source: { label: 'Hip accessory glide · cadaver study', url: 'https://pubmed.ncbi.nlm.nih.gov/12683687/' },
});
export const HIP_PRESETS: readonly JointPreset[] = [
  physiology('flexion', 'Flexion', 'flexion', 90, 'In the classic convex-on-concave teaching model, anterior roll is paired with posterior glide. The bones here rotate about an idealized center; arrows are explanatory, not measured surface paths.'),
  physiology('extension', 'Extension', 'flexion', -15, 'The classic teaching model pairs posterior roll with anterior glide. Watch the femoral surface marker rotate with the bone while the socket remains fixed.'),
  physiology('abduction', 'Abduction', 'abduction', 35, 'The classic teaching model pairs superior roll with inferior glide. The surface arrows are a conceptual explanation rather than a patient-specific translation curve.'),
  physiology('adduction', 'Adduction', 'abduction', -15, 'The classic teaching model pairs inferior roll with superior glide. The pelvis remains fixed so the femur’s relative motion is visible.'),
  physiology('internal-rotation', 'Internal rotation', 'rotation', 25, 'Observe axial rotation and the moving surface marker. Spin is emphasized in this idealized view; real surface motion depends on position and anatomy.'),
  physiology('external-rotation', 'External rotation', 'rotation', -30, 'Observe axial rotation in the opposite direction. Spin is emphasized in this idealized view, with the pelvis held fixed.'),
  manual('posterior-glide', 'Posterior glide', 75, [0, 0, -1], 'supine', 'Supine patient with the hip and knee flexed. The therapist supports the knee and directs the proximal femur posteriorly while the other hand stabilizes the pelvis.', 'Posterior: toward the back of the pelvis, independent of the screen’s viewing angle.'),
  manual('long-axis-traction', 'Long-axis traction', 0, [0, -1, 0], 'supine', 'Supine patient. The therapist stands at the foot of the plinth and holds the distal leg with both hands. The plinth and pelvis support provide the counterforce.', 'Distal along the limb: away from the pelvis. Both hands hold the distal leg; stabilization comes from the supported pelvis.'),
  manual('lateral-distraction', 'Lateral distraction', 20, [-1, 0, 0], 'supine', 'Supine patient with a belt around the proximal thigh. The therapist stands beside the plinth, stabilizes the pelvis, and draws the belt laterally.', 'Lateral: away from the body’s midline. The illustrated belt carries the mobilizing direction.'),
  manual('anterior-glide', 'Anterior glide', 0, [0, 0, 1], 'prone', 'Prone patient. The therapist contacts the posterior proximal thigh and directs it anteriorly while the other hand stabilizes the pelvis.', 'Anterior: toward the front of the pelvis, into the plinth in this prone setup.'),
];
export const jointPreset = (id?: string | null): JointPreset => HIP_PRESETS.find(p => p.id === id) ?? HIP_PRESETS[0]!;
export interface JointModule { definition: JointDefinition; presets: readonly JointPreset[]; neutralReferenceLabel: string; modelNote: string; }
export const JOINT_MODULES: readonly JointModule[] = [
  { definition: HIP_JOINT, presets: HIP_PRESETS, neutralReferenceLabel: 'Neutral femur reference', modelNote: 'Femur on a fixed pelvis; idealized ball-and-socket center.' },
  { definition: KNEE_JOINT, presets: KNEE_PRESETS, neutralReferenceLabel: 'Neutral bone references', modelNote: 'Rigid femur, tibia/fibula, and patella; derived hinge and authored tracking.' },
];
export function jointModule(id: string): JointModule {
  const module = JOINT_MODULES.find(item => item.definition.id === id);
  if (!module) throw new Error('Unsupported joint module: ' + id);
  return module;
}
/** Existing hip links remain valid. New links name the joint explicitly. */
export function jointSelection(value?: string | null): { jointId: string; presetId: string } {
  const [jointId, presetId] = (value ?? '').split(':');
  const module = JOINT_MODULES.find(item => item.definition.id === jointId);
  if (module) return { jointId: module.definition.id, presetId: module.presets.find(p => p.id === presetId)?.id ?? module.presets[0]!.id };
  return { jointId: 'hip', presetId: jointPreset(value).id };
}
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
const smooth = (t: number) => { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); };

/** Reflect a rotation through the sagittal plane. A reflection is not a rotation quaternion. */
export function jointQuaternion(definition: JointDefinition, coordinate: JointCoordinate, angleDeg: number, side: JointSide): Quaternion {
  const field = definition.coordinates.find(c => c.id === coordinate);
  if (!field) throw new Error('Unsupported joint coordinate: ' + coordinate);
  const axis = new Vector3(...field.axis);
  if (side === 'L') axis.set(axis.x, -axis.y, -axis.z);
  return new Quaternion().setFromAxisAngle(axis, clamp(angleDeg, ...field.bounds) * Math.PI / 180);
}

/** Pure sampling: playback and seeking always use the same requested time, never accumulated bone rotations. */
export function sampleJoint(definition: JointDefinition, preset: JointPreset, timeMs: number, range = 1, side: JointSide = 'R'): SampledJointState {
  const t = clamp(timeMs, 0, preset.durationMs) / preset.durationMs;
  const manual = preset.group === 'Manual therapy';
  let phase: JointPhase, excursion: number, contact = 0, load = 0;
  if (manual) {
    contact = t < .15 ? smooth(t / .15) : t > .85 ? 1 - smooth((t - .85) / .15) : 1;
    const envelope = t < .2 ? 0 : t < .35 ? smooth((t - .2) / .15) : t < .65 ? 1 : t < .8 ? 1 - smooth((t - .65) / .15) : 0;
    load = envelope * (.65 + .35 * (.5 - .5 * Math.cos((t - .2) * Math.PI * 12)));
    excursion = load;
    phase = t < .15 ? 'Contact' : t < .2 ? 'Hold' : t < .8 ? 'Mobilize' : 'Release';
  } else {
    excursion = t < .15 ? 0 : t < .45 ? smooth((t - .15) / .3) : t < .65 ? 1 : t < .95 ? 1 - smooth((t - .65) / .3) : 0;
    phase = t < .15 ? 'Set up' : t < .45 ? 'Move' : t < .65 ? 'Hold' : 'Return';
  }
  const fraction = clamp(range, .1, 1);
  const coordinate = definition.coordinates.find(c => c.id === preset.coordinate);
  if (!coordinate) throw new Error('Unsupported joint coordinate: ' + preset.coordinate);
  const angleDeg = clamp(preset.startDeg + (preset.targetDeg - preset.startDeg) * excursion * fraction, ...coordinate.bounds);
  const quaternion = jointQuaternion(definition, preset.coordinate, angleDeg, side).toArray() as [number, number, number, number];
  const direction = new Vector3(...preset.translation).normalize();
  if (side === 'L') direction.x *= -1;
  const translation = direction.multiplyScalar(definition.translationLimitMm / 1000 * excursion * fraction);
  const primary: SampledJointState = { phase, progress: t, angleDeg, quaternion, translationM: translation.toArray() as [number, number, number], displacementMm: translation.length() * 1000, contact, load };
  return definition.solveKinematics?.(primary, preset, side) ?? { ...primary, segments: { [preset.movingSegment ?? definition.segments[1]!.id]: { quaternion, translationM: primary.translationM } } };
}

export function capsuleAttachmentWeight(position: Vec3): number {
  // Visual blend: acetabular-side vertices held, distal neck vertices follow the femur.
  return smooth((-position[1] - .006) / .055);
}
export function deformCapsulePoint(position: Vec3, state: SampledJointState): Vec3 {
  const p = new Vector3(...position), moved = p.clone().applyQuaternion(new Quaternion(...state.quaternion)).add(new Vector3(...state.translationM));
  return p.lerp(moved, capsuleAttachmentWeight(position)).toArray() as [number, number, number];
}
