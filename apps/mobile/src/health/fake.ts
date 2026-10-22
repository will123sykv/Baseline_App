import { localIsoDate } from '@baseline/core';
import type { DayHealth, HealthService, ProbeResult } from './types';

/**
 * Sample data for the web preview on Windows (`npm run web`) and for tests.
 * Deterministic: the same day always gets the same numbers, so screenshots
 * and tests don't flicker. Patterns are loosely realistic, with a rough
 * patch (short sleep, low HRV) three days ago so the scores have something
 * to react to.
 */

const DAY_MS = 86_400_000;

/** Repeatable pseudo-random in [0, 1) from an integer seed. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function dayFor(date: Date, daysAgo: number): DayHealth {
  const seed = Math.floor(date.getTime() / DAY_MS);
  const roughPatch = daysAgo === 3 ? 1 : 0;
  const asleep = Math.round(430 + noise(seed) * 70 - roughPatch * 120);
  return {
    date: localIsoDate(date),
    steps: Math.round(6500 + noise(seed + 1) * 6000),
    activeKcal: Math.round(380 + noise(seed + 2) * 320),
    restingKcal: Math.round(1760 + noise(seed + 3) * 30),
    hrvMs: Math.round((58 + noise(seed + 4) * 18 - roughPatch * 20) * 10) / 10,
    restingHr: Math.round(54 + noise(seed + 5) * 5 + roughPatch * 5),
    weightKg: noise(seed + 6) > 0.4 ? Math.round((75.5 - (30 - daysAgo) * 0.02 + noise(seed + 7) * 0.6) * 10) / 10 : null,
    sleep: {
      asleepMin: asleep,
      awakeMin: Math.round(8 + noise(seed + 8) * 25),
      deepMin: Math.round(asleep * (0.15 + noise(seed + 9) * 0.06)),
      remMin: Math.round(asleep * (0.2 + noise(seed + 10) * 0.05)),
      bedtimeMin: (23 * 60 + Math.round(noise(seed + 11) * 70)) % 1440,
      wakeMin: 7 * 60 + Math.round(noise(seed + 12) * 40),
    },
  };
}

export const fakeHealthService: HealthService = {
  kind: 'fake',
  async isAvailable() {
    return true;
  },
  async requestAccess() {
    return true;
  },
  async getDays(count) {
    const today = new Date();
    return Array.from({ length: count }, (_, i) => {
      const daysAgo = count - 1 - i;
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
      const day = dayFor(d, daysAgo);
      // Today is still in progress.
      if (daysAgo === 0) return { ...day, steps: Math.round((day.steps ?? 0) * 0.45), activeKcal: Math.round((day.activeKcal ?? 0) * 0.45) };
      return day;
    });
  },
  async probe(): Promise<ProbeResult[]> {
    const at = new Date();
    const zepp = (label: string, identifier: string, count: number, value: string): ProbeResult => ({
      label,
      identifier,
      count,
      latest: { value, at, source: 'Zepp (sample data)' },
      sources: ['Zepp (sample data)'],
    });
    return [
      zepp('HRV', 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN', 7, '61.2 ms'),
      zepp('Resting heart rate', 'HKQuantityTypeIdentifierRestingHeartRate', 7, '56 bpm'),
      zepp('Heart rate', 'HKQuantityTypeIdentifierHeartRate', 9800, '72 bpm'),
      zepp('Steps', 'HKQuantityTypeIdentifierStepCount', 420, '412'),
      zepp('Active energy', 'HKQuantityTypeIdentifierActiveEnergyBurned', 300, '12 kcal'),
      { label: 'Resting energy', identifier: 'HKQuantityTypeIdentifierBasalEnergyBurned', count: 0, latest: null, sources: [] },
      { label: 'Body mass', identifier: 'HKQuantityTypeIdentifierBodyMass', count: 0, latest: null, sources: [] },
      { label: 'Breathing rate', identifier: 'HKQuantityTypeIdentifierRespiratoryRate', count: 0, latest: null, sources: [] },
      zepp('Blood oxygen', 'HKQuantityTypeIdentifierOxygenSaturation', 14, '97%'),
      zepp('Sleep', 'HKCategoryTypeIdentifierSleepAnalysis', 42, 'with stages'),
      { label: 'Workouts', identifier: 'HKWorkoutTypeIdentifier', count: 0, latest: null, sources: [] },
    ];
  },
};
