import { clamp, isNum, mean, present, sd, type Maybe } from './stats';

/**
 * Sleep score (0–100), design doc weights:
 *   50% duration vs your target
 *   20% regularity (how consistent bed and wake times are over 7 nights)
 *   20% time awake during the night
 *   10% deep + REM share (only when the wearable reports stages)
 * A missing part drops out and its weight is shared among the rest.
 */

export const SLEEP_WEIGHTS = {
  duration: 0.5,
  regularity: 0.2,
  awake: 0.2,
  stages: 0.1,
} as const;

/** A night with this much spread (SD, minutes) in bed/wake times scores 0 for regularity. */
export const REGULARITY_ZERO_AT_SD_MIN = 90;
/** This many minutes awake in the night scores 0 for the awake part. */
export const AWAKE_ZERO_AT_MIN = 60;
/** Deep + REM at or above this share of total sleep scores full marks. */
export const STAGE_SHARE_FULL = 0.4;

export interface Night {
  /** Minutes actually asleep. */
  asleepMin: number;
  /** Minutes awake between falling asleep and final wake. */
  awakeMin?: Maybe<number>;
  deepMin?: Maybe<number>;
  remMin?: Maybe<number>;
  /** Clock times as minutes after midnight (0–1439), e.g. 23:30 → 1410. */
  bedtimeMin?: Maybe<number>;
  wakeMin?: Maybe<number>;
}

export interface SleepScoreResult {
  score: number;
  parts: { part: keyof typeof SLEEP_WEIGHTS; value: number; weight: number }[];
}

/**
 * Shift a clock time so that times either side of midnight sort and average
 * correctly: minutes measured from 12:00 noon (23:00 → 660, 01:00 → 780).
 */
export function minutesFromNoon(clockMin: number): number {
  return (((clockMin - 720) % 1440) + 1440) % 1440;
}

/** Mean of bedtime and wake-time spread over the given nights, in minutes. */
export function timingSpreadMin(nights: readonly Night[]): number | null {
  const beds = present(nights.map((n) => n.bedtimeMin)).map(minutesFromNoon);
  const wakes = present(nights.map((n) => n.wakeMin)).map(minutesFromNoon);
  const spreads = [sd(beds), sd(wakes)].filter(isNum);
  return mean(spreads);
}

/**
 * Score last night, using up to the last 7 nights (oldest first, last night
 * last) for regularity.
 */
export function sleepScore(nights: readonly Night[], targetMin = 480): SleepScoreResult | null {
  const last = nights.at(-1);
  if (!last || !isNum(last.asleepMin)) return null;

  const parts: SleepScoreResult['parts'] = [];
  parts.push({ part: 'duration', value: clamp(last.asleepMin / targetMin, 0, 1), weight: SLEEP_WEIGHTS.duration });

  const spread = timingSpreadMin(nights.slice(-7));
  if (spread !== null) {
    parts.push({ part: 'regularity', value: clamp(1 - spread / REGULARITY_ZERO_AT_SD_MIN, 0, 1), weight: SLEEP_WEIGHTS.regularity });
  }

  if (isNum(last.awakeMin)) {
    parts.push({ part: 'awake', value: clamp(1 - last.awakeMin / AWAKE_ZERO_AT_MIN, 0, 1), weight: SLEEP_WEIGHTS.awake });
  }

  if (isNum(last.deepMin) && isNum(last.remMin) && last.asleepMin > 0) {
    const share = (last.deepMin + last.remMin) / last.asleepMin;
    parts.push({ part: 'stages', value: clamp(share / STAGE_SHARE_FULL, 0, 1), weight: SLEEP_WEIGHTS.stages });
  }

  const total = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round((100 * parts.reduce((a, p) => a + p.weight * p.value, 0)) / total);
  return { score, parts };
}

/** Hours of sleep owed over the last 7 nights. Only shortfalls count; extra sleep doesn't bank. */
export function sleepDebtHours(nights: readonly Night[], targetMin = 480): number {
  const owed = nights.slice(-7).reduce((acc, n) => acc + Math.max(0, targetMin - n.asleepMin), 0);
  return Math.round((owed / 60) * 10) / 10;
}
