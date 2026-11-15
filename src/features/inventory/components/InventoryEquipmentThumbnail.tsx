import { useEffect, useState } from 'react';
import { Forklift } from 'lucide-react';
import {
  batchResolveEquipmentDisplayImageUrls,
  displayableImageSrc,
} from '@/services/imageUploadService';
import { ImageHoverPreview } from '@/components/common/ImageHoverPreview';
import { useImageHoverPreview } from '@/hooks/useImageHoverPreview';

export type InventoryEquipmentThumbnailItem = {
  id: string;
  image_url?: string | null;
};

type PendingThumbnailResolution = {
  key: string;
  equipmentId: string;
  storedRef: string;
  resolve: (url: string | null) => void;
};

const thumbnailResolutionCache = new Map<string, Promise<string | null>>();
const pendingThumbnailResolutions = new Map<string, PendingThumbnailResolution>();
let thumbnailFlushScheduled = false;

function thumbnailCacheKey(equipmentId: string, storedRef: string): string {
  return `${equipmentId}:${storedRef}`;
}

async function flushPendingThumbnailResolutions(): Promise<void> {
  thumbnailFlushScheduled = false;
  const batch = [...pendingThumbnailResolutions.values()];
  pendingThumbnailResolutions.clear();

  if (batch.length === 0) return;

  try {
    const resolvedUrls = await batchResolveEquipmentDisplayImageUrls(
      batch.map((item) => item.storedRef),
      { equipmentIds: batch.map((item) => item.equipmentId) },
    );

    batch.forEach((item, index) => {
      thumbnailResolutionCache.delete(item.key);
      item.resolve(resolvedUrls[index] ?? null);
    });
  } catch {
    batch.forEach((item) => {
      thumbnailResolutionCache.delete(item.key);
      item.resolve(null);
    });
  }
}

function resolveThumbnailUrl(equipmentId: string, storedRef: string): Promise<string | null> {
  const immediatelyDisplayable = displayableImageSrc(storedRef);
  if (immediatelyDisplayable) return Promise.resolve(immediatelyDisplayable);

  const trimmed = storedRef.trim();
  if (!trimmed) return Promise.resolve(null);

  const key = thumbnailCacheKey(equipmentId, trimmed);
  const cached = thumbnailResolutionCache.get(key);
  if (cached) return cached;

  const pending = new Promise<string | null>((resolve) => {
    pendingThumbnailResolutions.set(key, {
      key,
      equipmentId,
      storedRef: trimmed,
      resolve,
    });

    if (!thumbnailFlushScheduled) {
      thumbnailFlushScheduled = true;
      void Promise.resolve().then(flushPendingThumbnailResolutions);
    }
  });

  thumbnailResolutionCache.set(key, pending);
  return pending;
}

export function InventoryEquipmentThumbnail({
  equipment,
}: {
  equipment: InventoryEquipmentThumbnailItem;
}) {
  const storedRef = equipment.image_url ?? null;
  const [imageSrc, setImageSrc] = useState<string | null>(() => displayableImageSrc(storedRef));

  useEffect(() => {
    const immediatelyDisplayable = displayableImageSrc(storedRef);
    setImageSrc(immediatelyDisplayable);

    if (immediatelyDisplayable || !storedRef?.trim()) return;

    let active = true;
    void resolveThumbnailUrl(equipment.id, storedRef).then((resolved) => {
      if (active) setImageSrc(resolved);
    });

    return () => {
      active = false;
    };
  }, [equipment.id, storedRef]);

  const {
    hover: imageHover,
    visible: imageHoverVisible,
    close: closeImageHover,
    handlers: imageHoverHandlers,
  } = useImageHoverPreview({ src: imageSrc });

  return (
    <>
      <div
        className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted ${imageSrc ? 'cursor-zoom-in' : ''}`}
        data-inventory-equipment-thumbnail
        {...imageHoverHandlers}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Forklift className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
        </div>
        {imageSrc && (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => {
              setImageSrc(null);
              closeImageHover();
            }}
          />
        )}
      </div>
      <ImageHoverPreview
        hover={imageSrc ? imageHover : null}
        visible={imageHoverVisible}
        marker="equipment"
        src={imageSrc}
        portal
      />
    </>
  );
}
