import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IMAGE_HOVER_MEDIA_QUERY,
  IMAGE_HOVER_TRANSITION_MS,
  getImageHoverPosition,
  type ImageHoverPreviewState,
} from '@/utils/imageHoverPreview';

/** The pointer fields the preview reads; React and DOM pointer events both fit. */
type ImageHoverPointer = Pick<PointerEvent, 'clientX' | 'clientY' | 'buttons'>;

export interface ImageHoverPreviewOptions {
  /**
   * The image the returned `handlers` open for one thumbnail. A preview that
   * serves many thumbnails leaves it out and calls `openAt` with each image.
   */
  src?: string | null;
  /**
   * Close instead of opening while a pointer button is held
   * (`event.buttons !== 0`), so pressing or dragging over the thumbnail never
   * shows the preview. When false, the buttons are not checked.
   */
  closeWhilePointerButtonHeld?: boolean;
  /**
   * Apply moves that keep the same image at most once per animation frame
   * instead of re-rendering on every pointer event. A new image still renders
   * at once.
   */
  coalescePositionUpdates?: boolean;
}

/**
 * Hover zoom for thumbnails: opens a large preview next to the pointer for
 * fine, hovering pointers only, fades it out on close, and removes it once the
 * fade has finished. Render `hover`/`visible` through `ImageHoverPreview`.
 *
 * - `handlers` open `src` for one thumbnail (spread them on the element).
 * - `openAt(src, clientX, clientY)` opens any image, e.g. from a delegated
 *   listener; an empty `src` or a coarse pointer closes the preview instead.
 * - `close()` starts the fade; it does nothing while no preview is open.
 */
export function useImageHoverPreview({
  src = null,
  closeWhilePointerButtonHeld = false,
  coalescePositionUpdates = false,
}: ImageHoverPreviewOptions = {}) {
  const [hover, setHover] = useState<ImageHoverPreviewState | null>(null);
  const [visible, setVisible] = useState(false);
  /** The latest preview asked for; ahead of `hover` while a coalesced move waits for its frame. */
  const latestHover = useRef<ImageHoverPreviewState | null>(null);
  const closeTimer = useRef<number | null>(null);
  const positionFrame = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    if (!latestHover.current) return;
    setVisible(false);
    if (closeTimer.current !== null) return;
    closeTimer.current = window.setTimeout(() => {
      latestHover.current = null;
      setHover(null);
      closeTimer.current = null;
    }, IMAGE_HOVER_TRANSITION_MS);
  }, []);

  const openAt = useCallback(
    (imageSrc: string | null | undefined, clientX: number, clientY: number) => {
      if (!imageSrc || !window.matchMedia(IMAGE_HOVER_MEDIA_QUERY).matches) {
        close();
        return;
      }
      clearCloseTimer();
      const nextHover = { src: imageSrc, ...getImageHoverPosition(clientX, clientY) };
      const previousHover = latestHover.current;
      latestHover.current = nextHover;
      setVisible(true);
      if (!coalescePositionUpdates || !previousHover || previousHover.src !== nextHover.src) {
        setHover(nextHover);
        return;
      }
      if (positionFrame.current !== null) return;
      positionFrame.current = window.requestAnimationFrame(() => {
        positionFrame.current = null;
        if (latestHover.current) setHover({ ...latestHover.current });
      });
    },
    [clearCloseTimer, close, coalescePositionUpdates],
  );

  const open = useCallback(
    (event: ImageHoverPointer) => {
      if (closeWhilePointerButtonHeld && event.buttons !== 0) {
        close();
        return;
      }
      openAt(src, event.clientX, event.clientY);
    },
    [close, closeWhilePointerButtonHeld, openAt, src],
  );

  useEffect(
    () => () => {
      clearCloseTimer();
      if (positionFrame.current !== null) {
        window.cancelAnimationFrame(positionFrame.current);
        positionFrame.current = null;
      }
      latestHover.current = null;
    },
    [clearCloseTimer],
  );

  return {
    hover,
    visible,
    openAt,
    close,
    handlers: { onPointerEnter: open, onPointerMove: open, onPointerLeave: close },
  };
}
