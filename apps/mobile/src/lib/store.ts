import { Platform } from 'react-native';

/**
 * The app's local save file: one small JSON document holding settings, food
 * entries and saved foods.
 *
 * Why a file and not a database? A year of food is roughly 1,800 rows, which
 * is nothing to read in one go. expo-file-system is already a dependency, so
 * this adds no native code and ships over the air. If this ever gets slow,
 * only this file changes — everything else talks to `store`.
 *
 * On the web preview it uses localStorage instead, so `npm run web` works on
 * Windows.
 */

const FILE_NAME = 'baseline-store.json';
const WEB_KEY = 'baseline-store';

/** Bump when the saved shape changes in a way old data can't satisfy. */
export const STORE_VERSION = 1;

interface Document {
  version: number;
  values: Record<string, unknown>;
}

function emptyDocument(): Document {
  return { version: STORE_VERSION, values: {} };
}

/* ------------------------------------------------------------------ */
/* Platform back ends                                                  */
/* ------------------------------------------------------------------ */

function readRaw(): string | null {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(WEB_KEY) ?? null;
  }
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const file = new File(Paths.document, FILE_NAME);
  return file.exists ? file.textSync() : null;
}

function writeRaw(text: string): void {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(WEB_KEY, text);
    return;
  }
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const file = new File(Paths.document, FILE_NAME);
  if (!file.exists) file.create({ intermediates: true });
  file.writeSync(text);
}

/* ------------------------------------------------------------------ */
/* The store                                                           */
/* ------------------------------------------------------------------ */

let cache: Document | null = null;
/** Writes run one after another, so two quick saves can't interleave. */
let writing: Promise<void> = Promise.resolve();

function load(): Document {
  if (cache) return cache;
  try {
    const raw = readRaw();
    if (raw === null) {
      cache = emptyDocument();
      return cache;
    }
    const parsed = JSON.parse(raw) as Partial<Document>;
    // An unreadable or future version starts clean rather than crashing.
    if (typeof parsed !== 'object' || parsed === null || parsed.version !== STORE_VERSION) {
      cache = emptyDocument();
      return cache;
    }
    cache = { version: STORE_VERSION, values: parsed.values ?? {} };
    return cache;
  } catch {
    // Private browsing, cleared data, a half-written file: carry on empty.
    cache = emptyDocument();
    return cache;
  }
}

function flush(doc: Document): Promise<void> {
  writing = writing.then(async () => {
    try {
      writeRaw(JSON.stringify(doc));
    } catch {
      // Saving failed (full disk, blocked storage). The value stays in memory
      // for this session; there is nothing useful to show the user here.
    }
  });
  return writing;
}

export const store = {
  /** The saved value for `key`, or `fallback` when there isn't one. */
  async get<T>(key: string, fallback: T): Promise<T> {
    const value = load().values[key];
    return value === undefined ? fallback : (value as T);
  },

  async set<T>(key: string, value: T): Promise<void> {
    const doc = load();
    doc.values[key] = value;
    await flush(doc);
  },

  async remove(key: string): Promise<void> {
    const doc = load();
    delete doc.values[key];
    await flush(doc);
  },

  /** Testing and "delete my data": forget everything. */
  async clear(): Promise<void> {
    cache = emptyDocument();
    await flush(cache);
  },
};
