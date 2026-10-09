/**
 * Public showcase selections for the unmodified simLAB learning components.
 * Source snapshot: simLAB 61a664c (October 2026). These IDs are native authored
 * demonstrations, not independently validated diagnostic or treatment claims.
 */
export type LabMode =
  | "movement"
  | "eyes"
  | "joints"
  | "neuro"
  | "aquatic"
  | "vitals";

export const LAB_WORKSPACES: Record<
  LabMode,
  {
    title: string;
    opening: string;
    initial?: string;
    note: string;
  }
> = {
  movement: {
    title: "Movement lab",
    opening: "Capsular hip",
    note: "The native sterile teaching stage, with authored findings, examiner hands, playback and all movement controls.",
  },
  eyes: {
    title: "Eye examinations",
    opening: "Posterior canal BPPV: Dix-Hallpike",
    initial: "bppv-posterior",
    note: "The native eye examination, with the close-up, Frenzel goggles, affected side and teaching readouts.",
  },
  joints: {
    title: "Joint mechanics",
    opening: "Knee · Flexion",
    initial: "knee:flexion",
    note: "The native articulated knee and patellar tracking, with anatomy layers, camera controls and teaching explanations.",
  },
  neuro: {
    title: "Neuro lab",
    opening: "Light touch · No lesion",
    note: "The native stimulus, pathway, anatomy and lesion workspace.",
  },
  aquatic: {
    title: "Aquatic Therapy",
    opening: "Explore",
    note: "The native pool, dose, movement, response and documentation workspace.",
  },
  vitals: {
    title: "Live Vitals",
    opening: "Adult profile",
    note: "The native authored-profile physiology sandbox with position, effort, clock and response trends.",
  },
};

/** Recommendations visitors can choose using the existing native controls. */
export const NATIVE_LAB_RECOMMENDATIONS = {
  movement: [
    { id: "painful-hip-flexion", label: "Hip flexion stopped by pain" },
    { id: "gluteus-medius-3", label: "Gluteus medius 3/5" },
    { id: "trendelenburg", label: "Trendelenburg gait" },
  ],
  eyes: [
    { id: "bppv-posterior", label: "Posterior canal BPPV: Dix-Hallpike" },
    { id: "movements-normal", label: "Normal: pursuit, saccades, convergence" },
    {
      id: "neuritis-impulse",
      label: "Vestibular neuritis: head impulse (overt saccade)",
    },
  ],
  joints: [
    { id: "knee:flexion", label: "Knee · Flexion" },
    {
      id: "knee:terminal-extension",
      label: "Knee · Terminal extension · screw-home",
    },
    { id: "hip:posterior-glide", label: "Hip · Posterior glide" },
    { id: "ankle:dorsiflexion", label: "Ankle · Dorsiflexion" },
  ],
} as const;
