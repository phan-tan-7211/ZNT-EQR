import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ShowcaseItem } from './featurePageTypes';

const pages = import.meta.glob<{ showcases?: ShowcaseItem[] }>('./*Data.ts', { eager: true });

function imageUrls(item: ShowcaseItem): string[] {
  if (item.kind === 'image') return item.imageUrl ? [item.imageUrl] : [];
  if (item.kind === 'image-grid') return item.images.flatMap((image) => (image.imageUrl ? [image.imageUrl] : []));
  return [];
}

describe('feature page showcase images', () => {
  const entries = Object.entries(pages).filter(([, page]) => Array.isArray(page.showcases));

  it('covers every feature page', () => {
    expect(entries.length).toBeGreaterThanOrEqual(11);
  });

  it.each(entries)('%s only points at screenshots that are shipped', (_, page) => {
    const missing = (page.showcases ?? [])
      .flatMap(imageUrls)
      .filter((url) => !url.startsWith('/') || !existsSync(join(process.cwd(), 'public', url)));

    expect(missing).toEqual([]);
  });
});
