import { useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, DEFAULT_TARGETS, type UserSettings } from '@baseline/core';
import { store } from '@/lib/store';

/**
 * Your profile and targets, shared by every screen.
 *
 * This is a module-level store rather than a plain hook so that saving in
 * Settings immediately refreshes Today. React subscribes to it with
 * `useSyncExternalStore`.
 */

const KEY = 'settings';

export interface SettingsState {
  loading: boolean;
  settings: UserSettings;
}

let snapshot: SettingsState = { loading: true, settings: DEFAULT_SETTINGS };
const listeners = new Set<() => void>();
let started = false;

function emit(next: SettingsState): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

/** Fill in anything a saved file is missing, so an older save still opens. */
function withDefaults(saved: Partial<UserSettings> | null): UserSettings {
  if (!saved || typeof saved !== 'object') return DEFAULT_SETTINGS;
  return {
    sex: saved.sex ?? DEFAULT_SETTINGS.sex,
    birthYear: saved.birthYear ?? DEFAULT_SETTINGS.birthYear,
    heightCm: saved.heightCm ?? DEFAULT_SETTINGS.heightCm,
    units: saved.units ?? DEFAULT_SETTINGS.units,
    targets: { ...DEFAULT_TARGETS, ...(saved.targets ?? {}) },
  };
}

async function start(): Promise<void> {
  if (started) return;
  started = true;
  const saved = await store.get<Partial<UserSettings> | null>(KEY, null);
  emit({ loading: false, settings: withDefaults(saved) });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void start();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SettingsState {
  return snapshot;
}

/** Save and tell every screen straight away; the file write happens after. */
export async function saveSettings(next: UserSettings): Promise<void> {
  emit({ loading: false, settings: next });
  await store.set(KEY, next);
}

export function useSettings(): SettingsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
