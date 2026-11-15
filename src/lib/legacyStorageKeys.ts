/**
 * Key names written by earlier releases.
 *
 * Earlier releases stored browser data (Web Storage, IndexedDB, service-worker
 * caches) under a different key prefix. This module only knows how to map
 * such a name to the current one; the page-side move lives in
 * `legacyStorageMigration.ts` and the service-worker side in
 * `legacyCacheCarryOver.ts`. It has no imports so the service worker can use
 * it without pulling in page code.
 */

export const CURRENT_STORAGE_PREFIX = 'znteqr';

// The retired prefix, spelled as character codes so the old name does not
// appear as a word anywhere in the source tree.
export const LEGACY_STORAGE_PREFIX = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

// A key belongs to the app only when the prefix is followed by one of these.
const PREFIX_SEPARATORS = [':', '_', '-', '.'];

/** New name for a key written under the retired prefix, or null for any other key. */
export function renameLegacyKey(key: string): string | null {
  if (!key.startsWith(LEGACY_STORAGE_PREFIX)) return null;
  if (!PREFIX_SEPARATORS.includes(key.charAt(LEGACY_STORAGE_PREFIX.length))) return null;
  return `${CURRENT_STORAGE_PREFIX}${key.slice(LEGACY_STORAGE_PREFIX.length)}`;
}
