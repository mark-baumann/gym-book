export const MUSCLE_GROUPS = [
  "Brust",
  "Rücken",
  "Schultern",
  "Bizeps",
  "Trizeps",
  "Beine",
  "Bauch",
  "Waden",
  "Unterarme",
  "Ganzkörper",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
