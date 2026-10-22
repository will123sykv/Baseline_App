import { describe, expect, it } from 'vitest';
import { baseline, clamp, mean, present, rollingMean, sd, zScore } from '../src';
import { alternating } from './helpers';

describe('stats', () => {
  it('ignores gaps', () => {
    expect(present([1, null, 2, undefined, Number.NaN, 3])).toEqual([1, 2, 3]);
  });

  it('computes mean and sample sd', () => {
    expect(mean([2, 4, 6])).toBe(4);
    expect(sd([2, 4, 6])).toBe(2);
    expect(mean([])).toBeNull();
    expect(sd([5])).toBeNull();
  });

  it('clamps', () => {
    expect(clamp(120, 0, 100)).toBe(100);
    expect(clamp(-3, 0, 100)).toBe(0);
  });

  it('averages the last n days', () => {
    expect(rollingMean([1000, 2000, null, 4000, 6000], 3)).toBe(5000);
  });

  it('needs 14 days before a baseline exists', () => {
    expect(baseline(alternating(55, 59, 13))).toBeNull();
    expect(baseline(alternating(55, 59, 14))).not.toBeNull();
  });

  it('uses only the last 30 days', () => {
    const b = baseline([...alternating(100, 100, 30), ...alternating(55, 59, 30)]);
    expect(b?.mean).toBe(57);
    expect(b?.n).toBe(30);
  });

  it('refuses a flat baseline (sd = 0)', () => {
    expect(baseline(Array(20).fill(60))).toBeNull();
  });

  it('scores distance from the mean in SDs', () => {
    const b = baseline(alternating(55, 59))!;
    expect(zScore(57, b)).toBeCloseTo(0);
    expect(zScore(57 + b.sd, b)).toBeCloseTo(1);
  });
});
