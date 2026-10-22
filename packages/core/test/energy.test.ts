import { describe, expect, it } from 'vitest';
import { bmrMifflinStJeor, caloriesOut, daysBetween, energyBalance, realTdee, weeklyRateKg, weightTrend, type TdeeDay } from '../src';
import { dates } from './helpers';

const will = { weightKg: 75, heightCm: 180, age: 20, sex: 'male' as const };

describe('energy', () => {
  it('computes Mifflin–St Jeor', () => {
    expect(bmrMifflinStJeor(will)).toBe(1780);
    expect(bmrMifflinStJeor({ ...will, sex: 'female' })).toBe(1614);
  });

  it('prefers resting energy from Apple Health', () => {
    expect(caloriesOut(500, 1700, will)).toEqual({ total: 2200, active: 500, resting: 1700, restingEstimated: false });
  });

  it('falls back to the formula for resting energy', () => {
    expect(caloriesOut(500, null, will)).toEqual({ total: 2280, active: 500, resting: 1780, restingEstimated: true });
    expect(caloriesOut(500, null)).toBeNull();
  });

  it('signs energy balance as surplus positive', () => {
    expect(energyBalance(2500, 2200)).toBe(300);
  });
});

describe('weight trend', () => {
  it('moves 10% towards each weigh-in and holds on missing days', () => {
    const t = weightTrend([
      { date: '2026-10-01', kg: 80 },
      { date: '2026-10-02', kg: null },
      { date: '2026-10-03', kg: 81 },
    ]);
    expect(t.map((p) => p.trendKg)).toEqual([80, 80, 80.1]);
  });

  it('is null before the first weigh-in', () => {
    expect(weightTrend([{ date: '2026-10-01', kg: null }])[0]?.trendKg).toBeNull();
  });

  it('reports kg per week', () => {
    const days = dates('2026-10-01', 8).map((date, i) => ({ date, kg: 80 - i * 0.1 }));
    const rate = weeklyRateKg(weightTrend(days, 1));
    expect(rate).toBeCloseTo(-0.7);
  });
});

describe('real TDEE', () => {
  const window = (logged: number, intake = 2500): TdeeDay[] =>
    dates('2026-10-01', 21).map((date, i) => ({
      date,
      intakeKcal: i < logged ? intake : null,
      trendKg: 80 - i * 0.05, // 1 kg lost over the 20-day span
    }));

  it('solves energy balance from real weight change', () => {
    const r = realTdee(window(21), 2600);
    // 2500 − 7700 × (−1.0) ÷ 20 = 2885
    expect(r.realKcal).toBe(2885);
    expect(r.kcal).toBe(2885);
    expect(r.confidence).toBe('high');
  });

  it('blends with the wearable estimate while data is thin', () => {
    const r = realTdee(window(10), 2600);
    expect(r.realWeight).toBe(0.48);
    expect(r.kcal).toBeGreaterThan(2600);
    expect(r.kcal).toBeLessThan(2885);
    expect(r.confidence).toBe('low');
  });

  it('uses the wearable estimate alone under 7 logged days', () => {
    const r = realTdee(window(5), 2600);
    expect(r.kcal).toBe(2600);
    expect(r.confidence).toBe('none');
  });

  it('counts days between ISO dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-21')).toBe(20);
  });
});
