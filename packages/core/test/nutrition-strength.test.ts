import { describe, expect, it } from 'vitest';
import { epley1RM, findPersonalRecords, macroTargets, scalePer100g, sumFood, volumeByMuscle, type LoggedSet } from '../src';

describe('nutrition', () => {
  it('splits calories into protein, fat and carbs', () => {
    // Protein 1.6 × 75 = 120 g (480 kcal); fat 25% of 2500 = 69 g (621 kcal); carbs = 1399 ÷ 4.
    expect(macroTargets(2500, 75)).toEqual({ kcal: 2500, proteinG: 120, fatG: 69, carbsG: 350 });
  });

  it('never sets negative carbs', () => {
    expect(macroTargets(800, 100).carbsG).toBe(0);
  });

  it('respects a custom protein target', () => {
    expect(macroTargets(2500, 75, { proteinPerKg: 2 }).proteinG).toBe(150);
  });

  it('adds up a day of food', () => {
    expect(
      sumFood([
        { kcal: 400.4, proteinG: 30.25, carbsG: 40, fatG: 10 },
        { kcal: 250, proteinG: 5, carbsG: 30.15, fatG: 12 },
      ]),
    ).toEqual({ kcal: 650, proteinG: 35.3, carbsG: 70.2, fatG: 22 });
  });

  it('scales per-100 g values to a portion', () => {
    expect(scalePer100g({ kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 }, 200)).toEqual({ kcal: 330, proteinG: 62, carbsG: 0, fatG: 7.2 });
  });
});

describe('strength', () => {
  it('estimates a one-rep max (Epley)', () => {
    expect(epley1RM(100, 5)).toBe(116.7);
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 0)).toBe(0);
  });

  const sets: LoggedSet[] = [
    { exercise: 'Bench press', muscleGroup: 'chest', reps: 8, weightKg: 60, date: '2026-10-01' },
    { exercise: 'Squat', muscleGroup: 'legs', reps: 5, weightKg: 80, date: '2026-10-01' },
    { exercise: 'Bench press', muscleGroup: 'chest', reps: 8, weightKg: 62.5, date: '2026-10-08' },
    { exercise: 'Bench press', muscleGroup: 'chest', reps: 5, weightKg: 62.5, date: '2026-10-08' },
  ];

  it('totals volume per muscle group', () => {
    expect(volumeByMuscle(sets)).toEqual({ chest: 1292.5, legs: 400 });
  });

  it('finds personal records, ignoring first-ever sets', () => {
    const prs = findPersonalRecords(sets);
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({ exercise: 'Bench press', date: '2026-10-08', estimated1RM: 79.2, previousBest: 76 });
  });
});
