/**
 * Baseline design tokens. Dark, data-dense, one colour per meaning:
 * green/amber/red are for recovery only; blue = sleep; orange = strain; teal = food.
 */
export const colors = {
  bg: '#0B0D10',
  card: '#14171C',
  cardRaised: '#1B1F26',
  border: '#232831',
  text: '#F3F5F7',
  textDim: '#9AA3AE',
  textFaint: '#5E6773',

  recoveryGreen: '#2FD08A',
  recoveryAmber: '#F2B636',
  recoveryRed: '#F0524F',

  sleep: '#5B8CFF',
  strain: '#FF8A3D',
  food: '#2BC5C0',
  steps: '#C38CFF',

  ok: '#2FD08A',
  warn: '#F2B636',
  bad: '#F0524F',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 14, lg: 20 } as const;

export const type = {
  hero: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '700' as const },
  number: { fontSize: 26, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  body: { fontSize: 15, fontWeight: '400' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};

export function recoveryColor(band: 'green' | 'amber' | 'red' | null): string {
  if (band === 'green') return colors.recoveryGreen;
  if (band === 'amber') return colors.recoveryAmber;
  if (band === 'red') return colors.recoveryRed;
  return colors.textFaint;
}
