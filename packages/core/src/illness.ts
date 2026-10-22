import { baseline, isNum, zScore, type Maybe } from './stats';

/**
 * Illness / overreaching early warning. A nudge, never a diagnosis.
 *
 * Fires when, on the same morning:
 *   resting HR ≥ 2 SD above your baseline AND HRV ≥ 1.5 SD below it
 * or when either signal alone crosses its line two mornings in a row.
 */

export const RHR_HIGH_Z = 2;
export const HRV_LOW_Z = -1.5;

export interface Morning {
  hrvMs?: Maybe<number>;
  restingHr?: Maybe<number>;
}

export type IllnessReason = 'both-today' | 'rhr-two-days' | 'hrv-two-days';

export interface IllnessResult {
  warning: boolean;
  reason: IllnessReason | null;
  rhrZ: number | null;
  hrvZ: number | null;
}

interface Flags {
  rhrHigh: boolean;
  hrvLow: boolean;
  rhrZ: number | null;
  hrvZ: number | null;
}

function flagsFor(m: Morning, history: readonly Morning[]): Flags {
  const rhrB = baseline(history.map((h) => h.restingHr));
  const hrvB = baseline(
    history.map((h) => (isNum(h.hrvMs) && h.hrvMs > 0 ? h.hrvMs : null)),
    { transform: Math.log },
  );
  const rhrZ = isNum(m.restingHr) && rhrB ? zScore(m.restingHr, rhrB) : null;
  const hrvZ = isNum(m.hrvMs) && m.hrvMs > 0 && hrvB ? zScore(Math.log(m.hrvMs), hrvB) : null;
  return {
    rhrHigh: rhrZ !== null && rhrZ >= RHR_HIGH_Z,
    hrvLow: hrvZ !== null && hrvZ <= HRV_LOW_Z,
    rhrZ,
    hrvZ,
  };
}

/**
 * `mornings` is oldest first with today last. Each morning is compared with
 * the up-to-30 mornings before it, so a single bad day can't drag its own
 * baseline.
 */
export function illnessCheck(mornings: readonly Morning[]): IllnessResult {
  const n = mornings.length;
  const today = mornings[n - 1];
  if (!today) return { warning: false, reason: null, rhrZ: null, hrvZ: null };

  const t = flagsFor(today, mornings.slice(Math.max(0, n - 31), n - 1));
  const round2 = (z: number | null) => (z === null ? null : Math.round(z * 100) / 100);
  const base = { rhrZ: round2(t.rhrZ), hrvZ: round2(t.hrvZ) };

  if (t.rhrHigh && t.hrvLow) return { warning: true, reason: 'both-today', ...base };

  const yesterday = mornings[n - 2];
  if (yesterday) {
    const y = flagsFor(yesterday, mornings.slice(Math.max(0, n - 32), n - 2));
    if (t.rhrHigh && y.rhrHigh) return { warning: true, reason: 'rhr-two-days', ...base };
    if (t.hrvLow && y.hrvLow) return { warning: true, reason: 'hrv-two-days', ...base };
  }
  return { warning: false, reason: null, ...base };
}
