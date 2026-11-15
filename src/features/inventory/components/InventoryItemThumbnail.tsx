import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import type { InventoryItem } from '@/features/inventory/types/inventory';
import {
  clearInventoryItemThumbnailCache,
  getInventoryThumbnailCacheVersion,
  getPrimaryInventoryItemImageRefs,
} from '@/features/inventory/services/inventoryListThumbnailService';
import {
  batchResolveInventoryItemImageDisplayUrls,
  displayableImageSrc,
  getInventoryItemDisplayImageUrl,
} from '@/services/imageUploadService';
import { isDisplayImageV2Ref } from '@/services/displayImageStorageService';
import { ImageHoverPreview } from '@/components/common/ImageHoverPreview';
import { useImageHoverPreview } from '@/hooks/useImageHoverPreview';
import { cn } from '@/lib/utils';

type InventoryThumbnailItem = Pick<InventoryItem, 'id' | 'organization_id' | 'image_url'>;

type InventoryThumbnailUrls = {
  src: string | null;
  hoverSrc: string | null;
};

type ResolvedThumbnailCacheEntry = {
  urls: InventoryThumbnailUrls;
  expiresAt: number;
  version: number;
};

type PendingThumbnailResolution = {
  key: string;
  item: InventoryThumbnailItem;
  resolve: (urls: InventoryThumbnailUrls) => void;
};

const thumbnailResolutionCache = new Map<
  string,
  Promise<InventoryThumbnailUrls> | ResolvedThumbnailCacheEntry
>();
const pendingThumbnailResolutions = new Map<string, PendingThumbnailResolution>();
let thumbnailFlushScheduled = false;
const LEGACY_THUMBNAIL_CACHE_TTL_MS = 15 * 60 * 1000 - 30 * 1000;
const V2_THUMBNAIL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function thumbnailCacheKey(item: InventoryThumbnailItem): string {
  return `${item.organization_id}:${item.id}:${item.image_url ?? ''}`;
}

async function flushPendingThumbnailResolutions(): Promise<void> {
  thumbnailFlushScheduled = false;
  const batch = [...pendingThumbnailResolutions.values()];
  pendingThumbnailResolutions.clear();

  if (batch.length === 0) return;

  const byOrganization = new Map<string, PendingThumbnailResolution[]>();
  for (const pending of batch) {
    const organizationBatch = byOrganization.get(pending.item.organization_id) ?? [];
    organizationBatch.push(pending);
    byOrganization.set(pending.item.organization_id, organizationBatch);
  }

  for (const [organizationId, organizationBatch] of byOrganization) {
    let primaryRefs: Record<string, string> = {};
    try {
      primaryRefs = await getPrimaryInventoryItemImageRefs(
        organizationId,
        organizationBatch.map((pending) => pending.item.id),
      );
    } catch {
      // Preserve legacy image_url fallback if image metadata is temporarily unavailable.
    }

    const storedRefs = organizationBatch.map(
      (pending) => primaryRefs[pending.item.id] ?? pending.item.image_url ?? null,
    );

    let resolvedUrls: (string | null)[];
    try {
      resolvedUrls = await batchResolveInventoryItemImageDisplayUrls(
        storedRefs,
        { variant: 'thumb' },
      );
    } catch {
      resolvedUrls = storedRefs.map((storedRef) => displayableImageSrc(storedRef));
    }

    organizationBatch.forEach((pending, index) => {
      thumbnailResolutionCache.delete(pending.key);
      const src = resolvedUrls[index] ?? displayableImageSrc(storedRefs[index]) ?? null;
      const resolved = {
        src,
        // V2 hover previews use the immutable 512px variant. Legacy refs keep
        // the already-resolved thumbnail because they have no parallel set.
        hoverSrc: getInventoryItemDisplayImageUrl(storedRefs[index], 'preview') ?? src,
      };
      if (resolved.src) {
        thumbnailResolutionCache.set(pending.key, {
          urls: resolved,
          expiresAt:
            Date.now() +
            (isDisplayImageV2Ref(storedRefs[index])
              ? V2_THUMBNAIL_CACHE_TTL_MS
              : LEGACY_THUMBNAIL_CACHE_TTL_MS),
          version: getInventoryThumbnailCacheVersion(
            pending.item.organization_id,
            pending.item.id,
          ),
        });
      } else {
        thumbnailResolutionCache.delete(pending.key);
      }
      pending.resolve(resolved);
    });
  }
}

function resolveThumbnailUrl(item: InventoryThumbnailItem): Promise<InventoryThumbnailUrls> {
  const key = thumbnailCacheKey(item);
  const cached = thumbnailResolutionCache.get(key);
  if (cached) {
    return cached instanceof Promise ? cached : Promise.resolve(cached.urls);
  }

  const pending = new Promise<InventoryThumbnailUrls>((resolve) => {
    pendingThumbnailResolutions.set(key, { key, item, resolve });

    if (!thumbnailFlushScheduled) {
      thumbnailFlushScheduled = true;
      void Promise.resolve().then(flushPendingThumbnailResolutions);
    }
  });

  thumbnailResolutionCache.set(key, pending);
  return pending;
}

function getResolvedThumbnailUrl(item: InventoryThumbnailItem): InventoryThumbnailUrls | null {
  const cached = thumbnailResolutionCache.get(thumbnailCacheKey(item));
  if (!cached || cached instanceof Promise) return null;
  if (
    cached.version !==
    getInventoryThumbnailCacheVersion(item.organization_id, item.id)
  ) {
    thumbnailResolutionCache.delete(thumbnailCacheKey(item));
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    thumbnailResolutionCache.delete(thumbnailCacheKey(item));
    return null;
  }
  return cached.urls;
}

export function InventoryItemThumbnail({
  item,
  enableHover = true,
  size = 'sm',
}: {
  item: InventoryThumbnailItem;
  enableHover?: boolean;
  size?: 'sm' | 'md';
}) {
  const itemId = item.id;
  const organizationId = item.organization_id;
  const legacyImageUrl = item.image_url;
  const [imageUrls, setImageUrls] = useState<InventoryThumbnailUrls | null>(() =>
    getResolvedThumbnailUrl({
      id: itemId,
      organization_id: organizationId,
      image_url: legacyImageUrl,
    }),
  );
  const imageSrc = imageUrls?.src ?? null;
  const imageHoverSrc = imageUrls?.hoverSrc ?? imageSrc;

  useEffect(() => {
    let active = true;
    const thumbnailItem = {
      id: itemId,
      organization_id: organizationId,
      image_url: legacyImageUrl,
    };
    const cached = getResolvedThumbnailUrl(thumbnailItem);
    if (cached) {
      setImageUrls(cached);
      return () => {
        active = false;
      };
    }
    setImageUrls(null);

    void resolveThumbnailUrl(thumbnailItem).then((resolved) => {
      if (active) setImageUrls(resolved);
    });

    return () => {
      active = false;
    };
  }, [itemId, organizationId, legacyImageUrl]);

  const {
    hover: imageHover,
    visible: imageHoverVisible,
    close: closeImageHover,
    handlers: imageHoverHandlers,
  } = useImageHoverPreview({ src: enableHover ? imageSrc : null });

  return (
    <>
      <div
        className={cn(
          'relative shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted',
          size === 'md' ? 'h-12 w-12' : 'h-10 w-10',
          enableHover && imageSrc && 'cursor-zoom-in',
        )}
        data-inventory-item-thumbnail
        {...(enableHover ? imageHoverHandlers : undefined)}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
        </div>
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => {
              clearInventoryItemThumbnailCache(organizationId, itemId);
              setImageUrls(null);
              closeImageHover();
            }}
          />
        )}
      </div>
      <ImageHoverPreview
        hover={imageSrc ? imageHover : null}
        visible={imageHoverVisible}
        marker="inventory-item"
        src={imageHoverSrc}
        portal
      />
    </>
  );
}

