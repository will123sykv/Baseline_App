/**
 * One row per day: the summary the phone computes and syncs to Supabase
 * (table `daily_metrics`). Raw heart-rate samples never leave the phone.
 * Keep this in step with supabase/migrations.
 */
export interface DailyMetrics {
  /** ISO date, YYYY-MM-DD, in the user's local time zone. */
  date: string;
  hrvMs: number | null;
  restingHr: number | null;
  sleepMin: number | null;
  sleepScore: number | null;
  steps: number | null;
  activeKcal: number | null;
  restingKcal: number | null;
  strain: number | null;
  recovery: number | null;
  weightKg: number | null;
  weightTrendKg: number | null;
  intakeKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  /** Morning check-in, 1–5 each. */
  mood: number | null;
  energy: number | null;
  soreness: number | null;
}

export function emptyDay(date: string): DailyMetrics {
  return {
    date,
    hrvMs: null,
    restingHr: null,
    sleepMin: null,
    sleepScore: null,
    steps: null,
    activeKcal: null,
    restingKcal: null,
    strain: null,
    recovery: null,
    weightKg: null,
    weightTrendKg: null,
    intakeKcal: null,
    proteinG: null,
    carbsG: null,
    fatG: null,
    mood: null,
    energy: null,
    soreness: null,
  };
}

/** Local-time ISO date for a Date (not UTC, so late-evening meals land on the right day). */
export function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
