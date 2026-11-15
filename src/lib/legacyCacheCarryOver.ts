/**
 * Service-worker side of the one-time move of browser data written by
 * earlier releases (the page side is `legacyStorageMigration.ts`).
 *
 * Earlier releases kept their Workbox runtime caches under the retired key
 * prefix. On activation the worker copies the entries of each such cache
 * into the current cache of the same name, so a device keeps its cached
 * thumbnails and pages instead of downloading everything again (and showing
 * broken images offline meanwhile), then deletes the legacy cache.
 *
 * Only caches whose name carries the retired prefix are touched. Workbox
 * precaches, the current runtime caches and any cache this module cannot
 * attribute are left alone, so a runtime cache a later release adds is never
 * wiped by mistake.
 *
 * No imports from page code: this module is bundled into the service worker.
 */

import { renameLegacyKey } from './legacyStorageKeys';

/** The parts of `Cache` the carry-over uses (a real `Cache` satisfies it). */
export interface CarryOverCache {
  keys: () => Promise<readonly Request[]>;
  match: (request: Request) => Promise<Response | undefined>;
  put: (request: Request, response: Response) => Promise<void>;
}

/** The parts of `CacheStorage` the carry-over uses (a real `CacheStorage` satisfies it). */
export interface CarryOverCacheStorage {
  keys: () => Promise<string[]>;
  open: (cacheName: string) => Promise<CarryOverCache>;
  delete: (cacheName: string) => Promise<boolean>;
}

export interface LegacyCacheCarryOverOptions {
  /** Current runtime caches whose legacy counterpart is copied before it is deleted. */
  carryOver: ReadonlySet<string>;
  /**
   * Called with the URLs copied into a current cache, e.g. to register them
   * with that cache's expiration. A failure here does not undo the copy.
   */
  onEntriesCopied?: (cacheName: string, urls: readonly string[]) => Promise<void>;
  /** Called after a legacy cache is deleted, e.g. to drop its expiration metadata. */
  onLegacyCacheDeleted?: (legacyCacheName: string) => Promise<void>;
  /** Parallel entry copies per cache. */
  concurrency?: number;
}

export interface LegacyCacheCarryOverResult {
  /** Entries copied into current caches. */
  copied: number;
  /** Legacy caches deleted. */
  deleted: string[];
}

const DEFAULT_CONCURRENCY = 6;

async function runWithConcurrency<TItem>(
  items: readonly TItem[],
  limit: number,
  task: (item: TItem) => Promise<void>,
): Promise<void> {
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item);
    }
  };
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
}

/** Copies every entry of `sourceName` that `targetName` lacks. Returns the copied URLs. */
async function copyCacheEntries(
  cacheStorage: CarryOverCacheStorage,
  sourceName: string,
  targetName: string,
  concurrency: number,
): Promise<string[]> {
  const source = await cacheStorage.open(sourceName);
  const target = await cacheStorage.open(targetName);
  const requests = await source.keys();
  const copied: string[] = [];

  await runWithConcurrency(requests, concurrency, async (request) => {
    try {
      // A response the current release already cached is newer: keep it.
      if (await target.match(request)) return;
      const response = await source.match(request);
      if (!response) return;
      await target.put(request, response);
      copied.push(request.url);
    } catch {
      // Skip this entry (quota, opaque or vanished response); the next one may still fit.
    }
  });
  return copied;
}

/**
 * Copies the entries of legacy-named runtime caches listed in `carryOver`
 * into their current counterpart, then deletes every legacy-named cache.
 * Never rejects: a cache that cannot be copied is still deleted (its entries
 * are re-downloaded on demand), and one that cannot be deleted is retried on
 * the next activation.
 */
export async function carryOverLegacyCaches(
  cacheStorage: CarryOverCacheStorage,
  options: LegacyCacheCarryOverOptions,
): Promise<LegacyCacheCarryOverResult> {
  const result: LegacyCacheCarryOverResult = { copied: 0, deleted: [] };

  let names: string[];
  try {
    names = await cacheStorage.keys();
  } catch {
    return result;
  }

  for (const legacyName of names) {
    const target = renameLegacyKey(legacyName);
    if (target === null) continue;

    if (options.carryOver.has(target)) {
      try {
        const urls = await copyCacheEntries(
          cacheStorage,
          legacyName,
          target,
          options.concurrency ?? DEFAULT_CONCURRENCY,
        );
        result.copied += urls.length;
        if (urls.length > 0) await options.onEntriesCopied?.(target, urls);
      } catch {
        // The legacy entries are only a head start; the current cache refills from the network.
      }
    }

    let deleted = false;
    try {
      deleted = await cacheStorage.delete(legacyName);
    } catch {
      // Retried on the next activation.
    }
    if (!deleted) continue;
    result.deleted.push(legacyName);
    try {
      await options.onLegacyCacheDeleted?.(legacyName);
    } catch {
      // Best-effort clean-up of metadata only.
    }
  }
  return result;
}
