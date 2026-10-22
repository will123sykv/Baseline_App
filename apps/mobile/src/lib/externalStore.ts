import { useSyncExternalStore } from 'react';
import { store } from './store';

/**
 * A saved value that every screen sees the same copy of.
 *
 * A plain `useState` hook would give each screen its own copy, so saving in
 * Settings wouldn't update Today. This keeps one copy outside React and lets
 * any number of screens subscribe to it.
 */

export interface Snapshot<T> {
  loading: boolean;
  value: T;
}

export interface StoredValue<T> {
  /** Call this from a component, like any other hook. */
  subscribeHook(): Snapshot<T>;
  get(): T;
  set(next: T): Promise<void>;
}

export function createStoredValue<T>(
  key: string,
  fallback: T,
  /** Fill in anything an older save is missing, so it still opens. */
  revive: (saved: unknown) => T = (saved) => (saved === undefined || saved === null ? fallback : (saved as T)),
): StoredValue<T> {
  let snapshot: Snapshot<T> = { loading: true, value: fallback };
  const listeners = new Set<() => void>();
  let started = false;

  const emit = (next: Snapshot<T>) => {
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const start = async () => {
    if (started) return;
    started = true;
    const saved = await store.get<unknown>(key, null);
    emit({ loading: false, value: revive(saved) });
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    void start();
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => snapshot;

  return {
    subscribeHook: () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot),
    get: () => snapshot.value,
    // Tell the screens straight away; the file write happens after.
    set: async (next: T) => {
      emit({ loading: false, value: next });
      await store.set(key, next);
    },
  };
}

/** Ids for rows we create on the phone. Good enough for one person's food log. */
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
