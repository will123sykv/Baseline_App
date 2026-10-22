import {
  isHealthDataAvailableAsync,
  queryCategorySamples,
  queryQuantitySamples,
  queryStatisticsCollectionForQuantity,
  queryWorkoutSamples,
  requestAuthorization,
  saveQuantitySample,
  type QuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { localIsoDate, type Night } from '@baseline/core';
import type { DayHealth, HealthService, ProbeResult } from './types';

/** Every type the app reads. Keep in step with docs/DESIGN.md "Data sources". */
const READ_QUANTITIES = [
  { id: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', label: 'HRV', unit: 'ms' },
  { id: 'HKQuantityTypeIdentifierRestingHeartRate', label: 'Resting heart rate', unit: 'count/min' },
  { id: 'HKQuantityTypeIdentifierHeartRate', label: 'Heart rate', unit: 'count/min' },
  { id: 'HKQuantityTypeIdentifierStepCount', label: 'Steps', unit: 'count' },
  { id: 'HKQuantityTypeIdentifierActiveEnergyBurned', label: 'Active energy', unit: 'kcal' },
  { id: 'HKQuantityTypeIdentifierBasalEnergyBurned', label: 'Resting energy', unit: 'kcal' },
  { id: 'HKQuantityTypeIdentifierBodyMass', label: 'Body mass', unit: 'kg' },
  { id: 'HKQuantityTypeIdentifierRespiratoryRate', label: 'Breathing rate', unit: 'count/min' },
  { id: 'HKQuantityTypeIdentifierOxygenSaturation', label: 'Blood oxygen', unit: '%' },
] as const satisfies readonly { id: QuantityTypeIdentifier; label: string; unit: string }[];

const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis' as const;
const WORKOUT = 'HKWorkoutTypeIdentifier' as const;

const WRITE_TYPES = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
  'HKQuantityTypeIdentifierBodyMass',
] as const;

// HealthKit sleep values: 0 in bed, 1 asleep (unspecified), 2 awake, 3 core, 4 deep, 5 REM.
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);
const AWAKE = 2;
const DEEP = 4;
const REM = 5;

const DAY_MS = 86_400_000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function minutes(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 60_000;
}

function clockMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

async function dailyStat(
  id: QuantityTypeIdentifier,
  stat: 'cumulativeSum' | 'discreteAverage' | 'mostRecent',
  unit: string,
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  try {
    const rows = await queryStatisticsCollectionForQuantity(id, [stat], from, { day: 1 }, {
      filter: { date: { startDate: from, endDate: to } },
      unit,
    } as never);
    for (const r of rows) {
      if (!r.startDate) continue;
      const q = stat === 'cumulativeSum' ? r.sumQuantity : stat === 'discreteAverage' ? r.averageQuantity : r.mostRecentQuantity;
      if (q && Number.isFinite(q.quantity)) out.set(localIsoDate(new Date(r.startDate)), q.quantity);
    }
  } catch {
    // Not authorised or no data yet: leave the days empty.
  }
  return out;
}

/** Nights keyed by the local date they ended on. Uses the single source with the most sleep per night. */
async function nightsByWakeDate(from: Date, to: Date): Promise<Map<string, Night>> {
  const out = new Map<string, Night>();
  let samples: readonly { startDate: Date; endDate: Date; value: number; sourceRevision: { source: { bundleIdentifier: string } } }[] = [];
  try {
    samples = (await queryCategorySamples(SLEEP, {
      limit: 0,
      ascending: true,
      filter: { date: { startDate: new Date(from.getTime() - DAY_MS / 2), endDate: to } },
    })) as never;
  } catch {
    return out;
  }

  // Group: wake date → source → samples
  const groups = new Map<string, Map<string, typeof samples>>();
  for (const s of samples) {
    const end = new Date(s.endDate);
    // A sleep block ending before 18:00 belongs to that morning; later blocks belong to tomorrow.
    const wakeDay = end.getHours() < 18 ? end : new Date(end.getTime() + DAY_MS);
    const key = localIsoDate(wakeDay);
    const src = s.sourceRevision?.source?.bundleIdentifier ?? 'unknown';
    const bySource = groups.get(key) ?? new Map();
    bySource.set(src, [...(bySource.get(src) ?? []), s]);
    groups.set(key, bySource);
  }

  for (const [date, bySource] of groups) {
    let best: Night | null = null;
    for (const list of bySource.values()) {
      let asleep = 0;
      let awake = 0;
      let deep = 0;
      let rem = 0;
      let hasStages = false;
      let first: Date | null = null;
      let last: Date | null = null;
      for (const s of list) {
        const a = new Date(s.startDate);
        const b = new Date(s.endDate);
        const m = minutes(a, b);
        // Afternoon naps (starting 12:00–17:59) don't count towards the night.
        if (a.getHours() >= 12 && a.getHours() < 18) continue;
        if (ASLEEP_VALUES.has(s.value)) {
          asleep += m;
          if (!first || a < first) first = a;
          if (!last || b > last) last = b;
        }
        if (s.value === AWAKE) awake += m;
        if (s.value === DEEP) { deep += m; hasStages = true; }
        if (s.value === REM) { rem += m; hasStages = true; }
      }
      if (asleep > 0 && (!best || asleep > best.asleepMin)) {
        best = {
          asleepMin: Math.round(asleep),
          awakeMin: Math.round(awake),
          deepMin: hasStages ? Math.round(deep) : null,
          remMin: hasStages ? Math.round(rem) : null,
          bedtimeMin: first ? clockMinutes(first) : null,
          wakeMin: last ? clockMinutes(last) : null,
        };
      }
    }
    if (best) out.set(date, best);
  }
  return out;
}

function formatValue(v: number, unit: string): string {
  if (unit === '%') return `${Math.round(v * (v <= 1 ? 100 : 1))}%`;
  if (unit === 'count') return Math.round(v).toLocaleString('en-GB');
  const rounded = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${rounded} ${unit.replace('count/min', 'bpm')}`;
}

export const healthKitService: HealthService = {
  kind: 'healthkit',

  async isAvailable() {
    try {
      return await isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async requestAccess() {
    return requestAuthorization({
      toRead: [...READ_QUANTITIES.map((q) => q.id), SLEEP, WORKOUT],
      toShare: [...WRITE_TYPES],
    });
  },

  async getDays(count) {
    const now = new Date();
    // Calendar arithmetic, not milliseconds, so a clock change can't shift the window by a day.
    const from = startOfLocalDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1)));
    const [steps, active, resting, hrv, rhr, weight, nights] = await Promise.all([
      dailyStat('HKQuantityTypeIdentifierStepCount', 'cumulativeSum', 'count', from, now),
      dailyStat('HKQuantityTypeIdentifierActiveEnergyBurned', 'cumulativeSum', 'kcal', from, now),
      dailyStat('HKQuantityTypeIdentifierBasalEnergyBurned', 'cumulativeSum', 'kcal', from, now),
      dailyStat('HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 'discreteAverage', 'ms', from, now),
      dailyStat('HKQuantityTypeIdentifierRestingHeartRate', 'discreteAverage', 'count/min', from, now),
      dailyStat('HKQuantityTypeIdentifierBodyMass', 'mostRecent', 'kg', from, now),
      nightsByWakeDate(from, now),
    ]);

    const days: DayHealth[] = [];
    for (let i = 0; i < count; i++) {
      const date = localIsoDate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i));
      days.push({
        date,
        steps: steps.get(date) ?? null,
        activeKcal: active.get(date) ?? null,
        restingKcal: resting.get(date) ?? null,
        hrvMs: hrv.get(date) ?? null,
        restingHr: rhr.get(date) ?? null,
        weightKg: weight.get(date) ?? null,
        sleep: nights.get(date) ?? null,
      });
    }
    return days;
  },

  async saveWeight(kg, at = new Date()) {
    // A weigh-in is a single point in time, so start and end are the same.
    await saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, at, at);
  },

  async probe() {
    const since = new Date(Date.now() - 7 * DAY_MS);
    const results: ProbeResult[] = [];

    for (const q of READ_QUANTITIES) {
      try {
        const samples = await queryQuantitySamples(q.id, {
          limit: 0,
          ascending: false,
          unit: q.unit,
          filter: { date: { startDate: since } },
        } as never);
        const first = samples[0];
        results.push({
          label: q.label,
          identifier: q.id,
          count: samples.length,
          latest: first
            ? { value: formatValue(first.quantity, q.unit), at: new Date(first.endDate), source: first.sourceRevision?.source?.name ?? '?' }
            : null,
          sources: [...new Set(samples.map((s) => s.sourceRevision?.source?.name ?? '?'))],
        });
      } catch (e) {
        results.push({ label: q.label, identifier: q.id, count: 0, latest: null, sources: [], error: String(e) });
      }
    }

    try {
      const sleep = await queryCategorySamples(SLEEP, { limit: 0, ascending: false, filter: { date: { startDate: since } } });
      const stages = new Set(sleep.map((s) => Number(s.value)));
      const first = sleep[0];
      results.push({
        label: 'Sleep',
        identifier: SLEEP,
        count: sleep.length,
        latest: first
          ? {
              value: stages.has(DEEP) || stages.has(REM) ? 'with stages' : 'no stages',
              at: new Date(first.endDate),
              source: first.sourceRevision?.source?.name ?? '?',
            }
          : null,
        sources: [...new Set(sleep.map((s) => s.sourceRevision?.source?.name ?? '?'))],
      });
    } catch (e) {
      results.push({ label: 'Sleep', identifier: SLEEP, count: 0, latest: null, sources: [], error: String(e) });
    }

    try {
      const workouts = (await queryWorkoutSamples({ limit: 50, ascending: false })).map((w) => w.toJSON());
      const recent = workouts.filter((w) => new Date(w.startDate) >= since);
      const first = recent[0];
      results.push({
        label: 'Workouts',
        identifier: WORKOUT,
        count: recent.length,
        latest: first
          ? {
              value: `${Math.round(first.duration.unit === 'min' ? first.duration.quantity : first.duration.quantity / 60)} min`,
              at: new Date(first.endDate),
              source: first.sourceRevision?.source?.name ?? '?',
            }
          : null,
        sources: [...new Set(recent.map((w) => w.sourceRevision?.source?.name ?? '?'))],
      });
    } catch (e) {
      results.push({ label: 'Workouts', identifier: WORKOUT, count: 0, latest: null, sources: [], error: String(e) });
    }

    return results;
  },
};
