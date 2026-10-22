import { describe, expect, it } from 'vitest';
import { computeRecovery, recoveryBand, sd, type RecoveryHistory } from '../src';
import { alternating } from './helpers';

// HRV alternating 50/72 → geometric mean 60. RHR 55/59 → mean 57.
// Sleep 70/90 → mean 80. Mood 3/4 → mean 3.5.
const history: RecoveryHistory = {
  hrvMs: alternating(50, 72),
  restingHr: alternating(55, 59),
  sleepScore: alternating(70, 90),
  mood: alternating(3, 4),
};
const rhrSd = sd(alternating(55, 59)) as number;

describe('recovery', () => {
  it('scores an ordinary day at 50', () => {
    const r = computeRecovery({ hrvMs: 60, restingHr: 57, sleepScore: 80, mood: 3.5 }, history);
    expect(r.score).toBe(50);
    expect(r.band).toBe('amber');
    expect(r.status).toBe('full');
    expect(r.components).toHaveLength(4);
  });

  it('rewards high HRV and low resting HR', () => {
    const r = computeRecovery({ hrvMs: 80, restingHr: 54, sleepScore: 90, mood: 4 }, history);
    expect(r.score).toBeGreaterThanOrEqual(67);
    expect(r.band).toBe('green');
  });

  it('penalises low HRV and high resting HR', () => {
    const r = computeRecovery({ hrvMs: 40, restingHr: 61, sleepScore: 65, mood: 2 }, history);
    expect(r.score).toBeLessThanOrEqual(33);
    expect(r.band).toBe('red');
  });

  it('treats lower resting HR as better (sign is inverted)', () => {
    const r = computeRecovery({ restingHr: 57 - rhrSd }, history);
    // Only RHR present, z = +1 → 50 + 15 × 1.
    expect(r.score).toBe(65);
    expect(r.components[0]?.z).toBeCloseTo(1);
  });

  it('shares out the weight of missing inputs and marks the score partial without HRV', () => {
    const r = computeRecovery({ restingHr: 57, sleepScore: 80 }, history);
    expect(r.score).toBe(50);
    expect(r.status).toBe('partial');
  });

  it('stays calibrating until a heart signal has 14 days of history', () => {
    const short: RecoveryHistory = { hrvMs: alternating(50, 72, 10), restingHr: alternating(55, 59, 10), sleepScore: history.sleepScore, mood: history.mood };
    const r = computeRecovery({ hrvMs: 60, restingHr: 57, sleepScore: 80, mood: 3.5 }, short);
    expect(r.score).toBeNull();
    expect(r.status).toBe('calibrating');
  });

  it('never leaves 0–100', () => {
    expect(computeRecovery({ hrvMs: 500, restingHr: 30 }, history).score).toBe(100);
    expect(computeRecovery({ hrvMs: 5, restingHr: 120 }, history).score).toBe(0);
  });

  it('ignores impossible HRV values', () => {
    const r = computeRecovery({ hrvMs: 0, restingHr: 57 }, history);
    expect(r.status).toBe('partial');
  });

  it('bands at 67 and 34', () => {
    expect(recoveryBand(67)).toBe('green');
    expect(recoveryBand(66)).toBe('amber');
    expect(recoveryBand(34)).toBe('amber');
    expect(recoveryBand(33)).toBe('red');
  });
});
