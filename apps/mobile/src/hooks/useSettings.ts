import { DEFAULT_SETTINGS, DEFAULT_TARGETS, type UserSettings } from '@baseline/core';
import { createStoredValue } from '@/lib/externalStore';

/** Your profile and targets, shared by every screen. */

function revive(saved: unknown): UserSettings {
  if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS;
  const s = saved as Partial<UserSettings>;
  return {
    sex: s.sex ?? DEFAULT_SETTINGS.sex,
    birthYear: s.birthYear ?? DEFAULT_SETTINGS.birthYear,
    heightCm: s.heightCm ?? DEFAULT_SETTINGS.heightCm,
    units: s.units ?? DEFAULT_SETTINGS.units,
    targets: { ...DEFAULT_TARGETS, ...(s.targets ?? {}) },
  };
}

const settingsStore = createStoredValue<UserSettings>('settings', DEFAULT_SETTINGS, revive);

export interface SettingsState {
  loading: boolean;
  settings: UserSettings;
}

export function useSettings(): SettingsState {
  const { loading, value } = settingsStore.subscribeHook();
  return { loading, settings: value };
}

export function saveSettings(next: UserSettings): Promise<void> {
  return settingsStore.set(next);
}

/**
 * The last weigh-in Today read from Apple Health, kept so the Food screen can
 * work out a protein target without reading Apple Health all over again.
 */
const lastWeightStore = createStoredValue<number | null>('lastWeightKg', null);

export function useLastWeight(): number | null {
  return lastWeightStore.subscribeHook().value;
}

export function rememberWeight(kg: number | null): void {
  if (kg !== lastWeightStore.get()) void lastWeightStore.set(kg);
}
