/** Small numeric helpers shared by every metric. Pure functions only. */

export type Maybe<T> = T | null | undefined;

/** True for a finite number (rejects null, undefined, NaN, Infinity). */
export function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Keep only usable numbers from a list that may contain gaps. */
export function present(values: readonly Maybe<number>[]): number[] {
  return values.filter(isNum);
}

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Sample standard deviation (n - 1). Null when fewer than 2 values. */
export function sd(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values) as number;
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

export function round(x: number, dp = 0): number {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
}

/** Mean of the last `n` usable values (e.g. a 7-day step average). */
export function rollingMean(values: readonly Maybe<number>[], n: number): number | null {
  return mean(present(values.slice(-n)));
}

export interface Baseline {
  mean: number;
  sd: number;
  /** How many days of data the baseline is built from. */
  n: number;
}

/** Minimum days of history before any score is shown (design doc: 14). */
export const MIN_BASELINE_DAYS = 14;
/** Length of the rolling baseline window in days (design doc: 30). */
export const BASELINE_WINDOW_DAYS = 30;

/**
 * Personal baseline from the last 30 days of history (oldest first).
 * Returns null while there are fewer than `minDays` usable values, or when
 * every value is identical (sd = 0 would make z-scores meaningless).
 */
export function baseline(
  history: readonly Maybe<number>[],
  opts: { minDays?: number; window?: number; transform?: (x: number) => number } = {},
): Baseline | null {
  const { minDays = MIN_BASELINE_DAYS, window = BASELINE_WINDOW_DAYS, transform } = opts;
  let values = present(history.slice(-window));
  if (transform) values = values.map(transform);
  if (values.length < minDays) return null;
  const m = mean(values);
  const s = sd(values);
  if (m === null || s === null || s === 0) return null;
  return { mean: m, sd: s, n: values.length };
}

/** How many standard deviations `x` sits from the baseline mean. */
export function zScore(x: number, b: Baseline): number {
  return (x - b.mean) / b.sd;
}
