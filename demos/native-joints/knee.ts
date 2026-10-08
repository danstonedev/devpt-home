import { Quaternion, Vector3 } from 'three';
import type { JointDefinition, JointPreset, JointSegmentTransform, JointSide, SampledJointState, Vec3 } from './index';

const trackingSource = { label: 'Patellar tracking during flexion and extension · cadaver study', url: 'https://pubmed.ncbi.nlm.nih.gov/17004269/' };
const couplingSource = { label: 'Tibial rotation and patellar tracking · CT study', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6584384/' };
const therapySource = { label: 'Knee mobilization biomechanics · technique context', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3143014/' };
const smooth = (n: number) => { const t = Math.max(0, Math.min(1, n)); return t * t * (3 - 2 * t); };
const rotation = (axis: Vec3, degrees: number) => new Quaternion().setFromAxisAngle(new Vector3(...axis), degrees * Math.PI / 180);
function transform(q: Quaternion, p: Vector3, side: JointSide): JointSegmentTransform {
  return { quaternion: side === 'R' ? q.toArray() as [number, number, number, number] : [q.x, -q.y, -q.z, q.w], translationM: [side === 'R' ? p.x : -p.x, p.y, p.z] };
}

/** An authored teaching trajectory, not a patient-specific contact or ligament solver. */
function solveKnee(primary: SampledJointState, preset: JointPreset, side: JointSide): SampledJointState {
  const flexion = preset.coordinate === 'flexion' ? primary.angleDeg : preset.setupFlexionDeg ?? 60;
  const axial = preset.coordinate === 'rotation' ? primary.angleDeg : 5 * smooth(flexion / 30);
  const tibiaQ = rotation([1, 0, 0], flexion).multiply(rotation([0, 1, 0], axial));
  // The study motivates a separate patellar segment. These rounded paths are
  // authored for this atlas, with no claimed fit to its experimental subjects.
  const patellarFlexion = .7 * flexion;
  const patellaQ = rotation([1, 0, 0], patellarFlexion);
  const trackingX = flexion <= 20 ? .004 * smooth(flexion / 20) : .004 - .011 * smooth((flexion - 20) / 70);
  const patellaP = new Vector3(trackingX, 0, 0);
  const tibiaP = new Vector3(), femurP = new Vector3();
  const femurQ = new Quaternion();
  const accessory = new Vector3(...primary.translationM); if (side === 'L') accessory.x *= -1;
  if (preset.translationFrame === 'moving') accessory.applyQuaternion(tibiaQ);
  if (preset.group === 'Manual therapy') {
    if (preset.movingSegment === 'patella') patellaP.add(accessory); else tibiaP.add(accessory);
  }
  if (preset.referenceSegment === 'tibia') {
    // Change the stabilized segment through an exact rigid frame transform.
    // This illustrates femur-on-tibia motion without claiming weightbearing forces.
    femurQ.copy(tibiaQ).invert(); femurP.copy(tibiaP).negate().applyQuaternion(femurQ);
    patellaQ.premultiply(femurQ); patellaP.applyQuaternion(femurQ).add(femurP);
    tibiaQ.identity(); tibiaP.set(0, 0, 0);
  }
  const segments = { femur: transform(femurQ, femurP, side), tibia: transform(tibiaQ, tibiaP, side), patella: transform(patellaQ, patellaP, side) };
  const movingId = preset.movingSegment ?? 'tibia';
  const moving = segments[movingId as keyof typeof segments] ?? segments.tibia;
  const translationM: Vec3 = [side === 'R' ? accessory.x : -accessory.x, accessory.y, accessory.z];
  return { ...primary, quaternion: moving.quaternion, translationM, segments, measurements: [
    { id: 'knee-flexion', label: 'Knee flexion', value: flexion, unit: '°' },
    { id: 'tibial-rotation', label: 'Tibial axial rotation', value: axial, unit: '°' },
    { id: 'patellar-flexion', label: 'Patellar flexion', value: patellarFlexion, unit: '°' },
  ] };
}

export const KNEE_JOINT: JointDefinition = {
  id: 'knee', label: 'Knee',
  segments: [{ id: 'femur', label: 'Femur' }, { id: 'tibia', label: 'Tibia and fibula' }, { id: 'patella', label: 'Patella' }],
  coordinates: [{ id: 'flexion', axis: [1, 0, 0], bounds: [0, 90] }, { id: 'rotation', axis: [0, 1, 0], bounds: [-15, 15] }],
  translationLimitMm: 2, capabilities: ['rotation', 'translation', 'capsule', 'therapist'], solveKinematics: solveKnee,
};
const physiology = (id: string, label: string, coordinate: string, startDeg: number, targetDeg: number, surfaceMotion: string, referenceSegment = 'femur'): JointPreset => ({
  id, label, group: 'Physiologic motion', coordinate, startDeg, targetDeg, translation: [0, 0, 0], durationMs: 8000, posture: 'supine',
  movingSegment: referenceSegment === 'tibia' ? 'femur' : 'tibia', referenceSegment,
  primaryMeasurement: coordinate === 'rotation' ? 'tibial-rotation' : 'knee-flexion',
  ...(coordinate === 'rotation' ? { setupFlexionDeg: 60 } : {}),
  explanation: 'Compare tibiofemoral motion with the separate patellar segment. The readouts describe this authored teaching trajectory; range, tracking, and joint contact are not patient-specific.',
  surfaceMotion, therapist: 'Independent joint demonstration with the named reference segment held fixed.',
  question: 'Which segment is stabilized, and what happens to the patella?',
  answer: referenceSegment === 'tibia' ? 'The tibia is held fixed. The femur moves, while the patella tracks relative to the femur.' : 'The femur is held fixed. The tibia moves, and the patella has its own tracking path rather than being welded to the tibia.',
  source: coordinate === 'rotation' || id === 'terminal-extension' ? couplingSource : trackingSource,
  ...(coordinate === 'flexion' ? { surfaceVectors: { roll: [0, 0, targetDeg > startDeg ? -1 : 1] as Vec3, glide: [0, 0, referenceSegment === 'tibia' ? 1 : targetDeg > startDeg ? -1 : 1] as Vec3 } } : {}),
});
const manual = (id: string, label: string, movingSegment: 'tibia' | 'patella', startDeg: number, translation: Vec3, posture: 'supine' | 'prone', therapist: string, answer: string): JointPreset => ({
  id, label, movingSegment, referenceSegment: 'femur', group: 'Manual therapy', coordinate: 'flexion', startDeg, targetDeg: startDeg, translation, durationMs: 10000, posture,
  primaryMeasurement: 'knee-flexion',
  translationFrame: id === 'distraction' ? 'moving' : 'reference',
  explanation: `Watch the ${movingSegment} move relative to the held femur, then compare the therapist's contact. Accessory displacement is an authored 2 mm illustration, independent of force.`,
  surfaceMotion: movingSegment === 'patella' ? 'The patella translates while the tibia and femur remain in their setup position. Direction names use the anatomical frame, not the screen.' : 'The tibia and fibula translate together relative to the held femur. The force arrow names the applied direction; resistance and treatment response are not modeled.',
  therapist, question: 'Which bone receives the mobilizing contact, and which segment is stabilized?', answer, source: therapySource,
});
export const KNEE_PRESETS: readonly JointPreset[] = [
  physiology('flexion', 'Flexion', 'flexion', 0, 90, 'Tibia on femur: the classic concave-on-convex explanation pairs posterior roll with posterior glide. Arrows explain direction; the bone trajectory uses an idealized hinge and coupled axial rotation.'),
  physiology('extension', 'Extension', 'flexion', 90, 0, 'Tibia on femur: conceptual anterior roll and anterior glide. The patella returns superiorly, and the tibia rotates externally relative to its flexed position as the knee approaches extension.'),
  physiology('internal-rotation', 'Internal rotation at 60°', 'rotation', 0, 15, 'The knee stays flexed while the tibia rotates internally relative to the femur. This is a separate coordinate, rather than another flexion movement.'),
  physiology('external-rotation', 'External rotation at 60°', 'rotation', 0, -15, 'The knee stays flexed while the tibia rotates externally relative to the femur. The fixed reference and surface marker make the axial motion visible.'),
  physiology('terminal-extension', 'Terminal extension · screw-home', 'flexion', 30, 0, 'Observe the authored 5° axial coupling unwind during terminal extension. The tibia rotates externally relative to its flexed position; that illustrative amount is not a diagnostic normal value.'),
  physiology('femur-on-tibia', 'Femur on fixed tibia', 'flexion', 0, 90, 'The stabilized segment changes. The convex femur moves relative to the concave tibia; conceptual posterior roll and anterior glide have opposite directions. This view does not calculate weightbearing contact or force.', 'tibia'),
  manual('posterior-glide', 'Posterior tibial glide', 'tibia', 30, [0, 0, -1], 'supine', 'Supine patient with the knee supported in slight flexion. One hand stabilizes the distal femur; the other contacts the anterior proximal tibia and directs it posteriorly.', 'The proximal tibia receives the mobilizing contact. The distal femur is stabilized; posterior means toward the back of the tibia.'),
  manual('anterior-glide', 'Anterior tibial glide', 'tibia', 25, [0, 0, 1], 'prone', 'Prone patient with the knee slightly flexed. One hand stabilizes the distal femur; the other contacts the posterior proximal tibia and directs it anteriorly.', 'The tibia moves anteriorly relative to the stabilized femur. In this prone setup, the anatomical anterior direction points toward the plinth.'),
  manual('distraction', 'Tibiofemoral distraction', 'tibia', 20, [0, -1, 0], 'supine', 'Supine patient with a supported knee. The therapist stabilizes the distal femur and holds the proximal leg, illustrating separation along the tibial axis.', 'The tibia and fibula move distally away from the stabilized femur. The illustrated separation does not measure force or ligament tension.'),
  manual('patellar-inferior', 'Patellar inferior glide', 'patella', 0, [0, -1, 0], 'supine', 'Supine patient with the knee relaxed in extension. The stabilizing hand supports the distal femur; the mobilizing contact at the superior patellar border illustrates an inferior direction.', 'The patella receives the mobilizing contact at its superior border and moves inferiorly. The tibia and femur remain in their reference pose.'),
  manual('patellar-superior', 'Patellar superior glide', 'patella', 0, [0, 1, 0], 'supine', 'Supine patient with the knee relaxed in extension. The stabilizing hand supports the distal femur; the mobilizing contact at the inferior patellar border illustrates a superior direction.', 'The patella moves superiorly relative to the femur, with contact at its inferior border. Direction is anatomical, independent of camera rotation.'),
  manual('patellar-medial', 'Patellar medial glide', 'patella', 0, [1, 0, 0], 'supine', 'Supine patient with the knee relaxed in extension. The therapist stabilizes the distal femur and contacts the lateral patellar border to illustrate medial translation.', 'The patella moves toward the body midline. Its lateral border receives the mobilizing contact; changing sides mirrors the vector without renaming medial.'),
  manual('patellar-lateral', 'Patellar lateral glide', 'patella', 0, [-1, 0, 0], 'supine', 'Supine patient with the knee relaxed in extension. The therapist stabilizes the distal femur and contacts the medial patellar border to illustrate lateral translation.', 'The patella moves away from the body midline. Its medial border receives the mobilizing contact; the femur stays stabilized.'),
];
