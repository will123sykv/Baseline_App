import { describe, expect, it } from 'vitest';
import { illnessCheck, type Morning } from '../src';
import { alternating } from './helpers';

const normal: Morning[] = alternating(55, 59).map((rhr, i) => ({ restingHr: rhr, hrvMs: i % 2 === 0 ? 50 : 72 }));

describe('illness warning', () => {
  it('stays quiet on an ordinary morning', () => {
    expect(illnessCheck([...normal, { restingHr: 57, hrvMs: 60 }]).warning).toBe(false);
  });

  it('fires when resting HR is up and HRV is down on the same morning', () => {
    const r = illnessCheck([...normal, { restingHr: 63, hrvMs: 30 }]);
    expect(r.warning).toBe(true);
    expect(r.reason).toBe('both-today');
    expect(r.rhrZ).toBeGreaterThan(2);
    expect(r.hrvZ).toBeLessThan(-1.5);
  });

  it('waits for a second morning when only one signal moves', () => {
    expect(illnessCheck([...normal, { restingHr: 63, hrvMs: 60 }]).warning).toBe(false);
    const r = illnessCheck([...normal, { restingHr: 63, hrvMs: 60 }, { restingHr: 64, hrvMs: 60 }]);
    expect(r.warning).toBe(true);
    expect(r.reason).toBe('rhr-two-days');
  });

  it('needs a baseline first', () => {
    expect(illnessCheck([{ restingHr: 70, hrvMs: 20 }]).warning).toBe(false);
  });
});
