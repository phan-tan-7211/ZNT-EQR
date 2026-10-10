import React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';
import type { EquipmentImageHover } from '@/features/equipment/utils/equipmentImageHover';

export interface EquipmentImageHoverPreviewProps {
  hover: EquipmentImageHover | null;
  visible: boolean;
  /** Render into `document.body` so table cells and transformed ancestors cannot clip or offset it. */
  portal?: boolean;
}

/** The enlarged equipment image shared by the Equipment table and the bulk-edit grid. */
export const EquipmentImageHoverPreview: React.FC<EquipmentImageHoverPreviewProps> = ({
  hover,
  visible,
  portal = false,
}) => {
  if (!hover) return null;

  const preview = (
    <div
      className={cn(
        'equipment-image-hover-preview pointer-events-none fixed z-[9999] box-border overflow-hidden rounded-xl border border-border bg-white p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out dark:bg-card',
        visible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0',
      )}
      data-equipment-image-hover-preview
      aria-hidden="true"
      style={{ left: hover.x, top: hover.y, width: hover.size, height: hover.size }}
    >
      <img src={hover.src} alt="" className="block h-full w-full rounded-md bg-white object-contain dark:bg-card" />
    </div>
  );

  return portal && typeof document !== 'undefined' ? createPortal(preview, document.body) : preview;
};
