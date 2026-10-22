import { clamp, isNum, mean, present, round, type Maybe } from './stats';

/** Roughly how many kcal one kg of body tissue represents. */
export const KCAL_PER_KG = 7700;

export type Sex = 'male' | 'female';

export interface BodyProfile {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
}

/** Mifflin–St Jeor resting energy: 10·kg + 6.25·cm − 5·age + s (s = +5 male, −161 female). */
export function bmrMifflinStJeor(p: BodyProfile): number {
  const s = p.sex === 'male' ? 5 : -161;
  return Math.round(10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + s);
}

export interface CaloriesOut {
  total: number;
  active: number;
  resting: number;
  /** True when resting energy came from the formula rather than Apple Health. */
  restingEstimated: boolean;
}

/**
 * Calories out for one day. Resting energy comes from Apple Health when the
 * wearable writes it; otherwise from Mifflin–St Jeor.
 */
export function caloriesOut(active: Maybe<number>, resting: Maybe<number>, profile?: BodyProfile): CaloriesOut | null {
  const a = isNum(active) ? active : 0;
  if (isNum(resting) && resting > 0) {
    return { total: Math.round(a + resting), active: Math.round(a), resting: Math.round(resting), restingEstimated: false };
  }
  if (!profile) return null;
  const r = bmrMifflinStJeor(profile);
  return { total: Math.round(a + r), active: Math.round(a), resting: r, restingEstimated: true };
}

/** Positive = surplus, negative = deficit. */
export function energyBalance(intake: number, out: number): number {
  return Math.round(intake - out);
}

/* ------------------------------------------------------------------ */
/* Weight trend                                                        */
/* ------------------------------------------------------------------ */

/** Each new day moves the trend 10% of the way towards that day's weigh-in. */
export const TREND_ALPHA = 0.1;

export interface DayWeight {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  kg: Maybe<number>;
}

export interface TrendPoint {
  date: string;
  kg: number | null;
  trendKg: number | null;
}

/**
 * Exponential moving average over consecutive days (oldest first). Days with
 * no weigh-in keep yesterday's trend. The first weigh-in seeds the trend.
 */
export function weightTrend(days: readonly DayWeight[], alpha = TREND_ALPHA): TrendPoint[] {
  let trend: number | null = null;
  return days.map((d) => {
    if (isNum(d.kg)) trend = trend === null ? d.kg : trend + alpha * (d.kg - trend);
    return { date: d.date, kg: isNum(d.kg) ? d.kg : null, trendKg: trend === null ? null : round(trend, 2) };
  });
}

/** kg per week, from the last 8 trend points (today vs 7 days ago). */
export function weeklyRateKg(points: readonly TrendPoint[]): number | null {
  const now = points.at(-1)?.trendKg;
  const then = points.at(-8)?.trendKg;
  if (!isNum(now) || !isNum(then)) return null;
  return round(now - then, 2);
}

/* ------------------------------------------------------------------ */
/* Real TDEE                                                           */
/* ------------------------------------------------------------------ */

export const TDEE_WINDOW_DAYS = 21;
/** Logged days needed before the real figure is shown on its own. */
export const TDEE_SHOW_AFTER_DAYS = 14;
/** Below this many logged days the wearable estimate is used unchanged. */
export const TDEE_MIN_DAYS = 7;

export interface TdeeDay {
  date: string;
  /** Confirmed intake. Null = not logged (a day with no food entered). */
  intakeKcal: Maybe<number>;
  trendKg: Maybe<number>;
}

export type TdeeConfidence = 'none' | 'low' | 'medium' | 'high';

export interface TdeeResult {
  /** What the app shows. */
  kcal: number | null;
  /** Intake and weight change alone, when there's enough data. */
  realKcal: number | null;
  loggedDays: number;
  /** 0 = all wearable estimate, 1 = all real figure. */
  realWeight: number;
  confidence: TdeeConfidence;
}

/**
 *   TDEE = mean intake over the window − 7700 × Δtrend weight (kg) ÷ days
 *
 * Blends with the wearable's estimate, leaning on the real figure as logged
 * days increase. Window = last 21 days, oldest first.
 */
export function realTdee(days: readonly TdeeDay[], wearableTdee: Maybe<number>): TdeeResult {
  const window = days.slice(-TDEE_WINDOW_DAYS);
  const intakes = present(window.map((d) => d.intakeKcal));
  const loggedDays = intakes.length;
  const wearable = isNum(wearableTdee) ? Math.round(wearableTdee) : null;

  const firstTrend = window.find((d) => isNum(d.trendKg));
  const lastTrend = [...window].reverse().find((d) => isNum(d.trendKg));

  let realKcal: number | null = null;
  if (loggedDays >= TDEE_MIN_DAYS && firstTrend && lastTrend && firstTrend !== lastTrend) {
    const spanDays = daysBetween(firstTrend.date, lastTrend.date);
    if (spanDays > 0) {
      const delta = (lastTrend.trendKg as number) - (firstTrend.trendKg as number);
      realKcal = Math.round((mean(intakes) as number) - (KCAL_PER_KG * delta) / spanDays);
    }
  }

  if (realKcal === null) {
    return { kcal: wearable, realKcal: null, loggedDays, realWeight: 0, confidence: 'none' };
  }

  const realWeight = round(clamp(loggedDays / TDEE_WINDOW_DAYS, 0, 1), 2);
  const kcal = wearable === null ? realKcal : Math.round(realWeight * realKcal + (1 - realWeight) * wearable);
  const confidence: TdeeConfidence = loggedDays >= 19 ? 'high' : loggedDays >= TDEE_SHOW_AFTER_DAYS ? 'medium' : 'low';
  return { kcal, realKcal, loggedDays, realWeight, confidence };
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}
