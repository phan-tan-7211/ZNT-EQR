import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInventoryThumbnailImageHover } from './useInventoryThumbnailImageHover';
import {
  IMAGE_HOVER_TRANSITION_MS,
  getImageHoverPosition,
} from '@/features/equipment/utils/equipmentImageHover';

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

describe('useInventoryThumbnailImageHover', () => {
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
  });

  it('opens the preview next to the pointer for a fine, hovering pointer', () => {
    const { result } = renderHook(() => useInventoryThumbnailImageHover(true));

    act(() => result.current.openImageHover(220, 240));

    expect(window.matchMedia).toHaveBeenCalledWith('(hover: hover) and (pointer: fine)');
    expect(result.current.imageHover).toEqual(getImageHoverPosition(220, 240));
    expect(result.current.imageHoverVisible).toBe(true);
  });

  it('stays closed without querying the pointer when it cannot open', () => {
    const { result } = renderHook(() => useInventoryThumbnailImageHover(false));

    act(() => result.current.openImageHover(220, 240));

    expect(window.matchMedia).not.toHaveBeenCalled();
    expect(result.current.imageHover).toBeNull();
    expect(result.current.imageHoverVisible).toBe(false);
  });

  it('stays closed on non-hover pointers', () => {
    vi.mocked(window.matchMedia).mockImplementation(mockPointerMatches(false));
    const { result } = renderHook(() => useInventoryThumbnailImageHover(true));

    act(() => result.current.openImageHover(220, 240));

    expect(result.current.imageHover).toBeNull();
    expect(result.current.imageHoverVisible).toBe(false);
  });

  it('fades the preview out before clearing its position', () => {
    const { result } = renderHook(() => useInventoryThumbnailImageHover(true));
    act(() => result.current.openImageHover(220, 240));

    act(() => result.current.closeImageHover());

    expect(result.current.imageHoverVisible).toBe(false);
    expect(result.current.imageHover).toEqual(getImageHoverPosition(220, 240));

    act(() => {
      vi.advanceTimersByTime(IMAGE_HOVER_TRANSITION_MS - 1);
    });
    expect(result.current.imageHover).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.imageHover).toBeNull();
  });

  it('keeps the preview when the pointer comes back during the fade', () => {
    const { result } = renderHook(() => useInventoryThumbnailImageHover(true));
    act(() => result.current.openImageHover(220, 240));
    act(() => result.current.closeImageHover());

    act(() => result.current.openImageHover(300, 320));
    act(() => {
      vi.advanceTimersByTime(IMAGE_HOVER_TRANSITION_MS);
    });

    expect(result.current.imageHover).toEqual(getImageHoverPosition(300, 320));
    expect(result.current.imageHoverVisible).toBe(true);
  });

  it('clears a pending fade timer on unmount', () => {
    const { result, unmount } = renderHook(() => useInventoryThumbnailImageHover(true));
    act(() => result.current.openImageHover(220, 240));
    act(() => result.current.closeImageHover());
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
