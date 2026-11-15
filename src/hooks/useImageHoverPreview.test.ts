import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useImageHoverPreview, type ImageHoverPreviewOptions } from './useImageHoverPreview';
import {
  IMAGE_HOVER_MEDIA_QUERY,
  IMAGE_HOVER_TRANSITION_MS,
  getImageHoverPosition,
} from '@/utils/imageHoverPreview';

const IMAGE = 'https://img.test/preview/one.jpg';
const OTHER_IMAGE = 'https://img.test/preview/two.jpg';

const mockPointerMatches = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const pointer = (clientX: number, clientY: number, buttons = 0) => ({ clientX, clientY, buttons });

function renderPreview(options: ImageHoverPreviewOptions = { src: IMAGE }) {
  return renderHook(() => useImageHoverPreview(options));
}

describe('useImageHoverPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockPointerMatches(true),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('opens the preview next to the pointer for a fine, hovering pointer', () => {
    const { result } = renderPreview();

    act(() => result.current.handlers.onPointerEnter(pointer(220, 240)));

    expect(window.matchMedia).toHaveBeenCalledWith(IMAGE_HOVER_MEDIA_QUERY);
    expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(220, 240) });
    expect(result.current.visible).toBe(true);
  });

  it('stays closed without querying the pointer when there is no image', () => {
    const { result } = renderPreview({ src: null });

    act(() => result.current.handlers.onPointerMove(pointer(220, 240)));

    expect(window.matchMedia).not.toHaveBeenCalled();
    expect(result.current.hover).toBeNull();
    expect(result.current.visible).toBe(false);
  });

  it('stays closed on non-hover pointers', () => {
    vi.mocked(window.matchMedia).mockImplementation(mockPointerMatches(false));
    const { result } = renderPreview();

    act(() => result.current.handlers.onPointerMove(pointer(220, 240)));

    expect(result.current.hover).toBeNull();
    expect(result.current.visible).toBe(false);
  });

  it('fades the preview out before clearing it', () => {
    const { result } = renderPreview();
    act(() => result.current.handlers.onPointerMove(pointer(220, 240)));

    act(() => result.current.handlers.onPointerLeave());

    expect(result.current.visible).toBe(false);
    expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(220, 240) });

    act(() => {
      vi.advanceTimersByTime(IMAGE_HOVER_TRANSITION_MS - 1);
    });
    expect(result.current.hover).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.hover).toBeNull();
  });

  it('keeps the preview when the pointer comes back during the fade', () => {
    const { result } = renderPreview();
    act(() => result.current.handlers.onPointerMove(pointer(220, 240)));
    act(() => result.current.close());

    act(() => result.current.handlers.onPointerMove(pointer(300, 320)));
    act(() => {
      vi.advanceTimersByTime(IMAGE_HOVER_TRANSITION_MS);
    });

    expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(300, 320) });
    expect(result.current.visible).toBe(true);
  });

  it('clears a pending fade timer on unmount', () => {
    const { result, unmount } = renderPreview();
    act(() => result.current.handlers.onPointerMove(pointer(220, 240)));
    act(() => result.current.close());
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('does nothing on close while no preview is open', () => {
    const { result } = renderPreview();

    act(() => result.current.close());

    expect(vi.getTimerCount()).toBe(0);
    expect(result.current.hover).toBeNull();
    expect(result.current.visible).toBe(false);
  });

  describe('pointer buttons', () => {
    it('ignores held buttons by default', () => {
      const { result } = renderPreview();

      act(() => result.current.handlers.onPointerMove(pointer(220, 240, 1)));

      expect(result.current.visible).toBe(true);
    });

    it('closes while a button is held when asked to, without querying the pointer', () => {
      const { result } = renderPreview({ src: IMAGE, closeWhilePointerButtonHeld: true });

      act(() => result.current.handlers.onPointerMove(pointer(220, 240, 1)));
      expect(window.matchMedia).not.toHaveBeenCalled();
      expect(result.current.hover).toBeNull();

      act(() => result.current.handlers.onPointerMove(pointer(220, 240)));
      expect(result.current.visible).toBe(true);

      act(() => result.current.handlers.onPointerMove(pointer(230, 250, 1)));
      expect(result.current.visible).toBe(false);
      act(() => {
        vi.advanceTimersByTime(IMAGE_HOVER_TRANSITION_MS);
      });
      expect(result.current.hover).toBeNull();
    });
  });

  describe('openAt', () => {
    it('opens any image, and closes for an empty one', () => {
      const { result } = renderPreview({});

      act(() => result.current.openAt(IMAGE, 220, 240));
      expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(220, 240) });

      act(() => result.current.openAt(OTHER_IMAGE, 300, 320));
      expect(result.current.hover).toEqual({ src: OTHER_IMAGE, ...getImageHoverPosition(300, 320) });

      act(() => result.current.openAt(undefined, 300, 320));
      expect(result.current.visible).toBe(false);
    });
  });

  describe('coalescePositionUpdates', () => {
    let frames: FrameRequestCallback[];

    beforeEach(() => {
      frames = [];
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    });

    const runFrames = () => {
      const pending = frames;
      frames = [];
      act(() => pending.forEach((callback) => callback(0)));
    };

    it('moves the same image once per animation frame, to the latest position', () => {
      const { result } = renderPreview({ coalescePositionUpdates: true });
      act(() => result.current.openAt(IMAGE, 220, 240));
      expect(window.requestAnimationFrame).not.toHaveBeenCalled();

      act(() => result.current.openAt(IMAGE, 230, 250));
      act(() => result.current.openAt(IMAGE, 240, 260));

      expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
      expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(220, 240) });

      runFrames();
      expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(240, 260) });
    });

    it('renders a new image at once', () => {
      const { result } = renderPreview({ coalescePositionUpdates: true });
      act(() => result.current.openAt(IMAGE, 220, 240));

      act(() => result.current.openAt(OTHER_IMAGE, 300, 320));

      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
      expect(result.current.hover).toEqual({ src: OTHER_IMAGE, ...getImageHoverPosition(300, 320) });
    });

    it('updates every move at once without the option', () => {
      const { result } = renderPreview({});
      act(() => result.current.openAt(IMAGE, 220, 240));

      act(() => result.current.openAt(IMAGE, 230, 250));

      expect(window.requestAnimationFrame).not.toHaveBeenCalled();
      expect(result.current.hover).toEqual({ src: IMAGE, ...getImageHoverPosition(230, 250) });
    });

    it('cancels a pending frame on unmount', () => {
      const { result, unmount } = renderPreview({ coalescePositionUpdates: true });
      act(() => result.current.openAt(IMAGE, 220, 240));
      act(() => result.current.openAt(IMAGE, 230, 250));

      unmount();

      expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    });
  });
});
