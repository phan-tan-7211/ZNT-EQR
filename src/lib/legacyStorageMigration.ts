/**
 * One-time move of browser data written by earlier releases.
 *
 * Earlier releases stored preferences, the active-organization hints, the
 * offline queue and cached data under a different key prefix. On the first
 * load after the rename this module copies every such entry to the current
 * prefix and removes the old one, so nobody loses settings or unsynced
 * offline work.
 *
 * A legacy entry can also appear after the first move: a tab still running
 * an earlier release keeps writing the old keys, and so does a rollback. When
 * both keys exist, preferences keep the current value, but entries that hold
 * user work are merged (see `WEB_STORAGE_CONFLICT_RULES`) so nothing queued
 * or drawn in the older tab is lost, and the stricter cookie decision wins.
 *
 * It is idempotent and cheap: once nothing carries the old prefix it only
 * walks the key list. Remove it once every active browser has loaded a
 * release that contains it.
 */

import {
  COOKIE_CONSENT_STORAGE_KEY,
  clearOptionalPreferenceStorage,
  isCookieConsentDecision,
} from './cookieConsent';
import { CURRENT_STORAGE_PREFIX, LEGACY_STORAGE_PREFIX, renameLegacyKey } from './legacyStorageKeys';

// ── Conflict rules for Web Storage ───────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function numericField(value: unknown, field: string): number | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = Number(value[field]);
  return Number.isFinite(candidate) ? candidate : undefined;
}

/** Identity of a stored list item: its string id, or its JSON when it has none. */
function itemIdentity(item: unknown): string {
  if (isRecord(item) && typeof item.id === 'string') return `id:${item.id}`;
  return `json:${JSON.stringify(item)}`;
}

type ListOrder = 'oldest-first' | 'newest-first';

/**
 * Merges two JSON arrays of `{ id, timestamp }` items. Items present in both
 * keep the current copy. The legacy-only items are interleaved by timestamp
 * without reordering either list, so a FIFO queue stays FIFO.
 */
function mergeListsById(current: string, legacy: string, order: ListOrder): string {
  const legacyItems = parseJson(legacy);
  if (!Array.isArray(legacyItems) || legacyItems.length === 0) return current;
  const currentItems = parseJson(current);
  // The app cannot read a current value that is not a list, so the legacy one is the only usable copy.
  if (!Array.isArray(currentItems)) return legacy;

  const known = new Set(currentItems.map(itemIdentity));
  const added = legacyItems.filter((item) => !known.has(itemIdentity(item)));
  if (added.length === 0) return current;

  const missing = order === 'oldest-first' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const timestampOf = (item: unknown) => numericField(item, 'timestamp') ?? missing;
  const comesFirst = (candidate: unknown, other: unknown) =>
    order === 'oldest-first'
      ? timestampOf(candidate) < timestampOf(other)
      : timestampOf(candidate) > timestampOf(other);

  const merged: unknown[] = [];
  let currentIndex = 0;
  let addedIndex = 0;
  while (currentIndex < currentItems.length || addedIndex < added.length) {
    const takeAdded =
      currentIndex >= currentItems.length ||
      (addedIndex < added.length && comesFirst(added[addedIndex], currentItems[currentIndex]));
    if (takeAdded) {
      merged.push(added[addedIndex]);
      addedIndex += 1;
    } else {
      merged.push(currentItems[currentIndex]);
      currentIndex += 1;
    }
  }
  return JSON.stringify(merged);
}

/** Merges two JSON objects; a property present in both keeps the current value. */
function mergeRecordsByKey(current: string, legacy: string): string {
  const legacyRecord = parseJson(legacy);
  if (!isRecord(legacyRecord)) return current;
  const currentRecord = parseJson(current);
  if (!isRecord(currentRecord)) return legacy;

  const added = Object.keys(legacyRecord).filter(
    (key) => !Object.prototype.hasOwnProperty.call(currentRecord, key),
  );
  if (added.length === 0) return current;

  const merged: UnknownRecord = { ...currentRecord };
  for (const key of added) merged[key] = legacyRecord[key];
  return JSON.stringify(merged);
}

/** Keeps the copy of a JSON document with the later `updatedAt`. */
function preferLaterUpdate(current: string, legacy: string): string {
  const legacyDocument = parseJson(legacy);
  if (!isRecord(legacyDocument)) return current;
  const currentDocument = parseJson(current);
  if (!isRecord(currentDocument)) return legacy;

  const legacyUpdatedAt = numericField(legacyDocument, 'updatedAt') ?? 0;
  const currentUpdatedAt = numericField(currentDocument, 'updatedAt') ?? 0;
  return legacyUpdatedAt > currentUpdatedAt ? legacy : current;
}

/** A Reject recorded under either key wins over an Accept (see `CookieConsentContext`). */
function preferStricterConsent(current: string, legacy: string): string {
  if (current === 'rejected' || legacy === 'rejected') return 'rejected';
  if (isCookieConsentDecision(current) || !isCookieConsentDecision(legacy)) return current;
  return legacy;
}

/** `'1'` marks a terms acceptance that still has to reach the server. */
function preferPendingMarker(current: string, legacy: string): string {
  return legacy === '1' ? legacy : current;
}

interface ConflictRule {
  /** Matches the current (renamed) key. */
  matches: (key: string) => boolean;
  /** Value to keep when both the current and the legacy key hold one. */
  resolve: (current: string, legacy: string) => string;
}

const startsWith = (prefix: string) => (key: string) => key.startsWith(prefix);
const equals = (expected: string) => (key: string) => key === expected;

/**
 * Keys whose value is user work or a privacy decision. The key shapes mirror
 * their owners: `offlineQueueService.ts`, `cookieConsent.ts`,
 * `termsAcceptanceRecording.ts`, `facility-map/sketch/persistence/storage.ts`
 * and `facility-map/pages/FacilityFloorPlan.tsx`. Every other key is a
 * preference, hint or cache, and its current value wins.
 */
const WEB_STORAGE_CONFLICT_RULES: readonly ConflictRule[] = [
  {
    // Unsynced offline work orders, notes and equipment edits, oldest first.
    matches: startsWith(`${CURRENT_STORAGE_PREFIX}_offline_queue_`),
    resolve: (current, legacy) => mergeListsById(current, legacy, 'oldest-first'),
  },
  {
    matches: equals(COOKIE_CONSENT_STORAGE_KEY),
    resolve: preferStricterConsent,
  },
  {
    matches: startsWith(`${CURRENT_STORAGE_PREFIX}_pending_terms_acceptance:`),
    resolve: preferPendingMarker,
  },
  {
    // Local-only sketch documents.
    matches: startsWith(`${CURRENT_STORAGE_PREFIX}:facility-sketch:v1:`),
    resolve: preferLaterUpdate,
  },
  {
    // Local floor-plan library, keyed by building and floor.
    matches: equals(`${CURRENT_STORAGE_PREFIX}:facility-floor-plan:dryrun:plans:v1`),
    resolve: mergeRecordsByKey,
  },
  {
    // Floor-plan save history, newest first.
    matches: equals(`${CURRENT_STORAGE_PREFIX}:facility-floor-plan:dryrun:history:v1`),
    resolve: (current, legacy) => mergeListsById(current, legacy, 'newest-first'),
  },
];

/** Value to keep under `key` when the current and the legacy key both hold one. */
export function resolveWebStorageConflict(key: string, current: string, legacy: string): string {
  const rule = WEB_STORAGE_CONFLICT_RULES.find((candidate) => candidate.matches(key));
  return rule ? rule.resolve(current, legacy) : current;
}

// ── Web Storage move ─────────────────────────────────────────────────────────

function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('name' in error)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

/**
 * Writes `value` under `target` and removes `legacyKey`. When the write hits
 * the quota (the legacy copy still takes up the room it needs) the legacy
 * entry is freed first and the write retried; if that also fails the legacy
 * entry is put back, so the value is never lost. Any other failure leaves
 * both keys untouched.
 */
function writeAndRemoveLegacy(
  storage: Storage,
  legacyKey: string,
  legacyValue: string,
  target: string,
  value: string,
): boolean {
  try {
    storage.setItem(target, value);
  } catch (error) {
    if (!isQuotaError(error)) return false;
    storage.removeItem(legacyKey);
    try {
      storage.setItem(target, value);
    } catch {
      try {
        storage.setItem(legacyKey, legacyValue);
      } catch {
        // The room freed a moment ago is gone (another tab wrote meanwhile); nothing else to try.
      }
      return false;
    }
    return true;
  }
  storage.removeItem(legacyKey);
  return true;
}

function listKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key !== null) keys.push(key);
  }
  return keys;
}

/**
 * Moves every legacy-prefixed entry of a Web Storage area to its new key.
 * When the new key already holds a value, `resolveWebStorageConflict`
 * decides what to keep. Each entry is handled on its own: one that cannot be
 * moved stays under its legacy key for the next load. Returns how many
 * entries were written under the new prefix.
 */
export function migrateLegacyWebStorage(storage: Storage | null | undefined): number {
  if (!storage) return 0;

  let keys: string[];
  try {
    keys = listKeys(storage);
  } catch {
    // Private mode or disabled storage: nothing to migrate.
    return 0;
  }

  let moved = 0;
  let consentRevoked = false;
  for (const key of keys) {
    const target = renameLegacyKey(key);
    if (target === null) continue;

    try {
      const legacyValue = storage.getItem(key);
      if (legacyValue === null) continue;

      const current = storage.getItem(target);
      const value =
        current === null ? legacyValue : resolveWebStorageConflict(target, current, legacyValue);

      if (value === current) {
        storage.removeItem(key);
        continue;
      }
      if (writeAndRemoveLegacy(storage, key, legacyValue, target, value)) {
        moved += 1;
        if (target === COOKIE_CONSENT_STORAGE_KEY && value === 'rejected') consentRevoked = true;
      }
    } catch {
      // Leave this entry for the next load; the others are independent.
    }
  }

  // A Reject that reaches the current key clears optional preferences, exactly
  // as `applyCookieConsentDecision('rejected')` does, including any written
  // under the current prefix while the older Accept was in effect.
  if (consentRevoked) clearOptionalPreferenceStorage(storage);
  return moved;
}

// ── IndexedDB key-value store move ───────────────────────────────────────────

/** The subset of idb-keyval this migration needs (injectable for tests). */
export interface KeyValueStore {
  keys: () => Promise<IDBValidKey[]>;
  get: (key: IDBValidKey) => Promise<unknown>;
  set: (key: IDBValidKey, value: unknown) => Promise<void>;
  del: (key: IDBValidKey) => Promise<void>;
}

// Persisted TanStack query cache (`queryPersistence.ts`). Its `buster` is the
// app version, so a copy would be discarded on first read anyway.
const LEGACY_QUERY_CACHE_PREFIX = `${LEGACY_STORAGE_PREFIX}:tq:`;

// Offline photo blobs referenced by queued items (`offlineBlobStore.ts`).
const OFFLINE_BLOB_PREFIX = `${CURRENT_STORAGE_PREFIX}-offline-blob:`;

function hasPhoto(record: unknown): boolean {
  return isRecord(record) && Boolean(record.blob);
}

/** Two records under the same random blob id describe one photo when their metadata matches. */
function isSamePhoto(current: unknown, legacy: unknown): boolean {
  if (!isRecord(current) || !isRecord(legacy)) return false;
  return (['fileName', 'mimeType', 'sizeBytes', 'createdAt'] as const).every(
    (field) => current[field] === legacy[field],
  );
}

type KeyValueConflictOutcome = 'keep-current' | 'replace-current' | 'keep-both';

function resolveKeyValueConflict(key: string, current: unknown, legacy: unknown): KeyValueConflictOutcome {
  if (!key.startsWith(OFFLINE_BLOB_PREFIX)) return 'keep-current';
  if (!hasPhoto(legacy)) return 'keep-current';
  if (!hasPhoto(current)) return 'replace-current';
  // Never discard a photo that might be a different one: leave the legacy entry where it is.
  return isSamePhoto(current, legacy) ? 'keep-current' : 'keep-both';
}

/**
 * Same move for the IndexedDB key-value store. Offline photo blobs (and any
 * other entry) are copied; the persisted query cache is only deleted. A blob
 * is removed under its legacy key only once the current key holds the same
 * photo. Each entry is handled on its own. Returns how many entries were
 * copied.
 */
export async function migrateLegacyKeyValueStore(store: KeyValueStore): Promise<number> {
  let keys: IDBValidKey[];
  try {
    keys = await store.keys();
  } catch {
    // IndexedDB unavailable (private mode, blocked): nothing to migrate.
    return 0;
  }

  let moved = 0;
  for (const key of keys) {
    if (typeof key !== 'string') continue;
    const target = renameLegacyKey(key);
    if (target === null) continue;

    try {
      if (key.startsWith(LEGACY_QUERY_CACHE_PREFIX)) {
        await store.del(key);
        continue;
      }

      const legacyValue = await store.get(key);
      if (legacyValue === undefined) continue;

      const current = await store.get(target);
      const outcome =
        current === undefined ? 'replace-current' : resolveKeyValueConflict(target, current, legacyValue);
      if (outcome === 'keep-both') continue;
      if (outcome === 'replace-current') {
        await store.set(target, legacyValue);
        moved += 1;
      }
      await store.del(key);
    } catch {
      // A failed copy leaves the legacy entry in place for the next load.
    }
  }
  return moved;
}

// ── Boot ─────────────────────────────────────────────────────────────────────

let started = false;
let keyValueStoreMigration: Promise<void> = Promise.resolve();

/**
 * Resolves once the IndexedDB part of the migration has finished (at once
 * when it never started). Code that reads or deletes offline photo blobs
 * waits for it so a blob still under its legacy key is neither reported
 * missing nor left behind. Never rejects.
 */
export function whenLegacyStorageMigrated(): Promise<void> {
  return keyValueStoreMigration;
}

function readStorage(read: () => Storage): Storage | undefined {
  try {
    return read();
  } catch {
    // Storage access denied.
    return undefined;
  }
}

/**
 * Runs the migration once per page load. Web Storage is handled
 * synchronously so every later read sees the new keys; IndexedDB follows
 * asynchronously (see `whenLegacyStorageMigrated`).
 */
export function runLegacyStorageMigration(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  migrateLegacyWebStorage(readStorage(() => window.localStorage));
  migrateLegacyWebStorage(readStorage(() => window.sessionStorage));

  if (typeof indexedDB === 'undefined') return;
  keyValueStoreMigration = import('idb-keyval')
    .then(({ keys, get, set, del }) => migrateLegacyKeyValueStore({ keys, get, set, del }))
    .then(
      () => undefined,
      () => undefined,
    );
}
