import { localIsoDate } from './daily';
import { macroTargets, scalePer100g, sumFood, type FoodLine, type MacroTargets } from './nutrition';
import { isNum, round, type Maybe } from './stats';

/**
 * Food you've logged. Mirrors the `food_entries` and `saved_foods` tables in
 * supabase/migrations, so the same rows can sync later without reshaping.
 */

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealSlot = (typeof MEAL_SLOTS)[number];

export type FoodSource = 'photo' | 'barcode' | 'search' | 'quick' | 'saved';

/** One logged item. Extends FoodLine so `sumFood` can add entries directly. */
export interface FoodEntry extends FoodLine {
  id: string;
  /** ISO timestamp of when it was eaten. */
  eatenAt: string;
  meal: MealSlot;
  source: FoodSource;
  name: string;
  grams: number | null;
}

export interface SavedFood {
  id: string;
  name: string;
  barcode: string | null;
  /** Values for 100 g, as Open Food Facts gives them. */
  per100g: FoodLine;
  usualGrams: number | null;
}

/* ------------------------------------------------------------------ */
/* Days                                                                */
/* ------------------------------------------------------------------ */

/** The local date an entry belongs to, so a late dinner isn't tomorrow's. */
export function entryDate(entry: FoodEntry): string {
  return localIsoDate(new Date(entry.eatenAt));
}

export function entriesForDate(entries: readonly FoodEntry[], date: string): FoodEntry[] {
  return entries.filter((e) => entryDate(e) === date);
}

export function dayTotals(entries: readonly FoodEntry[]): FoodLine {
  return sumFood(entries);
}

/** Entries split by meal, each in the order they were eaten. */
export function groupByMeal(entries: readonly FoodEntry[]): Record<MealSlot, FoodEntry[]> {
  const out: Record<MealSlot, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const e of [...entries].sort((a, b) => a.eatenAt.localeCompare(b.eatenAt))) {
    out[e.meal].push(e);
  }
  return out;
}

/**
 * Which meal a time of day most likely belongs to, so logging needs one tap
 * fewer. Anything late at night or mid-afternoon counts as a snack.
 */
export function mealForTime(at: Date): MealSlot {
  const h = at.getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 21) return 'dinner';
  return 'snack';
}

/* ------------------------------------------------------------------ */
/* Progress against target                                             */
/* ------------------------------------------------------------------ */

export interface MacroProgress {
  eaten: FoodLine;
  targets: MacroTargets;
  /** Negative once you've gone past a target. */
  remaining: FoodLine;
}

/**
 * Today's food against today's targets. Protein scales with body weight, so
 * without a weigh-in there is no protein target to work towards yet.
 */
export function macroProgress(
  entries: readonly FoodEntry[],
  kcalTarget: number,
  weightKg: Maybe<number>,
  opts: { proteinPerKg?: number } = {},
): MacroProgress | null {
  if (!isNum(weightKg) || weightKg <= 0) return null;
  const targets = macroTargets(kcalTarget, weightKg, opts);
  const eaten = dayTotals(entries);
  return {
    eaten,
    targets,
    remaining: {
      kcal: Math.round(targets.kcal - eaten.kcal),
      proteinG: round(targets.proteinG - eaten.proteinG, 1),
      carbsG: round(targets.carbsG - eaten.carbsG, 1),
      fatG: round(targets.fatG - eaten.fatG, 1),
    },
  };
}

/** 0 at nothing eaten, 1 at the target, and past 1 once you go over. */
export function progress(eaten: number, target: number): number {
  if (!isNum(target) || target <= 0) return 0;
  return round(eaten / target, 3);
}

/* ------------------------------------------------------------------ */
/* Building entries                                                    */
/* ------------------------------------------------------------------ */

/** A saved food scaled to a portion, ready to log. */
export function entryFromSaved(
  saved: SavedFood,
  grams: number,
  meal: MealSlot,
  at: Date,
  id: string,
): FoodEntry {
  const line = scalePer100g(saved.per100g, grams);
  return {
    id,
    eatenAt: at.toISOString(),
    meal,
    source: 'saved',
    name: saved.name,
    grams: round(grams, 1),
    ...line,
  };
}

/**
 * Copy a day's food onto another day, keeping the time of day but giving each
 * entry a new identity. `makeId` is passed in so this stays pure.
 */
export function copyEntriesTo(entries: readonly FoodEntry[], toDate: string, makeId: () => string): FoodEntry[] {
  return entries.map((e) => {
    const was = new Date(e.eatenAt);
    const now = new Date(`${toDate}T00:00:00`);
    now.setHours(was.getHours(), was.getMinutes(), 0, 0);
    return { ...e, id: makeId(), eatenAt: now.toISOString() };
  });
}
