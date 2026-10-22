import { baseline, clamp, isNum, zScore, type Baseline, type Maybe } from './stats';

/**
 * Recovery (0–100): how ready your body is today compared with your own last 30 days.
 *
 *   Recovery = clamp(50 + 15 × Σ(wᵢ·zᵢ) / Σwᵢ, 0, 100)
 *
 * Inputs and starting weights (design doc, "Metrics and algorithms"):
 *   HRV 0.45 (log scale, higher is better)
 *   Resting HR 0.25 (inverted: lower is better)
 *   Sleep score 0.20
 *   Mood/energy check-in 0.10
 *
 * A missing input simply drops out and its weight is shared among the rest
 * (dividing by the sum of the weights that are present does exactly that).
 */

export const RECOVERY_WEIGHTS = {
  hrv: 0.45,
  rhr: 0.25,
  sleep: 0.2,
  mood: 0.1,
} as const;

/** How many points one weighted standard deviation moves the score. */
export const RECOVERY_SCALE = 15;

export type RecoveryInput = keyof typeof RECOVERY_WEIGHTS;
export type RecoveryBand = 'green' | 'amber' | 'red';
export type RecoveryStatus = 'calibrating' | 'partial' | 'full';

export interface RecoveryToday {
  hrvMs?: Maybe<number>;
  restingHr?: Maybe<number>;
  sleepScore?: Maybe<number>;
  /** Morning check-in, 1–5 (energy and mood averaged by the caller). */
  mood?: Maybe<number>;
}

/** Up to 30 days of history, oldest first, NOT including today. */
export interface RecoveryHistory {
  hrvMs: readonly Maybe<number>[];
  restingHr: readonly Maybe<number>[];
  sleepScore: readonly Maybe<number>[];
  mood: readonly Maybe<number>[];
}

export interface RecoveryComponent {
  input: RecoveryInput;
  /** Signed so that positive always means "better than usual". */
  z: number;
  weight: number;
}

export interface RecoveryResult {
  score: number | null;
  band: RecoveryBand | null;
  status: RecoveryStatus;
  /** What went into the score, for the "why" sheet. */
  components: RecoveryComponent[];
}

export function recoveryBand(score: number): RecoveryBand {
  if (score >= 67) return 'green';
  if (score >= 34) return 'amber';
  return 'red';
}

export function computeRecovery(today: RecoveryToday, history: RecoveryHistory): RecoveryResult {
  const components: RecoveryComponent[] = [];

  const add = (input: RecoveryInput, value: Maybe<number>, b: Baseline | null, transform: (x: number) => number, sign: 1 | -1) => {
    if (!isNum(value) || b === null) return;
    if (transform === Math.log && value <= 0) return;
    components.push({ input, z: sign * zScore(transform(value), b), weight: RECOVERY_WEIGHTS[input] });
  };

  const identity = (x: number) => x;
  const positiveOnly = history.hrvMs.map((v) => (isNum(v) && v > 0 ? v : null));

  add('hrv', today.hrvMs, baseline(positiveOnly, { transform: Math.log }), Math.log, 1);
  add('rhr', today.restingHr, baseline(history.restingHr), identity, -1);
  add('sleep', today.sleepScore, baseline(history.sleepScore), identity, 1);
  add('mood', today.mood, baseline(history.mood), identity, 1);

  // Without at least one heart signal the score would just restate sleep and mood.
  const hasHeartSignal = components.some((c) => c.input === 'hrv' || c.input === 'rhr');
  if (!hasHeartSignal) {
    return { score: null, band: null, status: 'calibrating', components };
  }

  const totalWeight = components.reduce((a, c) => a + c.weight, 0);
  const weightedZ = components.reduce((a, c) => a + c.weight * c.z, 0) / totalWeight;
  const score = Math.round(clamp(50 + RECOVERY_SCALE * weightedZ, 0, 100));
  const status: RecoveryStatus = components.some((c) => c.input === 'hrv') ? 'full' : 'partial';

  return { score, band: recoveryBand(score), status, components };
}
