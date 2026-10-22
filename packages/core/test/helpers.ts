/** Build a history of `n` days that alternates between two values (oldest first). */
export function alternating(a: number, b: number, n = 30): number[] {
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? a : b));
}

/** Consecutive ISO dates starting from `start`. */
export function dates(start: string, n: number): string[] {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(t0 + i * 86_400_000).toISOString().slice(0, 10));
}
