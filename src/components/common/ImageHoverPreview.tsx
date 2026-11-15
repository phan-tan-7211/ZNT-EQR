import React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import type { ImageHoverPreviewState } from '@/utils/imageHoverPreview';

/** Marker class and data attribute of each preview; tests select on them. */
const PREVIEW_MARKERS = {
  equipment: {
    className: 'equipment-image-hover-preview',
    dataAttribute: 'data-equipment-image-hover-preview',
  },
  'inventory-item': {
    className: 'inventory-item-image-hover-preview',
    dataAttribute: 'data-inventory-item-image-hover-preview',
  },
} as const;

export interface ImageHoverPreviewProps {
  hover: ImageHoverPreviewState | null;
  visible: boolean;
  /** Which marker class and data attribute the preview carries. */
  marker: keyof typeof PREVIEW_MARKERS;
  /** Image to show instead of the one the preview opened with (e.g. the caller's current URL). */
  src?: string | null;
  /** Render into `document.body` so table cells and transformed ancestors cannot clip or offset it. */
  portal?: boolean;
}

/** The enlarged image shown next to the pointer while hovering a thumbnail. */
export const ImageHoverPreview: React.FC<ImageHoverPreviewProps> = ({
  hover,
  visible,
  marker,
  src,
  portal = false,
}) => {
  if (!hover) return null;

  const { className, dataAttribute } = PREVIEW_MARKERS[marker];
  const preview = (
    <div
      className={cn(
        `${className} pointer-events-none fixed z-[9999] box-border overflow-hidden rounded-xl border border-border bg-white p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out dark:bg-card`,
        visible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0',
      )}
      {...{ [dataAttribute]: true }}
      aria-hidden="true"
      style={{ left: hover.x, top: hover.y, width: hover.size, height: hover.size }}
    >
      <img
        src={src ?? hover.src}
        alt=""
        className="block h-full w-full rounded-md bg-white object-contain dark:bg-card"
      />
    </div>
  );

  return portal && typeof document !== 'undefined' ? createPortal(preview, document.body) : preview;
};
