import type { BodyProfile, Sex } from './energy';
import { DEFAULT_PROTEIN_G_PER_KG } from './nutrition';
import { isNum, round, type Maybe } from './stats';

/**
 * Who you are and what you're aiming for. Stored on the phone, and later in
 * the `profiles` table (see supabase/migrations). Lengths and weights are
 * always held in metric; `units` only decides how they're shown.
 */

export type Units = 'metric' | 'imperial';

export interface Targets {
  kcal: number;
  proteinPerKg: number;
  steps: number;
  sleepMin: number;
}

export interface UserSettings {
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  units: Units;
  targets: Targets;
}

/** Steps and sleep from the design doc; protein from nutrition.ts. */
export const DEFAULT_TARGETS: Targets = {
  kcal: 2500,
  proteinPerKg: DEFAULT_PROTEIN_G_PER_KG,
  steps: 8000,
  sleepMin: 480,
};

export const DEFAULT_SETTINGS: UserSettings = {
  sex: null,
  birthYear: null,
  heightCm: null,
  units: 'metric',
  targets: DEFAULT_TARGETS,
};

/** Oldest and youngest birth years the app will accept (schema allows 1900–2100). */
export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE = 120;

/**
 * Age in whole years. Only the birth year is known, so this is this year minus
 * that year: right for most of the year, one high before your birthday. BMR
 * moves by 5 kcal per year of age, so the error is worth less than a biscuit.
 */
export function ageFrom(birthYear: Maybe<number>, on: Date = new Date()): number | null {
  if (!isNum(birthYear)) return null;
  const age = on.getFullYear() - Math.round(birthYear);
  if (age < 0 || age > MAX_AGE) return null;
  return age;
}

/**
 * The profile `bmrMifflinStJeor` needs, or null when something is still
 * missing. Weight comes from Apple Health, the rest from Settings.
 */
export function bodyProfile(settings: UserSettings, weightKg: Maybe<number>): BodyProfile | null {
  const age = ageFrom(settings.birthYear);
  if (settings.sex === null || !isNum(settings.heightCm) || !isNum(weightKg) || age === null) return null;
  if (weightKg <= 0 || settings.heightCm <= 0) return null;
  return { weightKg, heightCm: settings.heightCm, age, sex: settings.sex };
}

/** True once resting energy can be estimated without Apple Health. */
export function profileIsComplete(settings: UserSettings): boolean {
  return settings.sex !== null && isNum(settings.heightCm) && ageFrom(settings.birthYear) !== null;
}

/* ------------------------------------------------------------------ */
/* Units                                                               */
/* ------------------------------------------------------------------ */

export const LB_PER_KG = 2.2046226218;
export const LB_PER_STONE = 14;
export const CM_PER_INCH = 2.54;
export const INCHES_PER_FOOT = 12;

export function kgToStoneLb(kg: number): { stone: number; lb: number } {
  const totalLb = kg * LB_PER_KG;
  const stone = Math.floor(totalLb / LB_PER_STONE);
  const lb = round(totalLb - stone * LB_PER_STONE, 1);
  // Rounding can push the remainder up to a whole stone.
  if (lb >= LB_PER_STONE) return { stone: stone + 1, lb: 0 };
  return { stone, lb };
}

export function stoneLbToKg(stone: number, lb: number): number {
  return round((stone * LB_PER_STONE + lb) / LB_PER_KG, 2);
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / INCHES_PER_FOOT);
  const inches = round(totalInches - ft * INCHES_PER_FOOT, 0);
  if (inches >= INCHES_PER_FOOT) return { ft: ft + 1, inches: 0 };
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return round((ft * INCHES_PER_FOOT + inches) * CM_PER_INCH, 1);
}

/** "75.5 kg" or "11 st 12 lb". */
export function formatWeight(kg: Maybe<number>, units: Units): string {
  if (!isNum(kg)) return '–';
  if (units === 'metric') return `${round(kg, 1).toFixed(1)} kg`;
  const { stone, lb } = kgToStoneLb(kg);
  return `${stone} st ${lb.toFixed(1)} lb`;
}

/**
 * A weekly rate of change: "+0.14 kg" or "-0.3 lb". Stone makes no sense for
 * a change this small, so imperial uses pounds on their own.
 */
export function formatWeightChange(kg: Maybe<number>, units: Units): string {
  if (!isNum(kg)) return '–';
  const value = units === 'metric' ? round(kg, 2) : round(kg * LB_PER_KG, 1);
  const unit = units === 'metric' ? 'kg' : 'lb';
  return `${value > 0 ? '+' : ''}${value.toFixed(units === 'metric' ? 2 : 1)} ${unit}`;
}

/** "178 cm" or "5 ft 10 in". */
export function formatHeight(cm: Maybe<number>, units: Units): string {
  if (!isNum(cm)) return '–';
  if (units === 'metric') return `${Math.round(cm)} cm`;
  const { ft, inches } = cmToFtIn(cm);
  return `${ft} ft ${inches} in`;
}
