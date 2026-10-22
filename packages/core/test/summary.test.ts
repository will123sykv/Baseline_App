import { describe, expect, it } from 'vitest';
import { summarizeToday, type DayHealth } from '../src';
import { dates } from './helpers';

function month(overrides: Partial<DayHealth> = {}, n = 31): DayHealth[] {
  return dates('2026-09-21', n).map((date, i) => ({
    date,
    steps: 8000 + (i % 2) * 1000,
    activeKcal: 500,
    restingKcal: 1750,
    hrvMs: i % 2 === 0 ? 50 : 72,
    restingHr: i % 2 === 0 ? 55 : 59,
    weightKg: 76 - i * 0.02,
    sleep: { asleepMin: 450 + (i % 2) * 30, awakeMin: 10, bedtimeMin: 1380, wakeMin: 420 },
    ...overrides,
  }));
}

describe('today summary', () => {
  it('returns null with no days', () => {
    expect(summarizeToday([])).toBeNull();
  });

  it('builds every Today card from a month of data', () => {
    const days = month();
    days[30] = { ...days[30]!, hrvMs: 60, restingHr: 57 };
    const s = summarizeToday(days)!;
    expect(s.date).toBe('2026-10-21');
    expect(s.recovery.status).toBe('full');
    expect(s.recovery.score).toBeGreaterThan(30);
    expect(s.recovery.score).toBeLessThan(70);
    expect(s.hrvDays).toBe(31);
    expect(s.sleep.asleepMin).toBe(450);
    expect(s.sleep.debtHours).toBeGreaterThan(0);
    expect(s.caloriesOut?.total).toBe(2250);
    // Previous 7 days: four at 9,000 and three at 8,000.
    expect(s.steps.avg7).toBe(8571);
    expect(s.weight.weeklyRateKg).toBeLessThan(0);
    expect(s.illness.warning).toBe(false);
  });

  it('stays calibrating in the first fortnight', () => {
    const s = summarizeToday(month({}, 10))!;
    expect(s.recovery.status).toBe('calibrating');
    expect(s.recovery.score).toBeNull();
  });

  it('copes with a phone-only setup (no heart data)', () => {
    const s = summarizeToday(month({ hrvMs: null, restingHr: null, sleep: null, restingKcal: null }))!;
    expect(s.recovery.status).toBe('calibrating');
    expect(s.caloriesOut).toBeNull();
    expect(s.sleep.score).toBeNull();
    expect(s.steps.today).toBe(8000);
  });
});
