import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Forklift } from 'lucide-react';
import {
  batchResolveEquipmentDisplayImageUrls,
  displayableImageSrc,
} from '@/services/imageUploadService';
import { getImageHoverPosition } from '@/features/equipment/utils/equipmentImageHover';

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

type EquipmentImageHover = {
  x: number;
  y: number;
  size: number;
};

const thumbnailResolutionCache = new Map<string, Promise<string | null>>();
const pendingThumbnailResolutions = new Map<string, PendingThumbnailResolution>();
let thumbnailFlushScheduled = false;
const IMAGE_HOVER_TRANSITION_MS = 140;

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
  const [imageHover, setImageHover] = useState<EquipmentImageHover | null>(null);
  const [imageHoverVisible, setImageHoverVisible] = useState(false);
  const imageHoverCloseTimer = useRef<number | null>(null);

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

  useEffect(() => () => {
    if (imageHoverCloseTimer.current !== null) {
      window.clearTimeout(imageHoverCloseTimer.current);
      imageHoverCloseTimer.current = null;
    }
  }, []);

  const clearImageHoverCloseTimer = () => {
    if (imageHoverCloseTimer.current === null) return;
    window.clearTimeout(imageHoverCloseTimer.current);
    imageHoverCloseTimer.current = null;
  };

  const closeImageHover = () => {
    setImageHoverVisible(false);
    if (imageHoverCloseTimer.current !== null) return;
    imageHoverCloseTimer.current = window.setTimeout(() => {
      setImageHover(null);
      imageHoverCloseTimer.current = null;
    }, IMAGE_HOVER_TRANSITION_MS);
  };

  const openImageHover = (clientX: number, clientY: number) => {
    if (!imageSrc || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      closeImageHover();
      return;
    }

    clearImageHoverCloseTimer();
    setImageHover(getImageHoverPosition(clientX, clientY));
    setImageHoverVisible(true);
  };

  return (
    <>
      <div
        className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border/70 bg-muted ${imageSrc ? 'cursor-zoom-in' : ''}`}
        data-inventory-equipment-thumbnail
        onPointerEnter={(event) => openImageHover(event.clientX, event.clientY)}
        onPointerMove={(event) => openImageHover(event.clientX, event.clientY)}
        onPointerLeave={closeImageHover}
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
      {imageHover && imageSrc && typeof document !== 'undefined'
        ? createPortal(
            <div
              className={`equipment-image-hover-preview pointer-events-none fixed z-[9999] box-border overflow-hidden rounded-xl border border-border bg-white p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out dark:bg-card ${imageHoverVisible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0'}`}
              data-equipment-image-hover-preview
              aria-hidden="true"
              style={{
                left: imageHover.x,
                top: imageHover.y,
                width: imageHover.size,
                height: imageHover.size,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                className="block h-full w-full rounded-md bg-white object-contain dark:bg-card"
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
