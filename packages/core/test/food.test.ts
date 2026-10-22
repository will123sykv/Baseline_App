import { describe, expect, it } from 'vitest';
import {
  copyEntriesTo,
  dayTotals,
  entriesForDate,
  entryFromSaved,
  groupByMeal,
  macroProgress,
  mealForTime,
  progress,
  type FoodEntry,
  type SavedFood,
} from '../src';

function entry(over: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'a',
    eatenAt: '2026-10-22T08:30:00',
    meal: 'breakfast',
    source: 'quick',
    name: 'Porridge',
    grams: 60,
    kcal: 220,
    proteinG: 8,
    carbsG: 38,
    fatG: 4,
    ...over,
  };
}

describe('days', () => {
  it('keeps a late dinner on the day it was eaten', () => {
    // 23:30 local is the next day in UTC, which is exactly the trap.
    const late = entry({ eatenAt: '2026-10-22T23:30:00', meal: 'dinner' });
    expect(entriesForDate([late], '2026-10-22')).toHaveLength(1);
  });

  it('keeps only the day asked for', () => {
    const today = entry({ id: 'a' });
    const yesterday = entry({ id: 'b', eatenAt: '2026-10-21T08:30:00' });
    expect(entriesForDate([today, yesterday], '2026-10-22').map((e) => e.id)).toEqual(['a']);
  });

  it('adds up a day', () => {
    expect(dayTotals([entry(), entry({ id: 'b', kcal: 500, proteinG: 30, carbsG: 50, fatG: 18 })])).toEqual({
      kcal: 720,
      proteinG: 38,
      carbsG: 88,
      fatG: 22,
    });
  });

  it('groups by meal, earliest first', () => {
    const grouped = groupByMeal([
      entry({ id: 'late', eatenAt: '2026-10-22T13:00:00', meal: 'lunch' }),
      entry({ id: 'early', eatenAt: '2026-10-22T12:00:00', meal: 'lunch' }),
    ]);
    expect(grouped.lunch.map((e) => e.id)).toEqual(['early', 'late']);
    expect(grouped.dinner).toEqual([]);
  });

  it('guesses the meal from the time of day', () => {
    expect(mealForTime(new Date(2026, 9, 22, 8))).toBe('breakfast');
    expect(mealForTime(new Date(2026, 9, 22, 13))).toBe('lunch');
    expect(mealForTime(new Date(2026, 9, 22, 19))).toBe('dinner');
    expect(mealForTime(new Date(2026, 9, 22, 23))).toBe('snack');
    expect(mealForTime(new Date(2026, 9, 22, 2))).toBe('snack');
  });
});

describe('progress against target', () => {
  it('works out what is left', () => {
    // 2500 kcal at 75 kg: 120 g protein, 69 g fat, 350 g carbs.
    const p = macroProgress([entry()], 2500, 75);
    expect(p?.targets).toEqual({ kcal: 2500, proteinG: 120, fatG: 69, carbsG: 350 });
    expect(p?.remaining).toEqual({ kcal: 2280, proteinG: 112, carbsG: 312, fatG: 65 });
  });

  it('goes negative once you are over', () => {
    const p = macroProgress([entry({ kcal: 3000, proteinG: 0, carbsG: 0, fatG: 0 })], 2500, 75);
    expect(p?.remaining.kcal).toBe(-500);
  });

  it('has nothing to show without a weigh-in, because protein scales with weight', () => {
    expect(macroProgress([entry()], 2500, null)).toBeNull();
    expect(macroProgress([entry()], 2500, 0)).toBeNull();
  });

  it('measures progress as a fraction of the target', () => {
    expect(progress(50, 200)).toBe(0.25);
    expect(progress(250, 200)).toBe(1.25);
    expect(progress(10, 0)).toBe(0);
  });
});

describe('building entries', () => {
  const chicken: SavedFood = {
    id: 's1',
    name: 'Chicken breast',
    barcode: null,
    per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.6 },
    usualGrams: 150,
  };

  it('scales a saved food to the portion eaten', () => {
    const e = entryFromSaved(chicken, 200, 'dinner', new Date(2026, 9, 22, 19), 'new');
    expect(e).toMatchObject({ name: 'Chicken breast', grams: 200, kcal: 330, proteinG: 62, source: 'saved', meal: 'dinner' });
  });

  it('copies a day onto another, keeping the time but not the identity', () => {
    let n = 0;
    const copied = copyEntriesTo([entry({ eatenAt: '2026-10-21T08:30:00' })], '2026-10-22', () => `id${++n}`);
    expect(copied[0]?.id).toBe('id1');
    expect(new Date(copied[0]!.eatenAt).getHours()).toBe(8);
    expect(new Date(copied[0]!.eatenAt).getDate()).toBe(22);
  });
});
