import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COOKIE_CONSENT_STORAGE_KEY } from './cookieConsent';
import { renameLegacyKey } from './legacyStorageKeys';
import {
  migrateLegacyKeyValueStore,
  migrateLegacyWebStorage,
  resolveWebStorageConflict,
  type KeyValueStore,
} from './legacyStorageMigration';
import { SKETCH_STORAGE_PREFIX } from '@/features/facility-map/sketch/persistence/storage';

// Spelled as character codes for the same reason as in legacyStorageKeys.ts.
const LEGACY = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

const QUEUE_KEY = 'znteqr_offline_queue_u1_o1';
const LEGACY_QUEUE_KEY = `${LEGACY}_offline_queue_u1_o1`;
const LEGACY_CONSENT_KEY = `${LEGACY}:cookie-consent`;

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();

  /** `quota` caps the summed length of keys and values, like a browser's per-origin limit. */
  constructor(private readonly quota = Number.POSITIVE_INFINITY) {}

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
    const previous = this.entries.get(key);
    const used = this.usedBytes() - (previous === undefined ? 0 : key.length + previous.length);
    if (used + key.length + value.length > this.quota) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    this.entries.set(key, value);
  }
  snapshot(): Record<string, string> {
    return Object.fromEntries(this.entries);
  }
  private usedBytes(): number {
    let total = 0;
    for (const [key, value] of this.entries) total += key.length + value.length;
    return total;
  }
}

function memoryKeyValueStore(
  initial: Record<string, unknown>,
  extraKeys: Array<[IDBValidKey, unknown]> = [],
): KeyValueStore & {
  snapshot: () => Record<string, unknown>;
  entries: Map<IDBValidKey, unknown>;
} {
  const entries = new Map<IDBValidKey, unknown>([...Object.entries(initial), ...extraKeys]);
  return {
    entries,
    keys: async () => [...entries.keys()],
    get: async (key) => entries.get(key),
    set: async (key, value) => {
      entries.set(key, value);
    },
    del: async (key) => {
      entries.delete(key);
    },
    snapshot: () =>
      Object.fromEntries(
        [...entries.entries()]
          .filter(([key]) => typeof key === 'string')
          .map(([key, value]) => [String(key), value]),
      ),
  };
}

function queueItem(id: string, timestamp: number, extra: Record<string, unknown> = {}) {
  return { id, type: 'work_order_create', status: 'pending', timestamp, ...extra };
}

function photoRecord(createdAt: number, fileName = 'photo.jpg') {
  return {
    blob: new Blob(['jpeg-bytes'], { type: 'image/jpeg' }),
    fileName,
    mimeType: 'image/jpeg',
    sizeBytes: 10,
    createdAt,
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
    storage.setItem(LEGACY_CONSENT_KEY, 'accepted');
    storage.setItem(LEGACY_QUEUE_KEY, '[{"id":"q1"}]');
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

  describe('offline queue written under both keys', () => {
    it('keeps a work order an older tab queued after the first move (current key holds "[]")', () => {
      // The first move left "[]" under the current key once the queue synced;
      // a tab still running the earlier release then queued a work order with a photo.
      const queued = queueItem('wo-offline', 2_000, {
        payload: { title: 'Pump leak', imageRefs: [{ blobKey: 'ref-1' }] },
      });
      const storage = new MemoryStorage();
      storage.setItem(QUEUE_KEY, '[]');
      storage.setItem(LEGACY_QUEUE_KEY, JSON.stringify([queued]));

      expect(migrateLegacyWebStorage(storage)).toBe(1);
      expect(storage.getItem(LEGACY_QUEUE_KEY)).toBeNull();
      expect(JSON.parse(storage.getItem(QUEUE_KEY) ?? 'null')).toEqual([queued]);
    });

    it('merges both queues by id, keeps the current copy on a clash and stays oldest first', () => {
      const storage = new MemoryStorage();
      storage.setItem(
        QUEUE_KEY,
        JSON.stringify([
          queueItem('a', 1_000),
          queueItem('shared', 3_000, { status: 'processing', retryCount: 2 }),
          queueItem('c', 5_000),
        ]),
      );
      storage.setItem(
        LEGACY_QUEUE_KEY,
        JSON.stringify([
          queueItem('early', 500),
          queueItem('shared', 3_000, { status: 'pending', retryCount: 0 }),
          queueItem('middle', 4_000),
          queueItem('late', 9_000),
        ]),
      );

      expect(migrateLegacyWebStorage(storage)).toBe(1);
      const merged = JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]') as Array<Record<string, unknown>>;
      expect(merged.map((item) => item.id)).toEqual(['early', 'a', 'shared', 'middle', 'c', 'late']);
      expect(merged.find((item) => item.id === 'shared')).toMatchObject({
        status: 'processing',
        retryCount: 2,
      });
      expect(storage.getItem(LEGACY_QUEUE_KEY)).toBeNull();
    });

    it('does not reorder the current queue when only the legacy queue adds items', () => {
      const storage = new MemoryStorage();
      // updatePayload() bumps a timestamp without moving the item.
      const current = [queueItem('first', 7_000), queueItem('second', 2_000)];
      storage.setItem(QUEUE_KEY, JSON.stringify(current));
      storage.setItem(LEGACY_QUEUE_KEY, JSON.stringify([queueItem('legacy', 8_000)]));

      migrateLegacyWebStorage(storage);
      const ids = (JSON.parse(storage.getItem(QUEUE_KEY) ?? '[]') as Array<{ id: string }>).map(
        (item) => item.id,
      );
      expect(ids).toEqual(['first', 'second', 'legacy']);
    });

    it('drops the legacy key when it adds nothing, and keeps it readable when the current key is not', () => {
      const same = new MemoryStorage();
      same.setItem(QUEUE_KEY, JSON.stringify([queueItem('a', 1)]));
      same.setItem(LEGACY_QUEUE_KEY, '[]');
      expect(migrateLegacyWebStorage(same)).toBe(0);
      expect(same.snapshot()).toEqual({ [QUEUE_KEY]: JSON.stringify([queueItem('a', 1)]) });

      const corrupt = new MemoryStorage();
      corrupt.setItem(QUEUE_KEY, 'not json');
      corrupt.setItem(LEGACY_QUEUE_KEY, JSON.stringify([queueItem('a', 1)]));
      expect(migrateLegacyWebStorage(corrupt)).toBe(1);
      expect(corrupt.snapshot()).toEqual({ [QUEUE_KEY]: JSON.stringify([queueItem('a', 1)]) });
    });
  });

  describe('cookie consent written under both keys', () => {
    it('applies a Reject recorded by an older tab over an earlier Accept and clears optional preferences', () => {
      const storage = new MemoryStorage();
      storage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
      storage.setItem('znteqr:equipment-view-mode', 'table');
      storage.setItem('znteqr_current_organization', 'org-1');
      storage.setItem(LEGACY_CONSENT_KEY, 'rejected');

      expect(migrateLegacyWebStorage(storage)).toBe(1);
      expect(storage.snapshot()).toEqual({
        [COOKIE_CONSENT_STORAGE_KEY]: 'rejected',
        // Strictly necessary storage survives a Reject.
        znteqr_current_organization: 'org-1',
      });
    });

    it('keeps a current Reject over a legacy Accept', () => {
      const storage = new MemoryStorage();
      storage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'rejected');
      storage.setItem(LEGACY_CONSENT_KEY, 'accepted');

      expect(migrateLegacyWebStorage(storage)).toBe(0);
      expect(storage.snapshot()).toEqual({ [COOKIE_CONSENT_STORAGE_KEY]: 'rejected' });
    });

    it('uses the legacy decision only when the current value is not a decision', () => {
      expect(resolveWebStorageConflict(COOKIE_CONSENT_STORAGE_KEY, 'accepted', 'accepted')).toBe('accepted');
      expect(resolveWebStorageConflict(COOKIE_CONSENT_STORAGE_KEY, 'garbage', 'accepted')).toBe('accepted');
      expect(resolveWebStorageConflict(COOKIE_CONSENT_STORAGE_KEY, 'accepted', 'garbage')).toBe('accepted');
    });
  });

  describe('other user work written under both keys', () => {
    it('keeps a pending terms-acceptance marker', () => {
      const key = 'znteqr_pending_terms_acceptance:user-1';
      expect(resolveWebStorageConflict(key, '', '1')).toBe('1');
      expect(resolveWebStorageConflict(key, '1', '')).toBe('1');

      const storage = new MemoryStorage();
      storage.setItem(key, '1');
      storage.setItem(`${LEGACY}_pending_terms_acceptance:user-1`, '1');
      migrateLegacyWebStorage(storage);
      expect(storage.snapshot()).toEqual({ [key]: '1' });
    });

    it('keeps the sketch document edited last', () => {
      const key = `${SKETCH_STORAGE_PREFIX}plan-1`;
      expect(key.startsWith('znteqr:facility-sketch:v1:')).toBe(true);
      const older = JSON.stringify({ schemaVersion: 1, id: 'doc', updatedAt: 1_000 });
      const newer = JSON.stringify({ schemaVersion: 1, id: 'doc', updatedAt: 2_000 });

      expect(resolveWebStorageConflict(key, older, newer)).toBe(newer);
      expect(resolveWebStorageConflict(key, newer, older)).toBe(newer);
      expect(resolveWebStorageConflict(key, 'not json', older)).toBe(older);
    });

    it('merges the floor-plan library and its history', () => {
      const plans = 'znteqr:facility-floor-plan:dryrun:plans:v1';
      expect(
        JSON.parse(
          resolveWebStorageConflict(
            plans,
            JSON.stringify({ 'A::1': { name: 'current A' } }),
            JSON.stringify({ 'A::1': { name: 'legacy A' }, 'B::2': { name: 'legacy B' } }),
          ),
        ),
      ).toEqual({ 'A::1': { name: 'current A' }, 'B::2': { name: 'legacy B' } });

      const history = 'znteqr:facility-floor-plan:dryrun:history:v1';
      const merged = JSON.parse(
        resolveWebStorageConflict(
          history,
          JSON.stringify([{ id: 'h3', timestamp: 3 }, { id: 'h1', timestamp: 1 }]),
          JSON.stringify([{ id: 'h4', timestamp: 4 }, { id: 'h2', timestamp: 2 }, { id: 'h1', timestamp: 1 }]),
        ),
      ) as Array<{ id: string }>;
      expect(merged.map((entry) => entry.id)).toEqual(['h4', 'h3', 'h2', 'h1']);
    });

    it('keeps the current value of any other key', () => {
      expect(resolveWebStorageConflict('znteqr-user-settings', '{"a":1}', '{"b":2}')).toBe('{"a":1}');
      expect(resolveWebStorageConflict('znteqr:facility-floor-plan:dryrun:v3', 'current', 'legacy')).toBe(
        'current',
      );
    });
  });

  describe('quota', () => {
    it('frees the legacy entry first when there is no room for two copies', () => {
      const big = JSON.stringify([queueItem('big', 1, { payload: 'x'.repeat(600) })]);
      const storage = new MemoryStorage(1_000);
      storage.setItem(LEGACY_QUEUE_KEY, big);
      storage.setItem(`${LEGACY}:equipment-view-mode`, 'grid');

      expect(migrateLegacyWebStorage(storage)).toBe(2);
      expect(storage.snapshot()).toEqual({
        [QUEUE_KEY]: big,
        'znteqr:equipment-view-mode': 'grid',
      });
    });

    it('puts the legacy entry back when even the freed room is not enough, and moves the other keys', () => {
      const legacyQueue = JSON.stringify([queueItem('legacy', 2)]);
      const currentQueue = JSON.stringify([queueItem('current', 1)]);
      const storage = new MemoryStorage();
      storage.setItem(QUEUE_KEY, currentQueue);
      storage.setItem(LEGACY_QUEUE_KEY, legacyQueue);
      storage.setItem(`${LEGACY}:equipment-view-mode`, 'grid');
      // Another tab fills the room as soon as it is freed: every write of the merged queue fails.
      const setItem = storage.setItem.bind(storage);
      const writes = vi.spyOn(storage, 'setItem').mockImplementation((key: string, value: string) => {
        if (key === QUEUE_KEY) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        setItem(key, value);
      });

      expect(migrateLegacyWebStorage(storage)).toBe(1);
      expect(writes).toHaveBeenCalledWith(LEGACY_QUEUE_KEY, legacyQueue);
      expect(storage.snapshot()).toEqual({
        [QUEUE_KEY]: currentQueue,
        [LEGACY_QUEUE_KEY]: legacyQueue,
        'znteqr:equipment-view-mode': 'grid',
      });
    });

    it('leaves both keys alone when a write fails for another reason than the quota', () => {
      const storage = new MemoryStorage();
      storage.setItem(LEGACY_QUEUE_KEY, '[{"id":"q1"}]');
      vi.spyOn(storage, 'setItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      const removals = vi.spyOn(storage, 'removeItem');

      expect(migrateLegacyWebStorage(storage)).toBe(0);
      expect(removals).not.toHaveBeenCalled();
      expect(storage.snapshot()).toEqual({ [LEGACY_QUEUE_KEY]: '[{"id":"q1"}]' });
    });

    it('keeps going when one entry throws', () => {
      const storage = new MemoryStorage();
      storage.setItem(`${LEGACY}:broken`, 'x');
      storage.setItem(`${LEGACY}:fine`, 'y');
      const getItem = storage.getItem.bind(storage);
      vi.spyOn(storage, 'getItem').mockImplementation((key: string) => {
        if (key === `${LEGACY}:broken`) throw new Error('unreadable');
        return getItem(key);
      });

      expect(migrateLegacyWebStorage(storage)).toBe(1);
      expect(storage.snapshot()).toEqual({ [`${LEGACY}:broken`]: 'x', 'znteqr:fine': 'y' });
    });
  });
});

describe('migrateLegacyKeyValueStore', () => {
  it('moves offline blobs, deletes the persisted query cache and skips non-string keys', async () => {
    const blob = photoRecord(1);
    const numericKey = 42;
    const arrayKey = [`${LEGACY}-offline-blob:u1:o1:ref9`];
    const store = memoryKeyValueStore(
      {
        [`${LEGACY}-offline-blob:u1:o1:ref1`]: blob,
        [`${LEGACY}:tq:u1:o1-["equipment"]`]: '{"buster":"3.44.4"}',
        [`${LEGACY}:tq:noscope-["teams"]`]: '{"buster":"3.44.4"}',
        other: 1,
      },
      [
        [numericKey, 'number key'],
        [arrayKey, 'array key'],
      ],
    );
    const get = vi.spyOn(store, 'get');

    expect(await migrateLegacyKeyValueStore(store)).toBe(1);
    expect(store.snapshot()).toEqual({
      'znteqr-offline-blob:u1:o1:ref1': blob,
      other: 1,
    });
    // The query cache is deleted without being read or copied.
    expect(get).not.toHaveBeenCalledWith(expect.stringContaining(':tq:'));
    // Non-string keys are neither read nor removed.
    expect(store.entries.get(numericKey)).toBe('number key');
    expect(store.entries.get(arrayKey)).toBe('array key');
    expect(get).not.toHaveBeenCalledWith(numericKey);
    expect(get).not.toHaveBeenCalledWith(arrayKey);
  });

  it('does not overwrite an entry that already exists under the current prefix', async () => {
    const store = memoryKeyValueStore({
      [`${LEGACY}-draft:1`]: 'old',
      'znteqr-draft:1': 'new',
      [`${LEGACY}:tq:noscope`]: 'old',
      'znteqr:tq:noscope': 'new',
    });

    expect(await migrateLegacyKeyValueStore(store)).toBe(0);
    expect(store.snapshot()).toEqual({ 'znteqr-draft:1': 'new', 'znteqr:tq:noscope': 'new' });
  });

  describe('offline photo blob under both keys', () => {
    const legacyKey = `${LEGACY}-offline-blob:u1:o1:ref1`;
    const currentKey = 'znteqr-offline-blob:u1:o1:ref1';

    it('drops the legacy copy of the same photo', async () => {
      const current = photoRecord(5);
      const store = memoryKeyValueStore({ [currentKey]: current, [legacyKey]: photoRecord(5) });

      expect(await migrateLegacyKeyValueStore(store)).toBe(0);
      expect(store.snapshot()).toEqual({ [currentKey]: current });
    });

    it('keeps both when the records describe different photos', async () => {
      const current = photoRecord(5, 'a.jpg');
      const legacy = photoRecord(6, 'b.jpg');
      const store = memoryKeyValueStore({ [currentKey]: current, [legacyKey]: legacy });

      expect(await migrateLegacyKeyValueStore(store)).toBe(0);
      expect(store.snapshot()).toEqual({ [currentKey]: current, [legacyKey]: legacy });
    });

    it('replaces a current record that holds no photo', async () => {
      const legacy = photoRecord(5);
      const store = memoryKeyValueStore({ [currentKey]: { fileName: 'photo.jpg' }, [legacyKey]: legacy });

      expect(await migrateLegacyKeyValueStore(store)).toBe(1);
      expect(store.snapshot()).toEqual({ [currentKey]: legacy });
    });
  });

  it('leaves an entry that cannot be copied under its legacy key and moves the others', async () => {
    const store = memoryKeyValueStore({
      [`${LEGACY}-offline-blob:u1:o1:full`]: photoRecord(1),
      [`${LEGACY}-offline-blob:u1:o1:fits`]: photoRecord(2),
    });
    const set = store.set;
    store.set = async (key, value) => {
      if (key === 'znteqr-offline-blob:u1:o1:full') {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      await set(key, value);
    };

    expect(await migrateLegacyKeyValueStore(store)).toBe(1);
    expect(Object.keys(store.snapshot()).sort()).toEqual([
      `${LEGACY}-offline-blob:u1:o1:full`,
      'znteqr-offline-blob:u1:o1:fits',
    ]);
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

describe('runLegacyStorageMigration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock('idb-keyval');
    vi.resetModules();
  });

  async function loadModule() {
    vi.resetModules();
    return import('./legacyStorageMigration');
  }

  function mockIdbKeyval(initial: Record<string, unknown>) {
    const store = memoryKeyValueStore(initial);
    const keys = vi.fn(store.keys);
    vi.doMock('idb-keyval', () => ({ keys, get: store.get, set: store.set, del: store.del }));
    return { store, keys };
  }

  it('does nothing without a window', async () => {
    expect(typeof window).toBe('undefined');
    const { keys } = mockIdbKeyval({ [`${LEGACY}-offline-blob:u1:o1:ref1`]: photoRecord(1) });
    const migration = await loadModule();

    expect(() => migration.runLegacyStorageMigration()).not.toThrow();
    await migration.whenLegacyStorageMigrated();
    expect(keys).not.toHaveBeenCalled();
  });

  it('moves both Web Storage areas synchronously, then IndexedDB, once per page load', async () => {
    const local = new MemoryStorage();
    const session = new MemoryStorage();
    local.setItem(LEGACY_QUEUE_KEY, '[]');
    session.setItem(`${LEGACY}_pending_scan_feedback`, '{"ts":1}');
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session });
    vi.stubGlobal('indexedDB', {});
    const { store, keys } = mockIdbKeyval({ [`${LEGACY}-offline-blob:u1:o1:ref1`]: 'photo' });
    const migration = await loadModule();

    migration.runLegacyStorageMigration();
    expect(local.snapshot()).toEqual({ [QUEUE_KEY]: '[]' });
    expect(session.snapshot()).toEqual({ znteqr_pending_scan_feedback: '{"ts":1}' });

    await migration.whenLegacyStorageMigrated();
    expect(store.snapshot()).toEqual({ 'znteqr-offline-blob:u1:o1:ref1': 'photo' });

    // A second call in the same page load is a no-op.
    local.setItem(`${LEGACY}:equipment-view-mode`, 'grid');
    migration.runLegacyStorageMigration();
    await migration.whenLegacyStorageMigrated();
    expect(local.getItem(`${LEGACY}:equipment-view-mode`)).toBe('grid');
    expect(keys).toHaveBeenCalledTimes(1);
  });

  it('still migrates sessionStorage when localStorage access is denied', async () => {
    const session = new MemoryStorage();
    session.setItem(`${LEGACY}:chunk-reload:abc`, '1');
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
      sessionStorage: session,
    });
    const migration = await loadModule();

    expect(() => migration.runLegacyStorageMigration()).not.toThrow();
    expect(session.snapshot()).toEqual({ 'znteqr:chunk-reload:abc': '1' });
  });

  it('skips IndexedDB when it is not available', async () => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() });
    const { keys } = mockIdbKeyval({});
    const migration = await loadModule();

    migration.runLegacyStorageMigration();
    await migration.whenLegacyStorageMigrated();
    expect(keys).not.toHaveBeenCalled();
  });

  it('settles even when idb-keyval cannot be loaded', async () => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() });
    vi.stubGlobal('indexedDB', {});
    vi.doMock('idb-keyval', () => {
      throw new Error('chunk failed to load');
    });
    const migration = await loadModule();

    migration.runLegacyStorageMigration();
    await expect(migration.whenLegacyStorageMigrated()).resolves.toBeUndefined();
  });
});

describe('boot order', () => {
  it('main.tsx imports the migration before anything else', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'main.tsx'), 'utf8');
    const firstImport = source.match(/^\s*import\s[^;]*;/m)?.[0].trim();
    expect(firstImport).toBe("import '@/lib/legacyStorageMigration.boot';");
  });

  it('the boot entry runs the migration', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'lib', 'legacyStorageMigration.boot.ts'), 'utf8');
    expect(source).toMatch(/^runLegacyStorageMigration\(\);$/m);
  });
});
