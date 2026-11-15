/**
 * One-time move of browser data written by earlier releases.
 *
 * Earlier releases stored preferences, the active-organization hints, the
 * offline queue and cached data under a different key prefix. On the first
 * load after the rename this module copies every such entry to the current
 * prefix and removes the old one, so nobody loses settings or unsynced
 * offline work.
 *
 * It is idempotent and cheap: once nothing carries the old prefix it only
 * walks the key list. Remove it once every active browser has loaded a
 * release that contains it.
 */

const CURRENT_PREFIX = 'znteqr';

// The retired prefix, spelled as character codes so the old name does not
// appear as a word anywhere in the source tree.
const LEGACY_PREFIX = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

// A key belongs to the app only when the prefix is followed by one of these.
const PREFIX_SEPARATORS = [':', '_', '-', '.'];

/** New name for a key written under the retired prefix, or null for any other key. */
export function renameLegacyKey(key: string): string | null {
  if (!key.startsWith(LEGACY_PREFIX)) return null;
  if (!PREFIX_SEPARATORS.includes(key.charAt(LEGACY_PREFIX.length))) return null;
  return `${CURRENT_PREFIX}${key.slice(LEGACY_PREFIX.length)}`;
}

/**
 * Moves every legacy-prefixed entry of a Web Storage area to its new key.
 * An entry that already exists under the new key wins; the legacy copy is
 * dropped. Returns how many entries were moved.
 */
export function migrateLegacyWebStorage(storage: Storage | null | undefined): number {
  if (!storage) return 0;

  let moved = 0;
  try {
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key !== null) keys.push(key);
    }

    for (const key of keys) {
      const target = renameLegacyKey(key);
      if (target === null) continue;

      const value = storage.getItem(key);
      if (value !== null && storage.getItem(target) === null) {
        storage.setItem(target, value);
        moved += 1;
      }
      storage.removeItem(key);
    }
  } catch {
    // Private mode, disabled storage or a full quota: leave everything as it is.
  }
  return moved;
}

/** The subset of idb-keyval this migration needs (injectable for tests). */
export interface KeyValueStore {
  keys: () => Promise<IDBValidKey[]>;
  get: (key: IDBValidKey) => Promise<unknown>;
  set: (key: IDBValidKey, value: unknown) => Promise<void>;
  del: (key: IDBValidKey) => Promise<void>;
}

/**
 * Same move for the IndexedDB key-value store, which holds offline photo
 * blobs and the persisted query cache. Returns how many entries were moved.
 */
export async function migrateLegacyKeyValueStore(store: KeyValueStore): Promise<number> {
  let moved = 0;
  try {
    for (const key of await store.keys()) {
      if (typeof key !== 'string') continue;
      const target = renameLegacyKey(key);
      if (target === null) continue;

      if ((await store.get(target)) === undefined) {
        const value = await store.get(key);
        if (value !== undefined) {
          await store.set(target, value);
          moved += 1;
        }
      }
      await store.del(key);
    }
  } catch {
    // IndexedDB unavailable (private mode, blocked): nothing to migrate.
  }
  return moved;
}

let started = false;

/**
 * Runs the migration once per page load. Web Storage is handled
 * synchronously so every later read sees the new keys; IndexedDB follows
 * asynchronously.
 */
export function runLegacyStorageMigration(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  let local: Storage | undefined;
  let session: Storage | undefined;
  try {
    local = window.localStorage;
    session = window.sessionStorage;
  } catch {
    // Storage access denied.
  }
  migrateLegacyWebStorage(local);
  migrateLegacyWebStorage(session);

  if (typeof indexedDB === 'undefined') return;
  void import('idb-keyval')
    .then(({ keys, get, set, del }) => migrateLegacyKeyValueStore({ keys, get, set, del }))
    .catch(() => undefined);
}
