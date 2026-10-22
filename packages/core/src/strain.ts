import { mean, present, round, type Maybe } from './stats';

/**
 * Strain = zone-weighted minutes: each minute in heart-rate zone 1 scores 1
 * point, zone 2 scores 2 … zone 5 scores 5. Below zone 1 scores nothing.
 * Zones are % of max heart rate: 50/60/70/80/90.
 *
 * Lifting sessions with no heart-rate coverage use effort (1–10) × minutes,
 * scaled so a hard (6/10) hour lands near an hour in zone 3.
 */

export const ZONE_LOWER_BOUNDS = [0.5, 0.6, 0.7, 0.8, 0.9] as const;
export const SESSION_EFFORT_SCALE = 0.5;

/** Tanaka et al. estimate. Replaced by your observed max once one is recorded. */
export function estimatedMaxHr(age: number): number {
  return Math.round(208 - 0.7 * age);
}

/** 0 = below zone 1, otherwise 1–5. */
export function heartRateZone(bpm: number, maxHr: number): number {
  const pct = bpm / maxHr;
  let zone = 0;
  ZONE_LOWER_BOUNDS.forEach((lo, i) => {
    if (pct >= lo) zone = i + 1;
  });
  return zone;
}

export interface HrSample {
  bpm: number;
  /** How long this reading represents. */
  seconds: number;
}

export function zoneMinutes(samples: readonly HrSample[], maxHr: number): [number, number, number, number, number] {
  const mins: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  for (const s of samples) {
    const z = heartRateZone(s.bpm, maxHr);
    if (z > 0) mins[z - 1] = (mins[z - 1] ?? 0) + s.seconds / 60;
  }
  return mins;
}

export function heartRateLoad(samples: readonly HrSample[], maxHr: number): number {
  const mins = zoneMinutes(samples, maxHr);
  return round(mins.reduce((acc, m, i) => acc + m * (i + 1), 0), 1);
}

export function sessionEffortLoad(effort: number, minutes: number): number {
  return round(effort * minutes * SESSION_EFFORT_SCALE, 1);
}

export type LoadFlag = 'calibrating' | 'low' | 'normal' | 'high';

export interface LoadBalance {
  /** Mean daily load, last 7 days. */
  acute: number | null;
  /** Mean daily load, last 28 days. */
  chronic: number | null;
  ratio: number | null;
  flag: LoadFlag;
}

/** Above this ratio training is ramping faster than your body is used to. */
export const HIGH_LOAD_RATIO = 1.5;
/** Below this ratio you're doing much less than usual. */
export const LOW_LOAD_RATIO = 0.8;

/**
 * Last 7 days vs last 28 days. `dailyLoads` is oldest first, today last.
 * Rest days should be 0, not missing; missing days are ignored.
 */
export function loadBalance(dailyLoads: readonly Maybe<number>[]): LoadBalance {
  const last28 = present(dailyLoads.slice(-28));
  const last7 = present(dailyLoads.slice(-7));
  if (last28.length < 14 || last7.length < 4) {
    return { acute: mean(last7), chronic: mean(last28), ratio: null, flag: 'calibrating' };
  }
  const acute = mean(last7) as number;
  const chronic = mean(last28) as number;
  if (chronic === 0) return { acute, chronic, ratio: null, flag: acute > 0 ? 'high' : 'low' };
  const ratio = round(acute / chronic, 2);
  const flag: LoadFlag = ratio > HIGH_LOAD_RATIO ? 'high' : ratio < LOW_LOAD_RATIO ? 'low' : 'normal';
  return { acute: round(acute, 1), chronic: round(chronic, 1), ratio, flag };
}
