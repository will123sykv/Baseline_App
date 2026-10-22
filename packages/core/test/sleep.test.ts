import { describe, expect, it } from 'vitest';
import { minutesFromNoon, sleepDebtHours, sleepScore, timingSpreadMin, type Night } from '../src';

const perfect: Night = { asleepMin: 480, awakeMin: 0, deepMin: 100, remMin: 100, bedtimeMin: 23 * 60, wakeMin: 7 * 60 };

describe('sleep', () => {
  it('handles times either side of midnight', () => {
    expect(minutesFromNoon(23 * 60)).toBe(660);
    expect(minutesFromNoon(60)).toBe(780);
    // 23:30 and 00:30 are an hour apart, not 23 hours.
    expect(timingSpreadMin([{ asleepMin: 480, bedtimeMin: 1410 }, { asleepMin: 480, bedtimeMin: 30 }])).toBeCloseTo(42.43, 1);
  });

  it('gives a full, regular, uninterrupted night 100', () => {
    expect(sleepScore(Array(7).fill(perfect))?.score).toBe(100);
  });

  it('scores duration alone when nothing else is known', () => {
    const r = sleepScore([{ asleepMin: 240 }]);
    expect(r?.score).toBe(50);
    expect(r?.parts.map((p) => p.part)).toEqual(['duration']);
  });

  it('caps duration at the target', () => {
    expect(sleepScore([{ asleepMin: 600 }])?.score).toBe(100);
  });

  it('penalises irregular timing', () => {
    const irregular: Night[] = [0, 90, 0, 90, 0, 90, 0].map((shift) => ({ ...perfect, bedtimeMin: (23 * 60 + shift) % 1440, wakeMin: 7 * 60 + shift }));
    expect(sleepScore(irregular)!.score).toBeLessThan(100);
  });

  it('penalises time awake', () => {
    expect(sleepScore([{ ...perfect, awakeMin: 30 }])!.score).toBeLessThan(sleepScore([perfect])!.score);
  });

  it('returns null with no night', () => {
    expect(sleepScore([])).toBeNull();
  });

  it('counts only shortfalls as debt', () => {
    const nights: Night[] = [{ asleepMin: 420 }, { asleepMin: 480 }, { asleepMin: 540 }];
    expect(sleepDebtHours(nights)).toBe(1);
  });
});
