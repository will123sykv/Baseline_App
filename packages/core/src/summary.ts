import { caloriesOut, weeklyRateKg, weightTrend, type BodyProfile, type CaloriesOut } from './energy';
import { illnessCheck, type IllnessResult } from './illness';
import { computeRecovery, type RecoveryResult } from './recovery';
import { sleepDebtHours, sleepScore, type Night } from './sleep';
import { isNum, present, rollingMean } from './stats';

/** One local calendar day of Apple Health data, as the phone reads it. */
export interface DayHealth {
  /** Local date, YYYY-MM-DD. */
  date: string;
  steps: number | null;
  activeKcal: number | null;
  restingKcal: number | null;
  hrvMs: number | null;
  restingHr: number | null;
  weightKg: number | null;
  /** The night that ended on this morning. */
  sleep: Night | null;
  /** Morning check-in average (1–5), once Phase 2 adds it. */
  mood?: number | null;
}

export interface TodaySummary {
  date: string;
  recovery: RecoveryResult;
  /** Days of HRV history so far (recovery needs 14). */
  hrvDays: number;
  sleep: { score: number | null; asleepMin: number | null; debtHours: number };
  caloriesOut: CaloriesOut | null;
  steps: { today: number | null; avg7: number | null };
  weight: { trendKg: number | null; weeklyRateKg: number | null };
  illness: IllnessResult;
}

export interface SummaryOptions {
  sleepTargetMin?: number;
  profile?: BodyProfile;
}

/**
 * Everything the Today screen shows, from up to 31 days of data
 * (oldest first, today last). Screens render this; they never calculate.
 */
export function summarizeToday(days: readonly DayHealth[], opts: SummaryOptions = {}): TodaySummary | null {
  const today = days.at(-1);
  if (!today) return null;
  const target = opts.sleepTargetMin ?? 480;

  // Sleep score for every day, each using the 7 nights up to and including it.
  const sleepScores = days.map((_, i) => {
    const nights = days.slice(Math.max(0, i - 6), i + 1).map((d) => d.sleep).filter((n): n is Night => n !== null);
    return days[i]?.sleep ? sleepScore(nights, target)?.score ?? null : null;
  });

  const history = days.slice(0, -1);
  const recovery = computeRecovery(
    { hrvMs: today.hrvMs, restingHr: today.restingHr, sleepScore: sleepScores.at(-1), mood: today.mood },
    {
      hrvMs: history.map((d) => d.hrvMs),
      restingHr: history.map((d) => d.restingHr),
      sleepScore: sleepScores.slice(0, -1),
      mood: history.map((d) => d.mood ?? null),
    },
  );

  const nights = days.slice(-7).map((d) => d.sleep).filter((n): n is Night => n !== null);
  const trend = weightTrend(days.map((d) => ({ date: d.date, kg: d.weightKg })));

  return {
    date: today.date,
    recovery,
    hrvDays: present(days.map((d) => d.hrvMs)).length,
    sleep: {
      score: sleepScores.at(-1) ?? null,
      asleepMin: today.sleep?.asleepMin ?? null,
      debtHours: sleepDebtHours(nights, target),
    },
    caloriesOut: caloriesOut(today.activeKcal, today.restingKcal, opts.profile),
    steps: {
      today: isNum(today.steps) ? Math.round(today.steps) : null,
      avg7: (() => {
        const m = rollingMean(history.map((d) => d.steps), 7);
        return m === null ? null : Math.round(m);
      })(),
    },
    weight: { trendKg: trend.at(-1)?.trendKg ?? null, weeklyRateKg: weeklyRateKg(trend) },
    illness: illnessCheck(days.map((d) => ({ hrvMs: d.hrvMs, restingHr: d.restingHr }))),
  };
}
