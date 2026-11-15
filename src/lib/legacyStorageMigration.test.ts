import { describe, expect, it } from 'vitest';
import {
  migrateLegacyKeyValueStore,
  migrateLegacyWebStorage,
  renameLegacyKey,
  type KeyValueStore,
} from './legacyStorageMigration';

// Spelled as character codes for the same reason as in the module under test.
const LEGACY = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }
  clear(): void {
    this.entries.clear();
  }
  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.entries.delete(key);
  }
  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }
}

function memoryKeyValueStore(initial: Record<string, unknown>): KeyValueStore & {
  snapshot: () => Record<string, unknown>;
} {
  const entries = new Map<IDBValidKey, unknown>(Object.entries(initial));
  return {
    keys: async () => [...entries.keys()],
    get: async (key) => entries.get(key),
    set: async (key, value) => {
      entries.set(key, value);
    },
    del: async (key) => {
      entries.delete(key);
    },
    snapshot: () => Object.fromEntries([...entries.entries()].map(([key, value]) => [String(key), value])),
  };
}

describe('renameLegacyKey', () => {
  it('renames keys for every separator the app used', () => {
    expect(renameLegacyKey(`${LEGACY}:cookie-consent`)).toBe('znteqr:cookie-consent');
    expect(renameLegacyKey(`${LEGACY}_offline_queue_u1_o1`)).toBe('znteqr_offline_queue_u1_o1');
    expect(renameLegacyKey(`${LEGACY}-user-settings`)).toBe('znteqr-user-settings');
    expect(renameLegacyKey(`${LEGACY}.flag`)).toBe('znteqr.flag');
  });

  it('leaves other keys alone', () => {
    expect(renameLegacyKey('znteqr:cookie-consent')).toBeNull();
    expect(renameLegacyKey('sb-project-auth-token')).toBeNull();
    expect(renameLegacyKey(LEGACY)).toBeNull();
    expect(renameLegacyKey(`${LEGACY}extra`)).toBeNull();
    expect(renameLegacyKey(`x${LEGACY}:thing`)).toBeNull();
  });
});

describe('migrateLegacyWebStorage', () => {
  it('moves legacy entries to the current prefix and removes the old keys', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${LEGACY}:cookie-consent`, 'accepted');
    storage.setItem(`${LEGACY}_offline_queue_u1_o1`, '[{"id":"q1"}]');
    storage.setItem('unrelated', 'keep');

    expect(migrateLegacyWebStorage(storage)).toBe(2);
    expect(storage.snapshot()).toEqual({
      'znteqr:cookie-consent': 'accepted',
      'znteqr_offline_queue_u1_o1': '[{"id":"q1"}]',
      unrelated: 'keep',
    });
  });

  it('keeps a value already stored under the current prefix', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${LEGACY}:equipment-view-mode`, 'table');
    storage.setItem('znteqr:equipment-view-mode', 'grid');

    expect(migrateLegacyWebStorage(storage)).toBe(0);
    expect(storage.snapshot()).toEqual({ 'znteqr:equipment-view-mode': 'grid' });
  });

  it('is idempotent and tolerates a missing or failing storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(`${LEGACY}-user-settings`, '{}');
    migrateLegacyWebStorage(storage);
    expect(migrateLegacyWebStorage(storage)).toBe(0);

    expect(migrateLegacyWebStorage(undefined)).toBe(0);
    const failing = {
      get length(): number {
        throw new Error('denied');
      },
    } as unknown as Storage;
    expect(migrateLegacyWebStorage(failing)).toBe(0);
  });
});

describe('migrateLegacyKeyValueStore', () => {
  it('moves offline blobs and cache entries, skipping non-string keys', async () => {
    const blob = { fileName: 'photo.jpg' };
    const store = memoryKeyValueStore({
      [`${LEGACY}-offline-blob:u1:o1:ref1`]: blob,
      [`${LEGACY}:tq:u1:o1`]: { cached: true },
      other: 1,
    });

    expect(await migrateLegacyKeyValueStore(store)).toBe(2);
    expect(store.snapshot()).toEqual({
      'znteqr-offline-blob:u1:o1:ref1': blob,
      'znteqr:tq:u1:o1': { cached: true },
      other: 1,
    });
  });

  it('does not overwrite an entry that already exists under the current prefix', async () => {
    const store = memoryKeyValueStore({
      [`${LEGACY}:tq:noscope`]: 'old',
      'znteqr:tq:noscope': 'new',
    });

    expect(await migrateLegacyKeyValueStore(store)).toBe(0);
    expect(store.snapshot()).toEqual({ 'znteqr:tq:noscope': 'new' });
  });

  it('resolves to 0 when the store is unavailable', async () => {
    const failing: KeyValueStore = {
      keys: () => Promise.reject(new Error('blocked')),
      get: async () => undefined,
      set: async () => undefined,
      del: async () => undefined,
    };
    expect(await migrateLegacyKeyValueStore(failing)).toBe(0);
  });
});
