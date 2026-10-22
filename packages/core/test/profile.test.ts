import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  ageFrom,
  bmrMifflinStJeor,
  bodyProfile,
  cmToFtIn,
  formatHeight,
  formatWeight,
  formatWeightChange,
  ftInToCm,
  kgToStoneLb,
  profileIsComplete,
  stoneLbToKg,
  type UserSettings,
} from '../src';

const WILL: UserSettings = {
  sex: 'male',
  birthYear: 1996,
  heightCm: 178,
  units: 'metric',
  targets: DEFAULT_SETTINGS.targets,
};

describe('age', () => {
  it('counts whole years from the birth year', () => {
    expect(ageFrom(1996, new Date(2026, 5, 1))).toBe(30);
  });

  it('is null without a birth year', () => {
    expect(ageFrom(null)).toBeNull();
    expect(ageFrom(undefined)).toBeNull();
  });

  it('rejects a year that would make an impossible age', () => {
    expect(ageFrom(2030, new Date(2026, 0, 1))).toBeNull(); // not born yet
    expect(ageFrom(1800, new Date(2026, 0, 1))).toBeNull(); // over 120
  });
});

describe('body profile', () => {
  it('builds the profile Mifflin–St Jeor needs', () => {
    const p = bodyProfile(WILL, 75);
    expect(p).toEqual({ weightKg: 75, heightCm: 178, age: ageFrom(1996), sex: 'male' });
  });

  it('feeds a sensible resting energy', () => {
    // 10×75 + 6.25×178 − 5×30 + 5 = 1717.5 → 1718
    const p = bodyProfile(WILL, 75);
    expect(bmrMifflinStJeor({ ...p!, age: 30 })).toBe(1718);
  });

  it('is null until every part is known', () => {
    expect(bodyProfile(WILL, null)).toBeNull();
    expect(bodyProfile({ ...WILL, sex: null }, 75)).toBeNull();
    expect(bodyProfile({ ...WILL, heightCm: null }, 75)).toBeNull();
    expect(bodyProfile({ ...WILL, birthYear: null }, 75)).toBeNull();
  });

  it('rejects impossible measurements', () => {
    expect(bodyProfile(WILL, 0)).toBeNull();
    expect(bodyProfile({ ...WILL, heightCm: 0 }, 75)).toBeNull();
  });

  it('knows when settings still need filling in', () => {
    expect(profileIsComplete(DEFAULT_SETTINGS)).toBe(false);
    expect(profileIsComplete(WILL)).toBe(true);
  });
});

describe('units', () => {
  it('converts kilograms to stone and pounds and back', () => {
    expect(kgToStoneLb(75)).toEqual({ stone: 11, lb: 11.3 });
    expect(stoneLbToKg(11, 11.3)).toBeCloseTo(75, 1);
  });

  it('carries a rounded-up remainder into the next stone', () => {
    // 88.9 kg is 13 st 13.98 lb, which rounds to 14 lb — a whole stone.
    expect(kgToStoneLb(88.9)).toEqual({ stone: 14, lb: 0 });
  });

  it('converts centimetres to feet and inches and back', () => {
    expect(cmToFtIn(178)).toEqual({ ft: 5, inches: 10 });
    expect(ftInToCm(5, 10)).toBeCloseTo(177.8, 1);
  });

  it('formats weight and height in the chosen units', () => {
    expect(formatWeight(75, 'metric')).toBe('75.0 kg');
    expect(formatWeight(75, 'imperial')).toBe('11 st 11.3 lb');
    expect(formatHeight(178, 'metric')).toBe('178 cm');
    expect(formatHeight(178, 'imperial')).toBe('5 ft 10 in');
  });

  it('formats a weekly change in pounds, not stone', () => {
    expect(formatWeightChange(-0.14, 'metric')).toBe('-0.14 kg');
    expect(formatWeightChange(0.14, 'metric')).toBe('+0.14 kg');
    expect(formatWeightChange(-0.14, 'imperial')).toBe('-0.3 lb');
    expect(formatWeightChange(null, 'metric')).toBe('–');
  });

  it('shows a dash when there is nothing to show', () => {
    expect(formatWeight(null, 'metric')).toBe('–');
    expect(formatHeight(null, 'imperial')).toBe('–');
  });
});
