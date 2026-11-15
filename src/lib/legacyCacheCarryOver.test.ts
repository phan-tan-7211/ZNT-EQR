import { describe, expect, it, vi } from 'vitest';
import {
  carryOverLegacyCaches,
  type CarryOverCache,
  type CarryOverCacheStorage,
} from './legacyCacheCarryOver';

// Spelled as character codes for the same reason as in legacyStorageKeys.ts.
const LEGACY = String.fromCharCode(101, 113, 117, 105, 112, 113, 114);

const DISPLAY_IMAGES = 'znteqr-display-images-v2';
const PAGES = 'znteqr-pages-v1';
const STATIC = 'znteqr-static-v1';
const CARRY_OVER: ReadonlySet<string> = new Set([DISPLAY_IMAGES, PAGES, STATIC]);

const IMAGE_ORIGIN = 'https://project.example.test/storage/v1/object/public/display-images/org/o1/equipment/e1';

class MemoryCache implements CarryOverCache {
  readonly bodies = new Map<string, string>();
  failPutFor = new Set<string>();

  async keys(): Promise<readonly Request[]> {
    return [...this.bodies.keys()].map((url) => new Request(url));
  }
  async match(request: Request): Promise<Response | undefined> {
    const body = this.bodies.get(request.url);
    return body === undefined ? undefined : new Response(body, { headers: { 'content-type': 'image/webp' } });
  }
  async put(request: Request, response: Response): Promise<void> {
    if (this.failPutFor.has(request.url)) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    this.bodies.set(request.url, await response.text());
  }
}

class MemoryCacheStorage implements CarryOverCacheStorage {
  readonly caches = new Map<string, MemoryCache>();
  failDeleteFor = new Set<string>();
  failOpenFor = new Set<string>();

  seed(name: string, entries: Record<string, string>): MemoryCache {
    const cache = this.cache(name);
    for (const [url, body] of Object.entries(entries)) cache.bodies.set(url, body);
    return cache;
  }
  cache(name: string): MemoryCache {
    let cache = this.caches.get(name);
    if (!cache) {
      cache = new MemoryCache();
      this.caches.set(name, cache);
    }
    return cache;
  }
  async keys(): Promise<string[]> {
    return [...this.caches.keys()];
  }
  async open(name: string): Promise<CarryOverCache> {
    if (this.failOpenFor.has(name)) throw new Error('open failed');
    return this.cache(name);
  }
  async delete(name: string): Promise<boolean> {
    if (this.failDeleteFor.has(name)) throw new Error('delete failed');
    return this.caches.delete(name);
  }
}

describe('carryOverLegacyCaches', () => {
  it('copies legacy display images into the current cache and keeps newer current entries', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-display-images-v2`, {
      [`${IMAGE_ORIGIN}/a/thumb.webp`]: 'legacy-a',
      [`${IMAGE_ORIGIN}/b/thumb.webp`]: 'legacy-b',
    });
    storage.seed(DISPLAY_IMAGES, { [`${IMAGE_ORIGIN}/b/thumb.webp`]: 'current-b' });

    const result = await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER });

    expect(result).toEqual({ copied: 1, deleted: [`${LEGACY}-display-images-v2`] });
    expect(Object.fromEntries(storage.cache(DISPLAY_IMAGES).bodies)).toEqual({
      [`${IMAGE_ORIGIN}/a/thumb.webp`]: 'legacy-a',
      [`${IMAGE_ORIGIN}/b/thumb.webp`]: 'current-b',
    });
  });

  it('carries over the pages and static caches too', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-pages-v1`, { 'https://app.example.test/dashboard': '<html>' });
    storage.seed(`${LEGACY}-static-v1`, { 'https://app.example.test/images/logo.png': 'png' });

    const result = await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER });

    expect(result.copied).toBe(2);
    expect([...storage.caches.keys()].sort()).toEqual([PAGES, STATIC]);
    expect(storage.cache(PAGES).bodies.get('https://app.example.test/dashboard')).toBe('<html>');
    expect(storage.cache(STATIC).bodies.get('https://app.example.test/images/logo.png')).toBe('png');
  });

  it('deletes only legacy-named caches and never Workbox precaches or caches it cannot attribute', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-display-images-v1`, { [`${IMAGE_ORIGIN}/old.png`]: 'retired format' });
    storage.seed('workbox-precache-v2-https://app.example.test/', { 'https://app.example.test/index.html': 'shell' });
    storage.seed(DISPLAY_IMAGES, {});
    storage.seed('znteqr-reports-v1', { 'https://app.example.test/report': 'future runtime cache' });
    storage.seed('third-party-widget', { 'https://widget.example.test/x': 'x' });
    storage.seed(`${LEGACY}extra`, { 'https://app.example.test/y': 'y' });

    const onEntriesCopied = vi.fn(async () => undefined);
    const result = await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER, onEntriesCopied });

    // The retired v1 cache has no current counterpart: deleted without copying.
    expect(result).toEqual({ copied: 0, deleted: [`${LEGACY}-display-images-v1`] });
    expect(onEntriesCopied).not.toHaveBeenCalled();
    expect([...storage.caches.keys()].sort()).toEqual(
      [
        'workbox-precache-v2-https://app.example.test/',
        DISPLAY_IMAGES,
        'znteqr-reports-v1',
        'third-party-widget',
        `${LEGACY}extra`,
      ].sort(),
    );
  });

  it('reports the copied URLs and the deleted caches to the callbacks', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-display-images-v2`, {
      [`${IMAGE_ORIGIN}/a/thumb.webp`]: 'a',
      [`${IMAGE_ORIGIN}/b/thumb.webp`]: 'b',
    });
    const onEntriesCopied = vi.fn<(cacheName: string, urls: readonly string[]) => Promise<void>>(
      async () => undefined,
    );
    const onLegacyCacheDeleted = vi.fn<(legacyCacheName: string) => Promise<void>>(async () => undefined);

    await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER, onEntriesCopied, onLegacyCacheDeleted });

    expect(onEntriesCopied).toHaveBeenCalledTimes(1);
    const [cacheName, urls] = onEntriesCopied.mock.calls[0];
    expect(cacheName).toBe(DISPLAY_IMAGES);
    expect([...urls].sort()).toEqual([`${IMAGE_ORIGIN}/a/thumb.webp`, `${IMAGE_ORIGIN}/b/thumb.webp`]);
    expect(onLegacyCacheDeleted).toHaveBeenCalledWith(`${LEGACY}-display-images-v2`);
  });

  it('skips an entry that cannot be copied and keeps copying the rest', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-display-images-v2`, {
      [`${IMAGE_ORIGIN}/a/thumb.webp`]: 'a',
      [`${IMAGE_ORIGIN}/b/thumb.webp`]: 'b',
      [`${IMAGE_ORIGIN}/c/thumb.webp`]: 'c',
    });
    storage.cache(DISPLAY_IMAGES).failPutFor.add(`${IMAGE_ORIGIN}/b/thumb.webp`);

    const result = await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER, concurrency: 1 });

    expect(result.copied).toBe(2);
    expect([...storage.cache(DISPLAY_IMAGES).bodies.keys()].sort()).toEqual([
      `${IMAGE_ORIGIN}/a/thumb.webp`,
      `${IMAGE_ORIGIN}/c/thumb.webp`,
    ]);
    expect(storage.caches.has(`${LEGACY}-display-images-v2`)).toBe(false);
  });

  it('never rejects: failed opens, callbacks and deletes are contained', async () => {
    const storage = new MemoryCacheStorage();
    storage.seed(`${LEGACY}-display-images-v2`, { [`${IMAGE_ORIGIN}/a/thumb.webp`]: 'a' });
    storage.seed(`${LEGACY}-pages-v1`, { 'https://app.example.test/': '<html>' });
    storage.seed(`${LEGACY}-static-v1`, { 'https://app.example.test/images/logo.png': 'png' });
    storage.failOpenFor.add(`${LEGACY}-pages-v1`);
    storage.failDeleteFor.add(`${LEGACY}-static-v1`);

    const result = await carryOverLegacyCaches(storage, {
      carryOver: CARRY_OVER,
      onEntriesCopied: () => Promise.reject(new Error('expiration metadata unavailable')),
      onLegacyCacheDeleted: () => Promise.reject(new Error('metadata clean-up failed')),
    });

    // The display images were copied even though the callback failed.
    expect(storage.cache(DISPLAY_IMAGES).bodies.get(`${IMAGE_ORIGIN}/a/thumb.webp`)).toBe('a');
    // A cache that could not be copied is still deleted; one that could not be deleted waits for the next activation.
    expect(result.deleted.sort()).toEqual([`${LEGACY}-display-images-v2`, `${LEGACY}-pages-v1`].sort());
    expect(storage.caches.has(`${LEGACY}-static-v1`)).toBe(true);

    const unavailable: CarryOverCacheStorage = {
      keys: () => Promise.reject(new Error('no cache storage')),
      open: () => Promise.reject(new Error('no cache storage')),
      delete: () => Promise.reject(new Error('no cache storage')),
    };
    await expect(carryOverLegacyCaches(unavailable, { carryOver: CARRY_OVER })).resolves.toEqual({
      copied: 0,
      deleted: [],
    });
  });

  it('limits the number of entries copied at once', async () => {
    const storage = new MemoryCacheStorage();
    const entries: Record<string, string> = {};
    for (let index = 0; index < 20; index += 1) entries[`${IMAGE_ORIGIN}/${index}/thumb.webp`] = `image-${index}`;
    storage.seed(`${LEGACY}-display-images-v2`, entries);

    const target = storage.cache(DISPLAY_IMAGES);
    const put = target.put.bind(target);
    let inFlight = 0;
    let peak = 0;
    target.put = async (request, response) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      await put(request, response);
      inFlight -= 1;
    };

    const result = await carryOverLegacyCaches(storage, { carryOver: CARRY_OVER, concurrency: 3 });

    expect(result.copied).toBe(20);
    expect(peak).toBe(3);
  });
});
