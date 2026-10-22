import { round } from './stats';

/** Epley estimate of a one-rep max: weight × (1 + reps ÷ 30). One rep returns the weight itself. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return round(weightKg, 1);
  return round(weightKg * (1 + reps / 30), 1);
}

export interface LoggedSet {
  exercise: string;
  muscleGroup: string;
  reps: number;
  weightKg: number;
  /** ISO date of the session. */
  date: string;
}

/** Volume load (reps × kg) per muscle group. */
export function volumeByMuscle(sets: readonly LoggedSet[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sets) out[s.muscleGroup] = round((out[s.muscleGroup] ?? 0) + s.reps * s.weightKg, 1);
  return out;
}

export interface PersonalRecord {
  exercise: string;
  date: string;
  estimated1RM: number;
  previousBest: number | null;
}

/**
 * Sets that beat every earlier estimated 1RM for the same exercise.
 * `sets` must be in the order they were done (oldest first).
 */
export function findPersonalRecords(sets: readonly LoggedSet[]): PersonalRecord[] {
  const best = new Map<string, number>();
  const prs: PersonalRecord[] = [];
  for (const s of sets) {
    const e = epley1RM(s.weightKg, s.reps);
    const prev = best.get(s.exercise);
    if (prev === undefined || e > prev) {
      if (prev !== undefined) prs.push({ exercise: s.exercise, date: s.date, estimated1RM: e, previousBest: prev });
      best.set(s.exercise, e);
    }
  }
  return prs;
}
