import { entriesForDate, localIsoDate, type FoodEntry, type SavedFood } from '@baseline/core';
import { createStoredValue, newId } from '@/lib/externalStore';

/** Everything you've logged, and the foods you've saved to log again. */

function reviveList<T>(saved: unknown): T[] {
  return Array.isArray(saved) ? (saved as T[]) : [];
}

const entriesStore = createStoredValue<FoodEntry[]>('foodEntries', [], reviveList<FoodEntry>);
const savedStore = createStoredValue<SavedFood[]>('savedFoods', [], reviveList<SavedFood>);

export interface FoodState {
  loading: boolean;
  entries: FoodEntry[];
  saved: SavedFood[];
}

export function useFood(): FoodState {
  const entries = entriesStore.subscribeHook();
  const saved = savedStore.subscribeHook();
  return { loading: entries.loading || saved.loading, entries: entries.value, saved: saved.value };
}

/** Today's entries, so the Food screen and Today agree on what counts. */
export function useEntriesForToday(): FoodEntry[] {
  const { entries } = useFood();
  return entriesForDate(entries, localIsoDate(new Date()));
}

export function addEntries(added: readonly FoodEntry[]): Promise<void> {
  return entriesStore.set([...entriesStore.get(), ...added]);
}

export function addEntry(entry: FoodEntry): Promise<void> {
  return addEntries([entry]);
}

export function removeEntry(id: string): Promise<void> {
  return entriesStore.set(entriesStore.get().filter((e) => e.id !== id));
}

export function saveFood(food: Omit<SavedFood, 'id'>): Promise<void> {
  const existing = savedStore.get();
  // Saving the same thing twice just updates it.
  const match = existing.find((f) => f.name.toLowerCase() === food.name.toLowerCase());
  const next: SavedFood = { ...food, id: match?.id ?? newId() };
  return savedStore.set(match ? existing.map((f) => (f.id === match.id ? next : f)) : [...existing, next]);
}

export function removeSavedFood(id: string): Promise<void> {
  return savedStore.set(savedStore.get().filter((f) => f.id !== id));
}

export { newId };
