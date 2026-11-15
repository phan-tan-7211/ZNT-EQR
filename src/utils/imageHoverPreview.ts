/** The large preview shown while hovering a thumbnail: its image and where it sits. */
export type ImageHoverPreviewState = { src: string; x: number; y: number; size: number };

/** How long the preview fades out before it is removed. */
export const IMAGE_HOVER_TRANSITION_MS = 140;

/** The preview only opens for a precise, hovering pointer (never touch). */
export const IMAGE_HOVER_MEDIA_QUERY = '(hover: hover) and (pointer: fine)';

/**
 * Places a square preview above and to the right of the pointer, flipping to
 * the left near the right edge and keeping it inside the viewport.
 */
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
