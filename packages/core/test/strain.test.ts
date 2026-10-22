import { describe, expect, it } from 'vitest';
import { estimatedMaxHr, heartRateLoad, heartRateZone, loadBalance, sessionEffortLoad, zoneMinutes } from '../src';

describe('strain', () => {
  it('estimates max HR', () => {
    expect(estimatedMaxHr(20)).toBe(194);
  });

  it('places heart rate in zones by % of max', () => {
    expect(heartRateZone(99, 200)).toBe(0);
    expect(heartRateZone(100, 200)).toBe(1);
    expect(heartRateZone(140, 200)).toBe(3);
    expect(heartRateZone(185, 200)).toBe(5);
  });

  it('weights each minute by its zone', () => {
    expect(heartRateLoad([{ bpm: 140, seconds: 3600 }], 200)).toBe(180);
    expect(zoneMinutes([{ bpm: 120, seconds: 600 }, { bpm: 170, seconds: 300 }], 200)).toEqual([0, 10, 0, 5, 0]);
  });

  it('scores a lifting session without HR from effort', () => {
    expect(sessionEffortLoad(6, 60)).toBe(180);
  });

  it('flags a fast ramp-up', () => {
    const loads = [...Array(21).fill(100), ...Array(7).fill(200)];
    const b = loadBalance(loads);
    expect(b.acute).toBe(200);
    expect(b.chronic).toBe(125);
    expect(b.ratio).toBe(1.6);
    expect(b.flag).toBe('high');
  });

  it('calls a steady month normal', () => {
    expect(loadBalance(Array(28).fill(100)).flag).toBe('normal');
  });

  it('flags a big drop', () => {
    expect(loadBalance([...Array(21).fill(100), ...Array(7).fill(20)]).flag).toBe('low');
  });

  it('waits for 14 days of history', () => {
    expect(loadBalance(Array(10).fill(100)).flag).toBe('calibrating');
  });
});
