import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/** Large preview shown while hovering an equipment thumbnail. */
export type EquipmentImageHover = { src: string; alt: string; x: number; y: number; size: number };

export const IMAGE_HOVER_TRANSITION_MS = 140;

/** The preview only opens for a precise, hovering pointer (never touch). */
export const IMAGE_HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

export function getImageHoverPosition(clientX: number, clientY: number) {
  const margin = 12;
  const gap = 14;
  const size = Math.min(
    360,
    Math.max(180, window.innerWidth - margin * 2),
    Math.max(180, window.innerHeight - margin * 2),
  );
  let x = clientX + gap;
  let y = clientY - size - gap;

  if (x + size > window.innerWidth - margin) x = clientX - size - gap;
  x = Math.max(margin, Math.min(x, window.innerWidth - size - margin));
  y = Math.max(margin, Math.min(y, window.innerHeight - size - margin));

  return { x, y, size };
}

/**
 * Hover zoom for one thumbnail, with the same gating, position, and fade as the
 * Equipment table view. Spread `handlers` on the thumbnail and render the
 * returned `hover`/`visible` through `EquipmentImageHoverPreview`.
 */
export function useEquipmentImageHoverPreview(src: string | null | undefined, alt: string) {
  const [hover, setHover] = useState<EquipmentImageHover | null>(null);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    if (closeTimer.current !== null) return;
    closeTimer.current = window.setTimeout(() => {
      setHover(null);
      closeTimer.current = null;
    }, IMAGE_HOVER_TRANSITION_MS);
  }, []);

  const open = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!src || event.buttons !== 0 || !window.matchMedia(IMAGE_HOVER_MEDIA_QUERY).matches) {
        close();
        return;
      }
      clearCloseTimer();
      setHover({ src, alt, ...getImageHoverPosition(event.clientX, event.clientY) });
      setVisible(true);
    },
    [alt, clearCloseTimer, close, src],
  );

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return {
    hover,
    visible,
    handlers: { onPointerEnter: open, onPointerMove: open, onPointerLeave: close },
  };
}
