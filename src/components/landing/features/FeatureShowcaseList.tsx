import type { ReactNode } from 'react';
import { DemoVideo } from '@/components/landing/features/DemoVideo';
import { ScreenshotBlock } from '@/components/landing/features/ScreenshotBlock';
import { landingVideo } from '@/lib/landingVideo';
import { cn } from '@/lib/utils';
import type { ShowcaseItem } from '@/pages/features/data/featurePageTypes';

interface FeatureShowcaseListProps {
  items: ShowcaseItem[];
}

type GridImage = { imageUrl: string; imageAlt: string };

function hasImageUrl(image: { imageUrl?: string; imageAlt: string }): image is GridImage {
  return Boolean(image.imageUrl);
}

function hasMedia(item: ShowcaseItem): boolean {
  switch (item.kind) {
    case 'image':
      return Boolean(item.imageUrl);
    case 'image-grid':
      return item.images.some(hasImageUrl);
    case 'demo-video':
      return true;
    default:
      return false;
  }
}

/**
 * Cards with a screenshot or video take a full row. Caption-only cards sit two
 * per row on wide screens; the last card of an odd run takes the full row so
 * the grid never leaves an empty cell.
 */
function fullRowFlags(items: ShowcaseItem[]): boolean[] {
  let runStart = 0;
  return items.map((item, index) => {
    if (hasMedia(item)) {
      runStart = index + 1;
      return true;
    }
    const next = items[index + 1];
    const endsRun = next === undefined || hasMedia(next);
    return endsRun && (index - runStart) % 2 === 0;
  });
}

function renderShowcaseItem(item: ShowcaseItem, fullRow: boolean): ReactNode {
  const span = fullRow ? 'md:col-span-2' : undefined;
  switch (item.kind) {
    case 'image':
      return (
        <ScreenshotBlock
          key={item.title}
          imageUrl={item.imageUrl}
          imageAlt={item.imageAlt}
          title={item.title}
          description={item.description}
          className={span}
        />
      );
    case 'demo-video':
      return (
        <div key={item.title} className={cn('bg-muted/50 rounded-xl p-8 border border-border', span)}>
          <div className="mb-4">
            <DemoVideo baseName={item.baseName} buildUrl={landingVideo} alt={item.alt} />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      );
    case 'image-grid': {
      const images = item.images.filter(hasImageUrl);
      return (
        <div key={item.title} className={cn('bg-muted/50 rounded-xl p-8 border border-border', span)}>
          {images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {images.map((image) => (
                <div key={image.imageAlt} className="rounded-lg overflow-hidden border border-border">
                  <img src={image.imageUrl} alt={image.imageAlt} className="w-full h-auto" loading="lazy" />
                </div>
              ))}
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
          <p className="text-muted-foreground">{item.description}</p>
        </div>
      );
    }
    default:
      return null;
  }
}

export const FeatureShowcaseList = ({ items }: FeatureShowcaseListProps) => {
  const fullRow = fullRowFlags(items);
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2">
      {items.map((item, index) => renderShowcaseItem(item, fullRow[index]))}
    </div>
  );
};
