import { useEffect, useRef, useState } from 'react';
import {
  IMAGE_HOVER_MEDIA_QUERY,
  IMAGE_HOVER_TRANSITION_MS,
  getImageHoverPosition,
} from '@/features/equipment/utils/equipmentImageHover';

/** Position and size of the large preview shown while hovering a thumbnail. */
type InventoryThumbnailImageHover = {
  x: number;
  y: number;
  size: number;
};

/**
 * Hover zoom for one inventory thumbnail. `openImageHover` places the large
 * preview next to the pointer (fine, hovering pointers only) when `canOpen` is
 * true and closes it otherwise; `closeImageHover` fades the preview out and
 * clears `imageHover` once the transition has finished.
 */
export function useInventoryThumbnailImageHover(canOpen: boolean) {
  const [imageHover, setImageHover] = useState<InventoryThumbnailImageHover | null>(null);
  const [imageHoverVisible, setImageHoverVisible] = useState(false);
  const imageHoverCloseTimer = useRef<number | null>(null);

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
    if (!canOpen || !window.matchMedia(IMAGE_HOVER_MEDIA_QUERY).matches) {
      closeImageHover();
      return;
    }

    clearImageHoverCloseTimer();
    setImageHover(getImageHoverPosition(clientX, clientY));
    setImageHoverVisible(true);
  };

  return { imageHover, imageHoverVisible, openImageHover, closeImageHover };
}
