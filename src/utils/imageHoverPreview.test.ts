import { afterEach, describe, expect, it } from 'vitest';
import { getImageHoverPosition } from './imageHoverPreview';

const originalSize = { width: window.innerWidth, height: window.innerHeight };

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
}

describe('getImageHoverPosition', () => {
  afterEach(() => {
    setViewport(originalSize.width, originalSize.height);
  });

  it('places the preview above and to the right of the pointer, inside the viewport', () => {
    setViewport(1024, 768);

    expect(getImageHoverPosition(220, 500)).toEqual({ x: 234, y: 126, size: 360 });
    // Too close to the top: clamped to the margin.
    expect(getImageHoverPosition(220, 240)).toEqual({ x: 234, y: 12, size: 360 });
  });

  it('flips to the left of the pointer near the right edge', () => {
    setViewport(1024, 768);

    expect(getImageHoverPosition(900, 600)).toEqual({ x: 526, y: 226, size: 360 });
  });

  it('shrinks to fit small viewports and keeps the margin', () => {
    setViewport(300, 200);

    expect(getImageHoverPosition(100, 100)).toEqual({ x: 12, y: 12, size: 180 });
  });
});
