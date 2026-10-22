import { round } from './stats';

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;

/** Design doc defaults: protein 1.6 g/kg (adjustable), fat at least 25% of calories. */
export const DEFAULT_PROTEIN_G_PER_KG = 1.6;
export const DEFAULT_FAT_SHARE = 0.25;

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

/**
 * Split a calorie target into grams. Protein first (by body weight), then fat
 * (a share of calories), and carbs fill whatever is left (never below zero).
 */
export function macroTargets(
  kcalTarget: number,
  weightKg: number,
  opts: { proteinPerKg?: number; fatShare?: number } = {},
): MacroTargets {
  const { proteinPerKg = DEFAULT_PROTEIN_G_PER_KG, fatShare = DEFAULT_FAT_SHARE } = opts;
  const proteinG = Math.round(proteinPerKg * weightKg);
  const fatG = Math.round((fatShare * kcalTarget) / KCAL_PER_G.fat);
  const leftover = kcalTarget - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat;
  const carbsG = Math.max(0, Math.round(leftover / KCAL_PER_G.carbs));
  return { kcal: Math.round(kcalTarget), proteinG, fatG, carbsG };
}

export interface FoodLine {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function sumFood(lines: readonly FoodLine[]): FoodLine {
  const t = lines.reduce(
    (acc, l) => ({
      kcal: acc.kcal + l.kcal,
      proteinG: acc.proteinG + l.proteinG,
      carbsG: acc.carbsG + l.carbsG,
      fatG: acc.fatG + l.fatG,
    }),
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
  return { kcal: Math.round(t.kcal), proteinG: round(t.proteinG, 1), carbsG: round(t.carbsG, 1), fatG: round(t.fatG, 1) };
}

/** Scale per-100 g values (from Open Food Facts or a saved food) to a portion. */
export function scalePer100g(per100g: FoodLine, grams: number): FoodLine {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    proteinG: round(per100g.proteinG * f, 1),
    carbsG: round(per100g.carbsG * f, 1),
    fatG: round(per100g.fatG * f, 1),
  };
}
